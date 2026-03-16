/**
 * Component tests for Sprint 4 — Trip History + Trip Summary pages.
 *
 * Covers:
 *   US-12  Trip History list and Trip Summary detail
 *   US-09  AddItemForm addedDuringTripId forwarding (verification)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import type { Trip } from "@/types/trip";
import type { UseTripHistoryResult } from "@/hooks/useTripHistory";
import type { UseGroupResult } from "@/hooks/useGroup";

// ---------------------------------------------------------------------------
// Mock firebase (needed by transitive imports)
// ---------------------------------------------------------------------------
vi.mock("@/lib/firebase", () => ({
  db: {},
}));

// ---------------------------------------------------------------------------
// Mock sonner (used by transitive imports)
// ---------------------------------------------------------------------------
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Mock hooks
// ---------------------------------------------------------------------------
const mockUseTripHistory = vi.fn<() => UseTripHistoryResult>();

vi.mock("@/hooks/useTripHistory", () => ({
  useTripHistory: (...args: unknown[]) => mockUseTripHistory(...args),
}));

const mockUseGroup = vi.fn<() => UseGroupResult>();

vi.mock("@/hooks/useGroup", () => ({
  useGroup: (...args: unknown[]) => mockUseGroup(...args),
}));

// ---------------------------------------------------------------------------
// Import components after mocks
// ---------------------------------------------------------------------------
import { TripHistoryPage } from "@/pages/TripHistoryPage";
import { TripSummaryPage } from "@/pages/TripSummaryPage";
import { AddItemForm } from "@/components/list/AddItemForm";

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function buildTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    startedAt: { seconds: 1000, toDate: () => new Date(1000000) } as Trip["startedAt"],
    completedAt: { seconds: 2000, toDate: () => new Date(2000000) } as Trip["completedAt"],
    status: "complete",
    startedByHouseholdId: "household-1",
    startedByHouseholdName: "Smith Family",
    purchasedItems: [],
    ...overrides,
  };
}

const defaultGroupResult: UseGroupResult = {
  group: {
    id: "g1",
    name: "Test Group",
    inviteCode: "ABC123",
    inviteExpiresAt: null,
  },
  households: [
    { id: "household-1", name: "Smith Family", color: "#6366f1" },
    { id: "household-2", name: "Jones Family", color: "#f59e0b" },
  ],
  status: "active",
  loading: false,
};

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

function renderTripHistoryPage(groupId = "test-group") {
  return render(
    <MemoryRouter initialEntries={[`/group/${groupId}/trips`]}>
      <Routes>
        <Route path="/group/:groupId/trips" element={<TripHistoryPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderTripSummaryPage(
  groupId = "test-group",
  tripId = "trip-1"
) {
  return render(
    <MemoryRouter initialEntries={[`/group/${groupId}/trip/${tripId}`]}>
      <Routes>
        <Route path="/group/:groupId/trip/:tripId" element={<TripSummaryPage />} />
      </Routes>
    </MemoryRouter>
  );
}

// =========================================================================
// US-12: TRIP HISTORY PAGE
// =========================================================================

describe("US-12: TripHistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGroup.mockReturnValue(defaultGroupResult);
  });

  it("renders completed trips list with dates and item counts", () => {
    const trips: Trip[] = [
      buildTrip({
        id: "trip-1",
        startedByHouseholdName: "Smith Family",
        purchasedItems: [
          { name: "Milk", qty: 2, unit: "gallons", householdId: "household-1" },
          { name: "Bread", qty: 1, unit: "loaf", householdId: "household-2" },
        ],
      }),
      buildTrip({
        id: "trip-2",
        startedByHouseholdName: "Jones Family",
        purchasedItems: [
          { name: "Eggs", qty: 12, unit: "pcs", householdId: "household-1" },
        ],
      }),
    ];

    mockUseTripHistory.mockReturnValue({ trips, loading: false });

    renderTripHistoryPage();

    // Verify trip header
    expect(screen.getByText("Trip History")).toBeInTheDocument();

    // Verify household names appear
    expect(screen.getByText(/Started by Smith Family/)).toBeInTheDocument();
    expect(screen.getByText(/Started by Jones Family/)).toBeInTheDocument();

    // Verify item counts
    expect(screen.getByText("2 items purchased")).toBeInTheDocument();
    expect(screen.getByText("1 item purchased")).toBeInTheDocument();
  });

  it("shows empty state when no trips exist", () => {
    mockUseTripHistory.mockReturnValue({ trips: [], loading: false });

    renderTripHistoryPage();

    expect(screen.getByText("No completed trips yet.")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockUseTripHistory.mockReturnValue({ trips: [], loading: true });

    renderTripHistoryPage();

    // The Loader2 spinner should be rendered (it renders an svg with animate-spin)
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });
});

// =========================================================================
// US-12: TRIP SUMMARY PAGE
// =========================================================================

describe("US-12: TripSummaryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGroup.mockReturnValue(defaultGroupResult);
  });

  it("renders trip summary with per-household item counts", () => {
    const trip = buildTrip({
      id: "trip-1",
      startedByHouseholdName: "Smith Family",
      purchasedItems: [
        { name: "Milk", qty: 2, unit: "gallons", householdId: "household-1" },
        { name: "Cheese", qty: 1, unit: "block", householdId: "household-1" },
        { name: "Bread", qty: 3, unit: "loaves", householdId: "household-2" },
      ],
    });

    mockUseTripHistory.mockReturnValue({ trips: [trip], loading: false });

    renderTripSummaryPage("test-group", "trip-1");

    // Verify household names appear in per-household breakdown
    expect(screen.getByText("Smith Family")).toBeInTheDocument();
    expect(screen.getByText("Jones Family")).toBeInTheDocument();

    // Verify per-household item counts
    expect(screen.getByText("2 items")).toBeInTheDocument();
    expect(screen.getByText("1 item")).toBeInTheDocument();

    // Verify total purchased count
    expect(screen.getByText("3")).toBeInTheDocument();

    // Verify "Trip Complete!" hero text
    expect(screen.getByText("Trip Complete!")).toBeInTheDocument();
  });

  it("shows trip metadata (completed date and started-by name)", () => {
    const trip = buildTrip({
      id: "trip-1",
      startedByHouseholdName: "Smith Family",
      purchasedItems: [
        { name: "Milk", qty: 1, unit: "gallon", householdId: "household-1" },
      ],
    });

    mockUseTripHistory.mockReturnValue({ trips: [trip], loading: false });

    renderTripSummaryPage("test-group", "trip-1");

    // Verify the started-by name appears in metadata (green header redesign: "date — by Name")
    expect(screen.getByText(/by Smith Family/)).toBeInTheDocument();

    // Verify Trip Summary header
    expect(screen.getByText("Trip Summary", { selector: "h2" })).toBeInTheDocument();
  });

  it("shows trip not found message for non-existent trip", () => {
    // Return trips that don't match the tripId in the URL param
    const trip = buildTrip({
      id: "trip-other",
      startedByHouseholdName: "Smith Family",
    });

    mockUseTripHistory.mockReturnValue({ trips: [trip], loading: false });

    renderTripSummaryPage("test-group", "trip-nonexistent");

    expect(screen.getByText("Trip not found.")).toBeInTheDocument();
  });

  it("shows loading state while data loads", () => {
    mockUseTripHistory.mockReturnValue({ trips: [], loading: true });

    renderTripSummaryPage();

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });
});

// =========================================================================
// US-12a: PER-HOUSEHOLD ITEM BREAKDOWN
// =========================================================================

describe("US-12a: Per-Household Item Breakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGroup.mockReturnValue(defaultGroupResult);
  });

  const tripWithItems = () =>
    buildTrip({
      id: "trip-1",
      startedByHouseholdName: "Smith Family",
      purchasedItems: [
        { name: "Milk", qty: 2, unit: "gallons", householdId: "household-1" },
        { name: "Cheese", qty: 1, unit: "block", householdId: "household-1" },
        { name: "Bread", qty: 3, unit: "loaves", householdId: "household-2" },
      ],
    });

  it("T-1: all sections are collapsed by default", () => {
    mockUseTripHistory.mockReturnValue({ trips: [tripWithItems()], loading: false });
    renderTripSummaryPage("test-group", "trip-1");

    // Item names should NOT be visible (sections collapsed)
    expect(screen.queryByText("Milk")).not.toBeInTheDocument();
    expect(screen.queryByText("Cheese")).not.toBeInTheDocument();
    expect(screen.queryByText("Bread")).not.toBeInTheDocument();

    // All household buttons should have aria-expanded=false
    const buttons = screen.getAllByRole("button", { expanded: false });
    const hhButtons = buttons.filter((b) => b.getAttribute("aria-controls")?.startsWith("hh-items-"));
    expect(hhButtons.length).toBe(2);
  });

  it("T-2: expands on click and shows items", async () => {
    const user = userEvent.setup();
    mockUseTripHistory.mockReturnValue({ trips: [tripWithItems()], loading: false });
    renderTripSummaryPage("test-group", "trip-1");

    // Click Smith Family row
    await user.click(screen.getByText("Smith Family"));

    // Items should now appear
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Cheese")).toBeInTheDocument();

    // Jones items should still be hidden
    expect(screen.queryByText("Bread")).not.toBeInTheDocument();
  });

  it("T-3: collapses on second click", async () => {
    const user = userEvent.setup();
    mockUseTripHistory.mockReturnValue({ trips: [tripWithItems()], loading: false });
    renderTripSummaryPage("test-group", "trip-1");

    const smithBtn = screen.getByText("Smith Family");
    await user.click(smithBtn); // expand
    expect(screen.getByText("Milk")).toBeInTheDocument();

    await user.click(smithBtn); // collapse
    expect(screen.queryByText("Milk")).not.toBeInTheDocument();
  });

  it("T-4: multiple sections can be open simultaneously", async () => {
    const user = userEvent.setup();
    mockUseTripHistory.mockReturnValue({ trips: [tripWithItems()], loading: false });
    renderTripSummaryPage("test-group", "trip-1");

    await user.click(screen.getByText("Smith Family"));
    await user.click(screen.getByText("Jones Family"));

    // All items visible
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Cheese")).toBeInTheDocument();
    expect(screen.getByText("Bread")).toBeInTheDocument();
  });

  it("T-5: item count visible in both collapsed and expanded states", async () => {
    const user = userEvent.setup();
    mockUseTripHistory.mockReturnValue({ trips: [tripWithItems()], loading: false });
    renderTripSummaryPage("test-group", "trip-1");

    // Counts visible when collapsed
    expect(screen.getByText("2 items")).toBeInTheDocument();
    expect(screen.getByText("1 item")).toBeInTheDocument();

    // Expand
    await user.click(screen.getByText("Smith Family"));

    // Counts still visible
    expect(screen.getByText("2 items")).toBeInTheDocument();
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("T-6: displays item name and meta correctly", async () => {
    const user = userEvent.setup();
    mockUseTripHistory.mockReturnValue({ trips: [tripWithItems()], loading: false });
    renderTripSummaryPage("test-group", "trip-1");

    await user.click(screen.getByText("Smith Family"));

    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Qty: 2 · gallons")).toBeInTheDocument();
    expect(screen.getByText("Qty: 1 · block")).toBeInTheDocument();
  });

  it("T-7: shows color bar with household color", async () => {
    const user = userEvent.setup();
    mockUseTripHistory.mockReturnValue({ trips: [tripWithItems()], loading: false });
    renderTripSummaryPage("test-group", "trip-1");

    await user.click(screen.getByText("Smith Family"));

    // Find the Milk item row — it should have left border color matching Smith's color #6366f1
    const milkEl = screen.getByText("Milk").closest("div[style]");
    expect(milkEl).toBeTruthy();
    expect(milkEl!.style.borderInlineStartColor).toBe("#6366f1");
  });

  it("T-8: handles unknown household gracefully", async () => {
    const user = userEvent.setup();
    const tripUnknown = buildTrip({
      id: "trip-1",
      startedByHouseholdName: "Smith Family",
      purchasedItems: [
        { name: "Mystery Item", qty: 1, unit: "pc", householdId: "household-unknown" },
      ],
    });

    mockUseTripHistory.mockReturnValue({ trips: [tripUnknown], loading: false });
    renderTripSummaryPage("test-group", "trip-1");

    expect(screen.getByText("Unknown Household")).toBeInTheDocument();

    await user.click(screen.getByText("Unknown Household"));
    expect(screen.getByText("Mystery Item")).toBeInTheDocument();
  });

  it("T-9: chevron icons toggle between down and up", async () => {
    const user = userEvent.setup();
    mockUseTripHistory.mockReturnValue({ trips: [tripWithItems()], loading: false });
    renderTripSummaryPage("test-group", "trip-1");

    // Find the Smith Family button
    const smithBtn = screen.getByText("Smith Family").closest("button")!;

    // Collapsed: should have a chevron-down SVG (lucide adds class names)
    const downIcon = smithBtn.querySelector("svg");
    expect(downIcon).toBeTruthy();

    // Expand
    await user.click(smithBtn);

    // Expanded: the SVG should still be present (now ChevronUp)
    const upIcon = smithBtn.querySelector("svg");
    expect(upIcon).toBeTruthy();
  });

  it("T-10: aria attributes are correct on toggle", async () => {
    const user = userEvent.setup();
    mockUseTripHistory.mockReturnValue({ trips: [tripWithItems()], loading: false });
    renderTripSummaryPage("test-group", "trip-1");

    const smithBtn = screen.getByText("Smith Family").closest("button")!;

    // Initially collapsed
    expect(smithBtn.getAttribute("aria-expanded")).toBe("false");
    expect(smithBtn.getAttribute("aria-controls")).toBe("hh-items-household-1");

    // Expand
    await user.click(smithBtn);
    expect(smithBtn.getAttribute("aria-expanded")).toBe("true");

    // Region should exist
    const region = document.getElementById("hh-items-household-1");
    expect(region).toBeTruthy();
    expect(region!.getAttribute("role")).toBe("region");
  });
});

// =========================================================================
// US-09: AddItemForm addedDuringTripId forwarding (verification)
// =========================================================================

describe("US-09: AddItemForm passes addedDuringTripId when provided", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes addedDuringTripId in onAdd call when prop is set", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue("item-new");

    render(
      <AddItemForm onAdd={onAdd} addedDuringTripId="trip-active-42" />
    );

    // Open bottom sheet via FAB
    await user.click(screen.getByRole("button", { name: "Add item" }));

    await user.type(screen.getByLabelText("Item name"), "Bananas");
    await user.click(screen.getByRole("button", { name: /Add to List/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Bananas",
          addedDuringTripId: "trip-active-42",
        })
      );
    });
  });

  it("passes addedDuringTripId as null when prop is not set", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue("item-new");

    render(<AddItemForm onAdd={onAdd} />);

    // Open bottom sheet via FAB
    await user.click(screen.getByRole("button", { name: "Add item" }));

    await user.type(screen.getByLabelText("Item name"), "Apples");
    await user.click(screen.getByRole("button", { name: /Add to List/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Apples",
          addedDuringTripId: null,
        })
      );
    });
  });
});
