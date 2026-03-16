/**
 * Tests for the authentication system: session manager, login, register,
 * and profile pages.
 *
 * Replaces the old household-setup.test.tsx which tested the deprecated
 * localStorage-based household identity flow.
 *
 * Covers:
 *   - Session manager (saveSession, getSession, clearSession, isSessionValid, updateSessionName)
 *   - LoginPage (phone input, error states, navigation, register link)
 *   - RegisterPage (phone + name inputs, error states, navigation, login link)
 *   - ProfilePage (display phone, display name, edit name, logout)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mock firebase (transitive dep via firestore-users)
// ---------------------------------------------------------------------------
vi.mock("@/lib/firebase", () => ({ db: {} }));

// ---------------------------------------------------------------------------
// Mock firestore-users (used by AuthProvider & component tests)
// ---------------------------------------------------------------------------
const mockCreateUser = vi.fn();
const mockGetUserByPhone = vi.fn();
const mockGetUserById = vi.fn();
const mockUpdateUserName = vi.fn();

vi.mock("@/lib/firestore-users", () => ({
  createUser: (...args: unknown[]) => mockCreateUser(...args),
  getUserByPhone: (...args: unknown[]) => mockGetUserByPhone(...args),
  getUserById: (...args: unknown[]) => mockGetUserById(...args),
  updateUserName: (...args: unknown[]) => mockUpdateUserName(...args),
}));

// ---------------------------------------------------------------------------
// Mock sonner (used by ProfilePage)
// ---------------------------------------------------------------------------
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  }),
}));

// ---------------------------------------------------------------------------
// Mock react-router-dom's useNavigate (for navigation assertions)
// ---------------------------------------------------------------------------
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import {
  saveSession,
  getSession,
  clearSession,
  isSessionValid,
  updateSessionName,
} from "@/lib/session";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { AuthProvider } from "@/hooks/useAuth";

// ---------------------------------------------------------------------------
// localStorage constants
// ---------------------------------------------------------------------------
const SESSION_KEY = "familycart_session";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clearStorage() {
  localStorage.removeItem(SESSION_KEY);
}

function buildMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-abc",
    phoneNumber: "555-1234",
    displayName: "Test User",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

/**
 * Render a component inside AuthProvider + MemoryRouter.
 * getUserById is mocked to return null (no existing session) by default
 * so the provider finishes loading quickly.
 */
function renderWithAuth(ui: React.ReactElement) {
  mockGetUserById.mockResolvedValue(null);
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}

/**
 * Render a component inside AuthProvider + MemoryRouter,
 * pre-seeded with a valid session so the user is authenticated.
 */
function renderWithAuthenticatedUser(
  ui: React.ReactElement,
  user = buildMockUser(),
) {
  // Seed a valid session in localStorage
  const session = {
    userId: user.id,
    phoneNumber: user.phoneNumber as string,
    displayName: user.displayName as string,
    loginAt: Date.now(),
    version: import.meta.env.VITE_SESSION_VERSION ?? "1",
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  // AuthProvider will call getUserById on mount to rehydrate
  mockGetUserById.mockResolvedValue(user);

  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}

// =========================================================================
// SESSION MANAGER TESTS
// =========================================================================

describe("Session manager", () => {
  beforeEach(() => clearStorage());
  afterEach(() => clearStorage());

  it("saveSession stores to localStorage correctly", () => {
    saveSession("user-1", "555-0001", "Alice");

    const raw = localStorage.getItem(SESSION_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(parsed.userId).toBe("user-1");
    expect(parsed.phoneNumber).toBe("555-0001");
    expect(parsed.displayName).toBe("Alice");
    expect(parsed.loginAt).toBeTypeOf("number");
  });

  it("getSession returns session when valid", () => {
    saveSession("user-2", "555-0002", "Bob");

    const session = getSession();
    expect(session).not.toBeNull();
    expect(session!.userId).toBe("user-2");
    expect(session!.phoneNumber).toBe("555-0002");
    expect(session!.displayName).toBe("Bob");
  });

  it("getSession returns null when expired (mock Date.now)", () => {
    // Save a session with a loginAt far in the past
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const session = {
      userId: "user-3",
      phoneNumber: "555-0003",
      displayName: "Charlie",
      loginAt: eightDaysAgo,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // getSession should detect expiry and return null
    expect(getSession()).toBeNull();

    // Should also have removed the item from localStorage
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("clearSession removes from localStorage", () => {
    saveSession("user-4", "555-0004", "Diana");
    expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();

    clearSession();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("isSessionValid returns correct boolean", () => {
    // No session => false
    expect(isSessionValid()).toBe(false);

    // Valid session => true
    saveSession("user-5", "555-0005", "Eve");
    expect(isSessionValid()).toBe(true);

    // Expired session => false
    clearSession();
    const expired = {
      userId: "user-5",
      phoneNumber: "555-0005",
      displayName: "Eve",
      loginAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(expired));
    expect(isSessionValid()).toBe(false);
  });

  it("updateSessionName updates name without changing loginAt", () => {
    saveSession("user-6", "555-0006", "Frank");
    const before = getSession();
    expect(before).not.toBeNull();
    const originalLoginAt = before!.loginAt;

    updateSessionName("Franklin");

    const after = getSession();
    expect(after).not.toBeNull();
    expect(after!.displayName).toBe("Franklin");
    expect(after!.loginAt).toBe(originalLoginAt);
    expect(after!.userId).toBe("user-6");
    expect(after!.phoneNumber).toBe("555-0006");
  });
});

// =========================================================================
// LOGIN FLOW TESTS
// =========================================================================

describe("LoginPage", () => {
  beforeEach(() => {
    clearStorage();
    vi.clearAllMocks();
  });
  afterEach(() => clearStorage());

  it("renders phone input and login button", () => {
    renderWithAuth(<LoginPage />);

    expect(screen.getByPlaceholderText("Phone number")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /log in/i }),
    ).toBeInTheDocument();
  });

  it("shows error when phone not found", async () => {
    const user = userEvent.setup();
    mockGetUserByPhone.mockResolvedValue(null);

    renderWithAuth(<LoginPage />);

    const phoneInput = screen.getByPlaceholderText("Phone number");
    await user.type(phoneInput, "555-9999");

    const loginButton = screen.getByRole("button", { name: /log in/i });
    await user.click(loginButton);

    await waitFor(() => {
      expect(
        screen.getByText(/No account found for this phone number/),
      ).toBeInTheDocument();
    });
  });

  it("navigates to / on successful login", async () => {
    const user = userEvent.setup();
    const mockUser = buildMockUser({ phoneNumber: "555-1111" });
    mockGetUserByPhone.mockResolvedValue(mockUser);

    renderWithAuth(<LoginPage />);

    const phoneInput = screen.getByPlaceholderText("Phone number");
    await user.type(phoneInput, "555-1111");

    const loginButton = screen.getByRole("button", { name: /log in/i });
    await user.click(loginButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("shows link to register page", () => {
    renderWithAuth(<LoginPage />);

    const registerLinks = screen.getAllByRole("link", { name: /register/i });
    expect(registerLinks.length).toBeGreaterThan(0);
    expect(registerLinks[0]).toHaveAttribute("href", "/register");
  });
});

// =========================================================================
// REGISTER FLOW TESTS
// =========================================================================

describe("RegisterPage", () => {
  beforeEach(() => {
    clearStorage();
    vi.clearAllMocks();
  });
  afterEach(() => clearStorage());

  it("renders phone and name inputs", () => {
    renderWithAuth(<RegisterPage />);

    expect(screen.getByLabelText("Phone number")).toBeInTheDocument();
    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeInTheDocument();
  });

  it("shows error on duplicate phone number", async () => {
    const user = userEvent.setup();
    mockCreateUser.mockRejectedValue(
      new Error("A user with this phone number already exists."),
    );

    renderWithAuth(<RegisterPage />);

    const phoneInput = screen.getByLabelText("Phone number");
    const nameInput = screen.getByLabelText("Display name");
    await user.type(phoneInput, "555-1234");
    await user.type(nameInput, "Duplicate User");

    const submitButton = screen.getByRole("button", {
      name: /create account/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("A user with this phone number already exists."),
      ).toBeInTheDocument();
    });
  });

  it("navigates to / on successful registration", async () => {
    const user = userEvent.setup();
    const newUser = buildMockUser({
      id: "new-user-id",
      phoneNumber: "555-5555",
      displayName: "New User",
    });
    mockCreateUser.mockResolvedValue(newUser);

    renderWithAuth(<RegisterPage />);

    const phoneInput = screen.getByLabelText("Phone number");
    const nameInput = screen.getByLabelText("Display name");
    await user.type(phoneInput, "555-5555");
    await user.type(nameInput, "New User");

    const submitButton = screen.getByRole("button", {
      name: /create account/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("shows link to login page", () => {
    renderWithAuth(<RegisterPage />);

    const loginLink = screen.getByRole("link", { name: /log in/i });
    expect(loginLink).toHaveAttribute("href", "/login");
  });
});

// =========================================================================
// PROFILE PAGE TESTS
// =========================================================================

describe("ProfilePage", () => {
  beforeEach(() => {
    clearStorage();
    vi.clearAllMocks();
  });
  afterEach(() => clearStorage());

  it("shows user's phone number (read-only)", async () => {
    const mockUser = buildMockUser({ phoneNumber: "555-7777" });
    renderWithAuthenticatedUser(<ProfilePage />, mockUser);

    await waitFor(() => {
      expect(screen.getByText("555-7777")).toBeInTheDocument();
    });
  });

  it("shows user's display name", async () => {
    const mockUser = buildMockUser({ displayName: "Jane Doe" });
    renderWithAuthenticatedUser(<ProfilePage />, mockUser);

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });
  });

  it("allows editing display name", async () => {
    const user = userEvent.setup();
    const mockUser = buildMockUser({ displayName: "Old Name" });
    mockUpdateUserName.mockResolvedValue(undefined);

    renderWithAuthenticatedUser(<ProfilePage />, mockUser);

    // Wait for the profile to render
    await waitFor(() => {
      expect(screen.getByText("Old Name")).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByRole("button", { name: /edit name/i });
    await user.click(editButton);

    // Input should appear pre-filled
    const nameInput = screen.getByRole("textbox");
    expect(nameInput).toHaveValue("Old Name");

    // Clear and type new name
    await user.clear(nameInput);
    await user.type(nameInput, "New Name");

    // Save
    const saveButton = screen.getByRole("button", { name: /save name/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateUserName).toHaveBeenCalledWith("user-abc", "New Name");
    });
  });

  it("logout button clears session and navigates to /login", async () => {
    const user = userEvent.setup();
    const mockUser = buildMockUser();

    renderWithAuthenticatedUser(<ProfilePage />, mockUser);

    // Wait for the profile to render
    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
    });

    // Click logout
    const logoutButton = screen.getByRole("button", { name: /log out/i });
    await user.click(logoutButton);

    // Session should be cleared from localStorage
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();

    // Should navigate to /login
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
