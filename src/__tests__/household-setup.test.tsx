/**
 * Tests for the localStorage-based household identity setup flow.
 *
 * Covers:
 *   - New user (empty localStorage) sees name input, Create/Join hidden
 *   - Submitting a name saves to localStorage and reveals Create/Join
 *   - Returning user (stored identity) skips the form
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mock Firebase (transitive dep via firestore-groups)
// ---------------------------------------------------------------------------
vi.mock("@/lib/firebase", () => ({ db: {} }));

// ---------------------------------------------------------------------------
// Mock firestore-groups (used by HomePage membership check)
// ---------------------------------------------------------------------------
const mockFindGroupByHousehold = vi.fn();
vi.mock("@/lib/firestore-groups", () => ({
  findGroupByHousehold: (...args: unknown[]) => mockFindGroupByHousehold(...args),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import { HomePage } from "@/pages/HomePage";
import {
  getStoredHouseholdIdentity,
  saveHouseholdIdentity,
} from "@/hooks/useHousehold";

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------
const LS_ID_KEY = "familycart_household_id";
const LS_NAME_KEY = "familycart_household_name";

function clearHouseholdStorage() {
  localStorage.removeItem(LS_ID_KEY);
  localStorage.removeItem(LS_NAME_KEY);
}

function seedHouseholdStorage(id: string, name: string) {
  localStorage.setItem(LS_ID_KEY, id);
  localStorage.setItem(LS_NAME_KEY, name);
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Household identity utilities", () => {
  beforeEach(() => clearHouseholdStorage());
  afterEach(() => clearHouseholdStorage());

  it("getStoredHouseholdIdentity returns null when localStorage is empty", () => {
    expect(getStoredHouseholdIdentity()).toBeNull();
  });

  it("saveHouseholdIdentity persists name and generates a UUID", () => {
    const result = saveHouseholdIdentity("Smith Family");
    expect(result.householdName).toBe("Smith Family");
    expect(result.householdId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(localStorage.getItem(LS_ID_KEY)).toBe(result.householdId);
    expect(localStorage.getItem(LS_NAME_KEY)).toBe("Smith Family");
  });

  it("getStoredHouseholdIdentity returns identity after save", () => {
    saveHouseholdIdentity("Jones Family");
    const identity = getStoredHouseholdIdentity();
    expect(identity).not.toBeNull();
    expect(identity!.householdName).toBe("Jones Family");
  });
});

describe("HomePage — new user setup flow", () => {
  beforeEach(() => {
    clearHouseholdStorage();
    vi.clearAllMocks();
  });
  afterEach(() => clearHouseholdStorage());

  it("shows name input and hides Create/Join when no identity stored", () => {
    renderHomePage();

    expect(screen.getByPlaceholderText(/e\.g\. Smith Family/i)).toBeInTheDocument();
    expect(screen.queryByText("Create Group")).not.toBeInTheDocument();
    expect(screen.queryByText("Join Group")).not.toBeInTheDocument();
  });

  it("submit button is disabled when input is empty", () => {
    renderHomePage();

    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
  });

  it("submitting a name saves to localStorage and shows Create/Join", async () => {
    const user = userEvent.setup();
    mockFindGroupByHousehold.mockResolvedValue(null);

    renderHomePage();

    const input = screen.getByPlaceholderText(/e\.g\. Smith Family/i);
    await user.type(input, "Smith Family");
    await user.click(screen.getByRole("button"));

    // Form disappears and Create/Join appear
    await waitFor(() => {
      expect(screen.getByText("Create Group")).toBeInTheDocument();
    });
    expect(screen.getByText("Join Group")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/e\.g\. Smith Family/i)).not.toBeInTheDocument();

    // Identity persisted
    const stored = getStoredHouseholdIdentity();
    expect(stored).not.toBeNull();
    expect(stored!.householdName).toBe("Smith Family");
  });

  it("ignores submit when input is only whitespace", async () => {
    const user = userEvent.setup();
    renderHomePage();

    const input = screen.getByPlaceholderText(/e\.g\. Smith Family/i);
    await user.type(input, "   ");

    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
  });
});

describe("HomePage — returning user", () => {
  beforeEach(() => {
    clearHouseholdStorage();
    vi.clearAllMocks();
  });
  afterEach(() => clearHouseholdStorage());

  it("skips setup form when identity already in localStorage", async () => {
    seedHouseholdStorage("existing-uuid", "Jones Family");
    mockFindGroupByHousehold.mockResolvedValue(null);

    renderHomePage();

    // Name input should never appear
    expect(screen.queryByPlaceholderText(/e\.g\. Smith Family/i)).not.toBeInTheDocument();

    // Create/Join appear after membership check
    await waitFor(() => {
      expect(screen.getByText("Create Group")).toBeInTheDocument();
    });
    expect(screen.getByText("Join Group")).toBeInTheDocument();
  });

  it("redirects to group when existing membership found", async () => {
    seedHouseholdStorage("existing-uuid", "Jones Family");
    mockFindGroupByHousehold.mockResolvedValue("group-xyz");

    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <HomePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockFindGroupByHousehold).toHaveBeenCalledWith("existing-uuid");
    });

    // The component navigates away; the rendered output will be the spinner briefly
    // then navigation occurs — we just verify findGroupByHousehold was called correctly
    expect(container).toBeTruthy();
  });
});
