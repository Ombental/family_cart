/**
 * Integration tests for group flows: HomePage, CreateGroupPage, JoinGroupPage,
 * GroupPage (holding/active states), and leave group.
 *
 * Mocks firebase/firestore to avoid real SDK initialization (which hangs
 * in happy-dom due to enableIndexedDbPersistence).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mock firebase — MUST come before any module that transitively imports it
// ---------------------------------------------------------------------------
vi.mock("firebase/firestore", () => {
  class FakeTimestamp {
    seconds: number;
    nanoseconds: number;
    constructor(s: number, ns: number) { this.seconds = s; this.nanoseconds = ns; }
    toDate() { return new Date(this.seconds * 1000); }
    static fromDate(d: Date) { return new FakeTimestamp(Math.floor(d.getTime() / 1000), 0); }
  }
  return {
    Timestamp: FakeTimestamp,
    collection: vi.fn(),
    doc: vi.fn(),
    onSnapshot: vi.fn(),
    getFirestore: vi.fn(() => ({})),
    enableIndexedDbPersistence: vi.fn(),
  };
});

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock("@/lib/firebase", () => ({
  db: { _mockDb: true },
}));

// ---------------------------------------------------------------------------
// Mock useAuth
// ---------------------------------------------------------------------------
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      phoneNumber: "555-0100",
      displayName: "Test User",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateName: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: unknown }) => children,
}));

// ---------------------------------------------------------------------------
// Mock useHouseholdContext
// ---------------------------------------------------------------------------
vi.mock("@/hooks/useHousehold", () => ({
  useHouseholdContext: () => ({
    householdId: "hh-1",
    householdName: "Test Household",
    householdColor: "#5eb1ef",
    loading: false,
    membership: {
      groupId: "group-abc",
      householdId: "hh-1",
      householdName: "Test Household",
      groupName: "Test Family",
      joinedAt: null,
    },
  }),
}));

// ---------------------------------------------------------------------------
// Mock hooks consumed by GroupView (prevent real Firestore subscriptions)
// ---------------------------------------------------------------------------
vi.mock("@/hooks/useItems", () => ({
  useItems: () => ({
    items: [],
    loading: false,
    addItem: vi.fn(),
    updateItem: vi.fn(),
    softDeleteItem: vi.fn(),
    undoDeleteItem: vi.fn(),
    toggleItemStatus: vi.fn(),
  }),
}));

vi.mock("@/hooks/useTrip", () => ({
  useTrip: () => ({
    activeTrip: null,
    loading: false,
    startTrip: vi.fn(),
    completeTrip: vi.fn(),
    isShopperMode: false,
    isCurrentHouseholdShopping: false,
  }),
}));

vi.mock("@/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => ({ isOnline: true }),
}));

vi.mock("@/hooks/useItemCatalog", () => ({
  useItemCatalog: () => ({ suggestions: [] }),
}));

// ---------------------------------------------------------------------------
// Mock firestore-groups
// ---------------------------------------------------------------------------
const mockCreateGroup = vi.fn();
const mockJoinGroup = vi.fn();
const mockValidateInviteCode = vi.fn();
const mockLeaveGroup = vi.fn();
const mockSubscribeToUserGroups = vi.fn();
const mockSubscribeToGroup = vi.fn();
const mockSubscribeToHouseholds = vi.fn();
const mockRegenerateInviteCode = vi.fn();

vi.mock("@/lib/firestore-groups", () => ({
  createGroup: (...args: unknown[]) => mockCreateGroup(...args),
  joinGroup: (...args: unknown[]) => mockJoinGroup(...args),
  validateInviteCode: (...args: unknown[]) => mockValidateInviteCode(...args),
  leaveGroup: (...args: unknown[]) => mockLeaveGroup(...args),
  subscribeToUserGroups: (...args: unknown[]) => mockSubscribeToUserGroups(...args),
  subscribeToGroup: (...args: unknown[]) => mockSubscribeToGroup(...args),
  subscribeToHouseholds: (...args: unknown[]) => mockSubscribeToHouseholds(...args),
  subscribeToUserMembership: vi.fn(() => vi.fn()),
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

// ---------------------------------------------------------------------------
// Import pages after mocks
// ---------------------------------------------------------------------------
import { HomePage } from "@/pages/HomePage";
import { CreateGroupPage } from "@/pages/CreateGroupPage";
import { JoinGroupPage } from "@/pages/JoinGroupPage";
import { GroupPage } from "@/pages/GroupPage";
import type { Group, Household } from "@/types/group";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderInRouter(ui: React.ReactElement, path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
  );
}

function renderWithRoutes(routes: React.ReactElement, initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      {routes}
    </MemoryRouter>
  );
}

function buildGroup(overrides: Partial<Group> = {}): Group {
  const { Timestamp } = require("firebase/firestore");
  return {
    id: "group-abc",
    name: "Test Family",
    inviteCode: "XYZ789",
    inviteExpiresAt: Timestamp.fromDate(new Date(Date.now() + 86400000)),
    ...overrides,
  };
}

function buildHousehold(id: string, name: string, color: string, members: string[] = []): Household {
  return { id, name, color, memberUserIds: members };
}

// ---------------------------------------------------------------------------
// Set up default subscription mocks — callbacks use setTimeout to avoid
// synchronous setState during render which causes infinite loops.
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();

  mockSubscribeToUserGroups.mockImplementation((_uid: string, cb: (m: unknown[]) => void) => {
    setTimeout(() => cb([]), 0);
    return vi.fn();
  });

  mockSubscribeToGroup.mockImplementation((_id: string, cb: (g: Group) => void) => {
    setTimeout(() => cb(buildGroup()), 0);
    return vi.fn();
  });

  mockSubscribeToHouseholds.mockImplementation((_id: string, cb: (h: Household[]) => void) => {
    setTimeout(() => cb([]), 0);
    return vi.fn();
  });
});

// ===========================================================================
// HOME PAGE
// ===========================================================================

describe("HomePage", () => {
  it("shows Create/Join when user has no groups", async () => {
    renderInRouter(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Create Group")).toBeInTheDocument();
    });
    expect(screen.getByText("Join Group")).toBeInTheDocument();
  });

  it("shows group list when user has groups", async () => {
    mockSubscribeToUserGroups.mockImplementation((_uid: string, cb: (m: unknown[]) => void) => {
      setTimeout(() => cb([
        { groupId: "g1", householdId: "hh-1", householdName: "Smiths", groupName: "Family A", joinedAt: null },
        { groupId: "g2", householdId: "hh-2", householdName: "Johnsons", groupName: "Family B", joinedAt: null },
      ]), 0);
      return vi.fn();
    });

    renderInRouter(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Family A")).toBeInTheDocument();
    });
    expect(screen.getByText("Smiths")).toBeInTheDocument();
    expect(screen.getByText("Family B")).toBeInTheDocument();
    expect(screen.getByText("Johnsons")).toBeInTheDocument();
    expect(screen.getByText("Your Groups")).toBeInTheDocument();
  });

  it("shows compact New/Join buttons when user already has groups", async () => {
    mockSubscribeToUserGroups.mockImplementation((_uid: string, cb: (m: unknown[]) => void) => {
      setTimeout(() => cb([
        { groupId: "g1", householdId: "hh-1", householdName: "Smiths", groupName: "Family A", joinedAt: null },
      ]), 0);
      return vi.fn();
    });

    renderInRouter(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("New Group")).toBeInTheDocument();
    });
    expect(screen.getByText("Join Group")).toBeInTheDocument();
  });
});

// ===========================================================================
// CREATE GROUP — 2-step flow
// ===========================================================================

describe("CreateGroupPage", () => {
  it("renders step 1 with Group Name input and Next button", () => {
    renderInRouter(<CreateGroupPage />, "/create");

    expect(screen.getByLabelText("Group Name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("Next is disabled when group name is empty", () => {
    renderInRouter(<CreateGroupPage />, "/create");

    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("advances to step 2 on Next", async () => {
    const user = userEvent.setup();
    renderInRouter(<CreateGroupPage />, "/create");

    await user.type(screen.getByLabelText("Group Name"), "My Family");
    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByLabelText("Household Name")).toBeInTheDocument();
    });
    expect(screen.getByText(/Name Your Household/)).toBeInTheDocument();
  });

  it("calls createGroup with both names and userId on submit", async () => {
    const user = userEvent.setup();
    mockCreateGroup.mockResolvedValue({ groupId: "group-new", inviteCode: "ABC123" });

    renderInRouter(<CreateGroupPage />, "/create");

    // Step 1
    await user.type(screen.getByLabelText("Group Name"), "My Family");
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Step 2
    await waitFor(() => {
      expect(screen.getByLabelText("Household Name")).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText("Household Name"), "The Smiths");
    await user.click(screen.getByRole("button", { name: /create group/i }));

    await waitFor(() => {
      expect(mockCreateGroup).toHaveBeenCalledWith({
        groupName: "My Family",
        householdName: "The Smiths",
        userId: "user-1",
      });
    });
  });

  it("Create Group button is disabled when household name is empty", async () => {
    const user = userEvent.setup();
    renderInRouter(<CreateGroupPage />, "/create");

    await user.type(screen.getByLabelText("Group Name"), "My Family");
    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create group/i })).toBeDisabled();
    });
  });
});

// ===========================================================================
// JOIN GROUP — 2-step flow (invite code → household picker)
// ===========================================================================

describe("JoinGroupPage", () => {
  it("renders step 1 with invite code input and Validate button", () => {
    renderInRouter(<JoinGroupPage />, "/join");

    expect(screen.getByLabelText(/invite code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /validate/i })).toBeInTheDocument();
  });

  it("Validate is disabled when code is less than 6 chars", async () => {
    const user = userEvent.setup();
    renderInRouter(<JoinGroupPage />, "/join");

    await user.type(screen.getByLabelText(/invite code/i), "ABC");

    expect(screen.getByRole("button", { name: /validate/i })).toBeDisabled();
  });

  it("validates code and shows household picker", async () => {
    const user = userEvent.setup();
    mockValidateInviteCode.mockResolvedValue({
      groupId: "group-abc",
      groupName: "Test Family",
      households: [
        buildHousehold("hh-1", "Smiths", "#5eb1ef", ["u1", "u2"]),
        buildHousehold("hh-2", "Johnsons", "#ffba18", ["u3"]),
      ],
    });

    renderInRouter(<JoinGroupPage />, "/join");

    await user.type(screen.getByLabelText(/invite code/i), "XYZ789");
    await user.click(screen.getByRole("button", { name: /validate/i }));

    await waitFor(() => {
      expect(screen.getByText("Joining Test Family")).toBeInTheDocument();
    });
    expect(screen.getByText("Smiths")).toBeInTheDocument();
    expect(screen.getByText("Johnsons")).toBeInTheDocument();
  });

  it("joins an existing household on click", async () => {
    const user = userEvent.setup();
    mockValidateInviteCode.mockResolvedValue({
      groupId: "group-abc",
      groupName: "Test Family",
      households: [buildHousehold("hh-1", "Smiths", "#5eb1ef", ["u1"])],
    });
    mockJoinGroup.mockResolvedValue({ groupId: "group-abc", householdId: "hh-1" });

    renderInRouter(<JoinGroupPage />, "/join");

    await user.type(screen.getByLabelText(/invite code/i), "XYZ789");
    await user.click(screen.getByRole("button", { name: /validate/i }));

    await waitFor(() => expect(screen.getByText("Smiths")).toBeInTheDocument());
    await user.click(screen.getByText("Smiths"));

    await waitFor(() => {
      expect(mockJoinGroup).toHaveBeenCalledWith({
        inviteCode: "XYZ789",
        userId: "user-1",
        existingHouseholdId: "hh-1",
      });
    });
  });

  it("creates a new household via the form", async () => {
    const user = userEvent.setup();
    mockValidateInviteCode.mockResolvedValue({
      groupId: "group-abc",
      groupName: "Test Family",
      households: [],
    });
    mockJoinGroup.mockResolvedValue({ groupId: "group-abc", householdId: "hh-new" });

    renderInRouter(<JoinGroupPage />, "/join");

    await user.type(screen.getByLabelText(/invite code/i), "XYZ789");
    await user.click(screen.getByRole("button", { name: /validate/i }));

    await waitFor(() => expect(screen.getByText("Joining Test Family")).toBeInTheDocument());

    await user.type(screen.getByLabelText(/create new household/i), "The Johnsons");
    await user.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(mockJoinGroup).toHaveBeenCalledWith({
        inviteCode: "XYZ789",
        userId: "user-1",
        newHouseholdName: "The Johnsons",
      });
    });
  });

  it("shows error for expired invite code", async () => {
    const user = userEvent.setup();
    const { JoinError } = await import("@/lib/firestore-groups");
    mockValidateInviteCode.mockRejectedValue(new JoinError("expired", "expired"));

    renderInRouter(<JoinGroupPage />, "/join");

    await user.type(screen.getByLabelText(/invite code/i), "OLDCOD");
    await user.click(screen.getByRole("button", { name: /validate/i }));

    await waitFor(() => {
      expect(screen.getByText(/expired/i)).toBeInTheDocument();
    });
  });

  it("shows error for invalid invite code", async () => {
    const user = userEvent.setup();
    const { JoinError } = await import("@/lib/firestore-groups");
    mockValidateInviteCode.mockRejectedValue(new JoinError("invalid_code", "invalid"));

    renderInRouter(<JoinGroupPage />, "/join");

    await user.type(screen.getByLabelText(/invite code/i), "BADCOD");
    await user.click(screen.getByRole("button", { name: /validate/i }));

    await waitFor(() => {
      expect(screen.getByText(/doesn't exist/i)).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// GROUP PAGE — holding / active states
// ===========================================================================

describe("GroupPage", () => {
  function setupGroupMocks(households: Household[]) {
    const group = buildGroup();
    let hhCallback: ((h: Household[]) => void) | null = null;

    mockSubscribeToGroup.mockImplementation((_id: string, cb: (g: Group) => void) => {
      setTimeout(() => cb(group), 0);
      return vi.fn();
    });
    mockSubscribeToHouseholds.mockImplementation((_id: string, cb: (h: Household[]) => void) => {
      hhCallback = cb;
      setTimeout(() => cb(households), 0);
      return vi.fn();
    });

    return { group, getHhCallback: () => hhCallback };
  }

  it("shows holding state with 1 household", async () => {
    setupGroupMocks([buildHousehold("hh-1", "Test Household", "#5eb1ef", ["user-1"])]);

    render(
      <MemoryRouter initialEntries={["/group/group-abc"]}>
        <Routes>
          <Route path="/group/:groupId" element={<GroupPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Waiting for another household to join...")).toBeInTheDocument();
    });
    expect(screen.getByText("Grocery list is locked")).toBeInTheDocument();
    expect(screen.getByText("XYZ789")).toBeInTheDocument();
  });

  it("shows active state with 2+ households", async () => {
    setupGroupMocks([
      buildHousehold("hh-1", "Test Household", "#5eb1ef", ["user-1"]),
      buildHousehold("hh-2", "Other Household", "#ffba18", ["user-2"]),
    ]);

    render(
      <MemoryRouter initialEntries={["/group/group-abc"]}>
        <Routes>
          <Route path="/group/:groupId" element={<GroupPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Trip History")).toBeInTheDocument();
    });
    expect(screen.getByText("2 households")).toBeInTheDocument();
    expect(screen.queryByText("Grocery list is locked")).not.toBeInTheDocument();
  });

  it("auto-transitions from holding to active when 2nd household joins", async () => {
    const { getHhCallback } = setupGroupMocks([
      buildHousehold("hh-1", "Test Household", "#5eb1ef", ["user-1"]),
    ]);

    render(
      <MemoryRouter initialEntries={["/group/group-abc"]}>
        <Routes>
          <Route path="/group/:groupId" element={<GroupPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Waiting for another household to join...")).toBeInTheDocument();
    });

    // Simulate 2nd household joining
    await act(async () => {
      getHhCallback()?.([
        buildHousehold("hh-1", "Test Household", "#5eb1ef", ["user-1"]),
        buildHousehold("hh-2", "Other Household", "#ffba18", ["user-2"]),
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("Trip History")).toBeInTheDocument();
    });
    expect(screen.queryByText("Grocery list is locked")).not.toBeInTheDocument();
  });

  it("transitions to holding when group drops to 1 household", async () => {
    const { getHhCallback } = setupGroupMocks([
      buildHousehold("hh-1", "Test Household", "#5eb1ef", ["user-1"]),
      buildHousehold("hh-2", "Other Household", "#ffba18", ["user-2"]),
    ]);

    render(
      <MemoryRouter initialEntries={["/group/group-abc"]}>
        <Routes>
          <Route path="/group/:groupId" element={<GroupPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Trip History")).toBeInTheDocument();
    });

    await act(async () => {
      getHhCallback()?.([
        buildHousehold("hh-2", "Other Household", "#ffba18", ["user-2"]),
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText("Waiting for another household to join...")).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// LEAVE GROUP
// ===========================================================================

describe("Leave group flow", () => {
  function renderActiveGroup() {
    const group = buildGroup();
    mockSubscribeToGroup.mockImplementation((_id: string, cb: (g: Group) => void) => {
      setTimeout(() => cb(group), 0);
      return vi.fn();
    });
    mockSubscribeToHouseholds.mockImplementation((_id: string, cb: (h: Household[]) => void) => {
      setTimeout(() => cb([
        buildHousehold("hh-1", "Test Household", "#5eb1ef", ["user-1"]),
        buildHousehold("hh-2", "Other Household", "#ffba18", ["user-2"]),
      ]), 0);
      return vi.fn();
    });

    return renderWithRoutes(
      <Routes>
        <Route path="/group/:groupId" element={<GroupPage />} />
        <Route path="/" element={<HomePage />} />
      </Routes>,
      "/group/group-abc"
    );
  }

  it("shows Leave Group in settings menu", async () => {
    const user = userEvent.setup();
    renderActiveGroup();

    await waitFor(() => expect(screen.getByText("Trip History")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /group settings/i }));

    await waitFor(() => {
      expect(screen.getByText("Leave Group")).toBeInTheDocument();
    });
  });

  it("shows confirmation dialog on Leave Group click", async () => {
    const user = userEvent.setup();
    renderActiveGroup();

    await waitFor(() => expect(screen.getByText("Trip History")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /group settings/i }));
    await user.click(await screen.findByText("Leave Group"));

    await waitFor(() => {
      expect(screen.getByText("Leave Test Family?")).toBeInTheDocument();
    });
  });

  it("calls leaveGroup with userId on confirm", async () => {
    const user = userEvent.setup();
    mockLeaveGroup.mockResolvedValue(undefined);
    renderActiveGroup();

    await waitFor(() => expect(screen.getByText("Trip History")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /group settings/i }));
    await user.click(await screen.findByText("Leave Group"));

    await waitFor(() => expect(screen.getByText("Leave Test Family?")).toBeInTheDocument());

    const leaveButtons = screen.getAllByRole("button", { name: /leave group/i });
    await user.click(leaveButtons[leaveButtons.length - 1]);

    await waitFor(() => {
      expect(mockLeaveGroup).toHaveBeenCalledWith({
        groupId: "group-abc",
        userId: "user-1",
        householdId: "hh-1",
      });
    });
  });

  it("cancel closes dialog without leaving", async () => {
    const user = userEvent.setup();
    renderActiveGroup();

    await waitFor(() => expect(screen.getByText("Trip History")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /group settings/i }));
    await user.click(await screen.findByText("Leave Group"));

    await waitFor(() => expect(screen.getByText("Leave Test Family?")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText("Leave Test Family?")).not.toBeInTheDocument();
    });
    expect(mockLeaveGroup).not.toHaveBeenCalled();
  });
});