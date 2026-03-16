/**
 * Integration tests for the group creation & join flows.
 *
 * These tests mock the Firestore layer (firestore-groups module)
 * and test the React component flows end-to-end.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import type { Group, Household } from "@/types/group";

// ---------------------------------------------------------------------------
// Mock the household hook
// ---------------------------------------------------------------------------
vi.mock("@/hooks/useHousehold", () => ({
  useHousehold: () => ({
    householdId: "household-1",
    householdName: "Test Household",
  }),
  getStoredHouseholdIdentity: () => ({
    householdId: "household-1",
    householdName: "Test Household",
  }),
  saveHouseholdIdentity: (name: string) => ({
    householdId: "household-1",
    householdName: name,
  }),
}));

// ---------------------------------------------------------------------------
// Mock firestore-groups
// ---------------------------------------------------------------------------
const mockCreateGroup = vi.fn();
const mockJoinGroup = vi.fn();
const mockLeaveGroup = vi.fn();
const mockFindGroupByHousehold = vi.fn();
const mockCacheGroupMembership = vi.fn();
const mockClearGroupMembership = vi.fn();
const mockSubscribeToGroup = vi.fn();
const mockSubscribeToHouseholds = vi.fn();
const mockRegenerateInviteCode = vi.fn();

vi.mock("@/lib/firestore-groups", () => ({
  createGroup: (...args: unknown[]) => mockCreateGroup(...args),
  joinGroup: (...args: unknown[]) => mockJoinGroup(...args),
  leaveGroup: (...args: unknown[]) => mockLeaveGroup(...args),
  findGroupByHousehold: (...args: unknown[]) => mockFindGroupByHousehold(...args),
  cacheGroupMembership: (...args: unknown[]) => mockCacheGroupMembership(...args),
  clearGroupMembership: (...args: unknown[]) => mockClearGroupMembership(...args),
  subscribeToGroup: (...args: unknown[]) => mockSubscribeToGroup(...args),
  subscribeToHouseholds: (...args: unknown[]) => mockSubscribeToHouseholds(...args),
  regenerateInviteCode: (...args: unknown[]) => mockRegenerateInviteCode(...args),
  JoinError: class JoinError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = "JoinError";
      this.code = code;
    }
  },
}));

// We need to dynamically import JoinError from the mock for throw usage
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getJoinError = async () => {
  const mod = await import("@/lib/firestore-groups");
  return mod.JoinError;
};

// ---------------------------------------------------------------------------
// Import pages after mocks are set up
// ---------------------------------------------------------------------------
import { CreateGroupPage } from "@/pages/CreateGroupPage";
import { JoinGroupPage } from "@/pages/JoinGroupPage";
import { GroupPage } from "@/pages/GroupPage";
import { HomePage } from "@/pages/HomePage";

// ---------------------------------------------------------------------------
// Helper to build a mock Group
// ---------------------------------------------------------------------------
function buildMockGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: "group-abc",
    name: "Test Family",
    inviteCode: "XYZ789",
    inviteExpiresAt: Timestamp.fromDate(new Date(Date.now() + 86400000)),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderWithRouter(ui: React.ReactElement, initialEntries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {ui}
    </MemoryRouter>
  );
}

/**
 * Render a component inside a route with path params so useParams works.
 */
function renderWithRoute(
  element: React.ReactElement,
  path: string,
  initialEntry: string
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path={path} element={element} />
      </Routes>
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// TESTS
// ---------------------------------------------------------------------------

describe("Home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows create and join options when user has no group", async () => {
    mockFindGroupByHousehold.mockResolvedValue(null);

    renderWithRouter(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Create Group")).toBeInTheDocument();
    });
    expect(screen.getByText("Join Group")).toBeInTheDocument();
  });
});

describe("Group creation flow (US-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the create group form with name input and submit button", () => {
    renderWithRouter(<CreateGroupPage />, ["/create"]);

    expect(screen.getByLabelText("Group Name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create group/i })).toBeInTheDocument();
  });

  it("calls createGroup on form submission and caches membership", async () => {
    const user = userEvent.setup();
    mockCreateGroup.mockResolvedValue({ groupId: "group-abc", inviteCode: "XYZ789" });

    renderWithRouter(<CreateGroupPage />, ["/create"]);

    const nameInput = screen.getByLabelText("Group Name");
    await user.type(nameInput, "My Family");

    const submitButton = screen.getByRole("button", { name: /create group/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateGroup).toHaveBeenCalledWith({
        groupName: "My Family",
        householdId: "household-1",
        householdName: "Test Household",
      });
    });

    expect(mockCacheGroupMembership).toHaveBeenCalledWith("household-1", "group-abc");
  });

  it("disables submit when group name is empty", () => {
    renderWithRouter(<CreateGroupPage />, ["/create"]);

    const submitButton = screen.getByRole("button", { name: /create group/i });
    expect(submitButton).toBeDisabled();
  });
});

describe("Group holding state (US-01-T04/T07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows holding state when group has only 1 household", async () => {
    const mockGroup = buildMockGroup();
    const singleHousehold: Household[] = [
      { id: "household-1", name: "Test Household", color: "#6366f1" },
    ];

    // Mock subscribeToGroup to call onChange immediately
    mockSubscribeToGroup.mockImplementation(
      (_id: string, cb: (g: Group) => void) => {
        cb(mockGroup);
        return vi.fn();
      }
    );
    mockSubscribeToHouseholds.mockImplementation(
      (_id: string, cb: (h: Household[]) => void) => {
        cb(singleHousehold);
        return vi.fn();
      }
    );

    renderWithRoute(<GroupPage />, "/group/:groupId", "/group/group-abc");

    await waitFor(() => {
      expect(
        screen.getByText("Waiting for another household to join...")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Grocery list is locked")).toBeInTheDocument();
    expect(screen.getByText("XYZ789")).toBeInTheDocument();
  });

  it("auto-transitions to active when 2nd household joins", async () => {
    const mockGroup = buildMockGroup();
    let householdsCallback: ((h: Household[]) => void) | null = null;

    mockSubscribeToGroup.mockImplementation(
      (_id: string, cb: (g: Group) => void) => {
        cb(mockGroup);
        return vi.fn();
      }
    );
    mockSubscribeToHouseholds.mockImplementation(
      (_id: string, cb: (h: Household[]) => void) => {
        householdsCallback = cb;
        // Start with 1 household
        cb([{ id: "household-1", name: "Test Household", color: "#6366f1" }]);
        return vi.fn();
      }
    );

    renderWithRoute(<GroupPage />, "/group/:groupId", "/group/group-abc");

    // Verify holding state
    await waitFor(() => {
      expect(
        screen.getByText("Waiting for another household to join...")
      ).toBeInTheDocument();
    });

    // Simulate 2nd household joining via onSnapshot
    await act(async () => {
      if (householdsCallback) {
        householdsCallback([
          { id: "household-1", name: "Test Household", color: "#6366f1" },
          { id: "household-2", name: "Other Household", color: "#f59e0b" },
        ]);
      }
    });

    // Should transition to active view
    await waitFor(() => {
      expect(screen.getByText("Trip History")).toBeInTheDocument();
    });
    expect(screen.queryByText("Grocery list is locked")).not.toBeInTheDocument();
  });
});

describe("Join flow (US-00c)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the join form with invite code input and join button", () => {
    renderWithRouter(<JoinGroupPage />, ["/join"]);

    expect(screen.getByLabelText("Invite Code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /join group/i })).toBeInTheDocument();
  });

  it("calls joinGroup with a valid invite code and caches membership", async () => {
    const user = userEvent.setup();
    mockJoinGroup.mockResolvedValue({ groupId: "group-abc" });

    renderWithRouter(<JoinGroupPage />, ["/join"]);

    const codeInput = screen.getByLabelText("Invite Code");
    await user.type(codeInput, "XYZ789");

    const joinButton = screen.getByRole("button", { name: /join group/i });
    await user.click(joinButton);

    await waitFor(() => {
      expect(mockJoinGroup).toHaveBeenCalledWith({
        inviteCode: "XYZ789",
        householdId: "household-1",
        householdName: "Test Household",
      });
    });

    expect(mockCacheGroupMembership).toHaveBeenCalledWith("household-1", "group-abc");
  });

  it("shows error for expired invite code", async () => {
    const user = userEvent.setup();
    const JoinErrorClass = (await getJoinError());
    mockJoinGroup.mockRejectedValue(
      new JoinErrorClass("expired", "This invite code has expired. Ask for a new one.")
    );

    renderWithRouter(<JoinGroupPage />, ["/join"]);

    const codeInput = screen.getByLabelText("Invite Code");
    await user.type(codeInput, "OLDCODE");

    const joinButton = screen.getByRole("button", { name: /join group/i });
    await user.click(joinButton);

    await waitFor(() => {
      expect(
        screen.getByText("This invite code has expired. Ask for a new one.")
      ).toBeInTheDocument();
    });
  });

  it("shows error for invalid invite code", async () => {
    const user = userEvent.setup();
    const JoinErrorClass = (await getJoinError());
    mockJoinGroup.mockRejectedValue(
      new JoinErrorClass("invalid_code", "Invalid invite code.")
    );

    renderWithRouter(<JoinGroupPage />, ["/join"]);

    const codeInput = screen.getByLabelText("Invite Code");
    await user.type(codeInput, "BADCOD");

    const joinButton = screen.getByRole("button", { name: /join group/i });
    await user.click(joinButton);

    await waitFor(() => {
      expect(screen.getByText("Invalid invite code.")).toBeInTheDocument();
    });
  });

  it("disables join when invite code is empty", () => {
    renderWithRouter(<JoinGroupPage />, ["/join"]);

    const joinButton = screen.getByRole("button", { name: /join group/i });
    expect(joinButton).toBeDisabled();
  });
});

describe("Group members view (US-01-T08)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all households with names and colors", async () => {
    const mockGroup = buildMockGroup();
    const households: Household[] = [
      { id: "household-1", name: "Test Household", color: "#6366f1" },
      { id: "household-2", name: "Other Household", color: "#f59e0b" },
    ];

    mockSubscribeToGroup.mockImplementation(
      (_id: string, cb: (g: Group) => void) => {
        cb(mockGroup);
        return vi.fn();
      }
    );
    mockSubscribeToHouseholds.mockImplementation(
      (_id: string, cb: (h: Household[]) => void) => {
        cb(households);
        return vi.fn();
      }
    );

    // Import the members page dynamically since we need Route params
    const { GroupMembersPage } = await import("@/pages/GroupMembersPage");

    render(
      <MemoryRouter initialEntries={["/group/group-abc/members"]}>
        <Routes>
          <Route path="/group/:groupId/members" element={<GroupMembersPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Household")).toBeInTheDocument();
    });
    expect(screen.getByText("Other Household")).toBeInTheDocument();
    expect(screen.getByText("Households (2)")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// LEAVE GROUP FLOW (US-00d)
// ---------------------------------------------------------------------------

describe("Leave group flow (US-00d)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper: render GroupPage in active state (2+ households) and return
   * the captured householdsCallback so tests can simulate onSnapshot updates.
   */
  function renderActiveGroupPage() {
    const mockGroup = buildMockGroup();
    let householdsCallback: ((h: Household[]) => void) | null = null;

    mockSubscribeToGroup.mockImplementation(
      (_id: string, cb: (g: Group) => void) => {
        cb(mockGroup);
        return vi.fn();
      }
    );
    mockSubscribeToHouseholds.mockImplementation(
      (_id: string, cb: (h: Household[]) => void) => {
        householdsCallback = cb;
        cb([
          { id: "household-1", name: "Test Household", color: "#6366f1" },
          { id: "household-2", name: "Other Household", color: "#f59e0b" },
        ]);
        return vi.fn();
      }
    );

    // Need to render with both group route and home route for navigation
    mockFindGroupByHousehold.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/group/group-abc"]}>
        <Routes>
          <Route path="/group/:groupId" element={<GroupPage />} />
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    );

    return { mockGroup, householdsCallback };
  }

  it("shows Leave Group option in settings menu", async () => {
    const user = userEvent.setup();
    renderActiveGroupPage();

    // Wait for active view to render
    await waitFor(() => {
      expect(screen.getByText("Trip History")).toBeInTheDocument();
    });

    // Click the settings button
    const settingsButton = screen.getByRole("button", { name: /group settings/i });
    await user.click(settingsButton);

    // Leave Group option should appear
    await waitFor(() => {
      expect(screen.getByText("Leave Group")).toBeInTheDocument();
    });
  });

  it("shows confirmation dialog with group name and warning", async () => {
    const user = userEvent.setup();
    renderActiveGroupPage();

    await waitFor(() => {
      expect(screen.getByText("Trip History")).toBeInTheDocument();
    });

    // Open settings menu
    const settingsButton = screen.getByRole("button", { name: /group settings/i });
    await user.click(settingsButton);

    // Click Leave Group
    const leaveOption = await screen.findByText("Leave Group");
    await user.click(leaveOption);

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText("Leave Test Family?")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Your household's pending items will be removed from the shared list. This cannot be undone."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("calls leaveGroup on confirm and redirects to home", async () => {
    const user = userEvent.setup();
    mockLeaveGroup.mockResolvedValue(undefined);

    renderActiveGroupPage();

    await waitFor(() => {
      expect(screen.getByText("Trip History")).toBeInTheDocument();
    });

    // Open settings menu
    const settingsButton = screen.getByRole("button", { name: /group settings/i });
    await user.click(settingsButton);

    // Click Leave Group in dropdown
    const leaveOption = await screen.findByText("Leave Group");
    await user.click(leaveOption);

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByText("Leave Test Family?")).toBeInTheDocument();
    });

    // Find and click the destructive "Leave Group" button in the dialog
    const leaveButtons = screen.getAllByRole("button", { name: /leave group/i });
    // The dialog action button is the one we want (it has the destructive variant)
    const confirmButton = leaveButtons[leaveButtons.length - 1];
    await user.click(confirmButton);

    // leaveGroup should have been called with correct params
    await waitFor(() => {
      expect(mockLeaveGroup).toHaveBeenCalledWith({
        groupId: "group-abc",
        householdId: "household-1",
      });
    });

    // Should redirect to home page
    await waitFor(() => {
      expect(screen.getByText("Welcome to FamilyCart")).toBeInTheDocument();
    });
  });

  it("group continues for remaining households when creator leaves with 2+ remaining", async () => {
    const mockGroup = buildMockGroup();
    let householdsCallback: ((h: Household[]) => void) | null = null;

    mockSubscribeToGroup.mockImplementation(
      (_id: string, cb: (g: Group) => void) => {
        cb(mockGroup);
        return vi.fn();
      }
    );
    mockSubscribeToHouseholds.mockImplementation(
      (_id: string, cb: (h: Household[]) => void) => {
        householdsCallback = cb;
        // 3 households: the creator (household-1) + 2 others
        cb([
          { id: "household-1", name: "Test Household", color: "#6366f1" },
          { id: "household-2", name: "Other Household", color: "#f59e0b" },
          { id: "household-3", name: "Third Household", color: "#10b981" },
        ]);
        return vi.fn();
      }
    );

    mockFindGroupByHousehold.mockResolvedValue(null);

    render(
      <MemoryRouter initialEntries={["/group/group-abc"]}>
        <Routes>
          <Route path="/group/:groupId" element={<GroupPage />} />
          <Route path="/" element={<HomePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for active state
    await waitFor(() => {
      expect(screen.getByText("3 households")).toBeInTheDocument();
    });

    // Simulate household-1 leaving: onSnapshot fires with 2 remaining
    await act(async () => {
      if (householdsCallback) {
        householdsCallback([
          { id: "household-2", name: "Other Household", color: "#f59e0b" },
          { id: "household-3", name: "Third Household", color: "#10b981" },
        ]);
      }
    });

    // Group should remain active (not holding) with 2 households
    await waitFor(() => {
      expect(screen.getByText("2 households")).toBeInTheDocument();
    });
    expect(screen.getByText("Trip History")).toBeInTheDocument();
    expect(screen.queryByText("Grocery list is locked")).not.toBeInTheDocument();
  });

  it("transitions to holding state when group drops to 1 household after leave", async () => {
    const mockGroup = buildMockGroup();
    let householdsCallback: ((h: Household[]) => void) | null = null;

    mockSubscribeToGroup.mockImplementation(
      (_id: string, cb: (g: Group) => void) => {
        cb(mockGroup);
        return vi.fn();
      }
    );
    mockSubscribeToHouseholds.mockImplementation(
      (_id: string, cb: (h: Household[]) => void) => {
        householdsCallback = cb;
        // Start with 2 households
        cb([
          { id: "household-1", name: "Test Household", color: "#6366f1" },
          { id: "household-2", name: "Other Household", color: "#f59e0b" },
        ]);
        return vi.fn();
      }
    );

    renderWithRoute(<GroupPage />, "/group/:groupId", "/group/group-abc");

    // Verify active state
    await waitFor(() => {
      expect(screen.getByText("Trip History")).toBeInTheDocument();
    });

    // Simulate household-1 leaving: onSnapshot fires with only 1 remaining
    await act(async () => {
      if (householdsCallback) {
        householdsCallback([
          { id: "household-2", name: "Other Household", color: "#f59e0b" },
        ]);
      }
    });

    // Should transition to holding state
    await waitFor(() => {
      expect(
        screen.getByText("Waiting for another household to join...")
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Grocery list is locked")).toBeInTheDocument();
  });

  it("cancel button closes the dialog without leaving", async () => {
    const user = userEvent.setup();
    renderActiveGroupPage();

    await waitFor(() => {
      expect(screen.getByText("Trip History")).toBeInTheDocument();
    });

    // Open settings and click Leave Group
    const settingsButton = screen.getByRole("button", { name: /group settings/i });
    await user.click(settingsButton);

    const leaveOption = await screen.findByText("Leave Group");
    await user.click(leaveOption);

    // Confirm dialog appears
    await waitFor(() => {
      expect(screen.getByText("Leave Test Family?")).toBeInTheDocument();
    });

    // Click Cancel
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    // Dialog should close, leaveGroup should NOT have been called
    await waitFor(() => {
      expect(screen.queryByText("Leave Test Family?")).not.toBeInTheDocument();
    });
    expect(mockLeaveGroup).not.toHaveBeenCalled();

    // Still on the group page
    expect(screen.getByText("Trip History")).toBeInTheDocument();
  });
});
