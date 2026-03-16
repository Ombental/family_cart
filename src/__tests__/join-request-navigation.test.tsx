/**
 * Regression test: approved shoppers must be able to press Back from
 * ShopperModePage without being redirected back.
 *
 * The bug: GroupView's auto-navigate useEffect fired whenever
 * joinRequestStatus === "approved", including on mount — so returning
 * from ShopperMode re-triggered the redirect in an infinite loop.
 *
 * The fix: only navigate on the pending→approved *transition*.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ---------------------------------------------------------------------------
// Track navigations
// ---------------------------------------------------------------------------
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ---------------------------------------------------------------------------
// Mock firebase
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
// Mock hooks
// ---------------------------------------------------------------------------
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", phoneNumber: "555-0100", displayName: "Test User", createdAt: new Date(), updatedAt: new Date() },
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateName: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: unknown }) => children,
}));

vi.mock("@/hooks/useHousehold", () => ({
  useHouseholdContext: () => ({
    householdId: "hh-1",
    householdName: "Test Household",
    householdColor: "#5eb1ef",
    loading: false,
    membership: { groupId: "group-abc", householdId: "hh-1", householdName: "Test Household", groupName: "Test Family", joinedAt: null },
  }),
}));

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

vi.mock("@/hooks/useOnlineStatus", () => ({
  useOnlineStatus: () => ({ isOnline: true }),
}));

vi.mock("@/hooks/useItemCatalog", () => ({
  useItemCatalog: () => ({ suggestions: [] }),
}));

vi.mock("@/hooks/useDepartmentCatalog", () => ({
  useDepartmentCatalog: () => [],
}));

vi.mock("@/lib/firestore-groups", () => ({
  regenerateInviteCode: vi.fn(),
  leaveGroup: vi.fn(),
  renameGroup: vi.fn(),
  deleteGroup: vi.fn(),
}));

vi.mock("@/lib/delete-with-undo", () => ({
  deleteWithUndo: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Controllable mocks for useTrip, useJoinRequests, useJoinRequestStatus
// ---------------------------------------------------------------------------
let mockUseTripReturn = {
  activeTrip: null as unknown,
  loading: false,
  startTrip: vi.fn(),
  completeTrip: vi.fn(),
  isShopperMode: false,
  isCurrentHouseholdShopping: false,
  isActiveShopper: false,
};

vi.mock("@/hooks/useTrip", () => ({
  useTrip: () => mockUseTripReturn,
}));

let mockJoinRequestStatus = "none";

vi.mock("@/hooks/useJoinRequestStatus", () => ({
  useJoinRequestStatus: () => ({
    status: mockJoinRequestStatus,
    request: null,
  }),
}));

vi.mock("@/hooks/useJoinRequests", () => ({
  useJoinRequests: () => ({
    pendingRequests: [],
    pendingCount: 0,
    requestToJoin: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Import SUT after mocks
// ---------------------------------------------------------------------------
import { Timestamp } from "firebase/firestore";
import { GroupView } from "@/components/group/GroupView";
import type { Group } from "@/types/group";

function buildGroup(): Group {
  return {
    id: "group-abc",
    name: "Test Family",
    inviteCode: "XYZ789",
    inviteExpiresAt: Timestamp.fromDate(new Date(Date.now() + 86400000)),
  };
}

const households = [
  { id: "hh-1", name: "Test Household", color: "#5eb1ef", memberUserIds: ["user-1"] },
  { id: "hh-2", name: "Other Household", color: "#f5a623", memberUserIds: ["user-2"] },
];

function renderGroupView() {
  return render(
    <MemoryRouter initialEntries={["/group/group-abc"]}>
      <GroupView group={buildGroup()} households={households} />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockJoinRequestStatus = "none";
  mockUseTripReturn = {
    activeTrip: null,
    loading: false,
    startTrip: vi.fn(),
    completeTrip: vi.fn(),
    isShopperMode: false,
    isCurrentHouseholdShopping: false,
    isActiveShopper: false,
  };
});

describe("join request auto-navigation", () => {
  it("navigates to shopper mode on pending→approved transition", () => {
    // Start with active trip + pending request
    mockUseTripReturn = {
      ...mockUseTripReturn,
      activeTrip: { id: "trip-1" },
      isShopperMode: true,
    };
    mockJoinRequestStatus = "pending";

    const { rerender } = renderGroupView();
    expect(mockNavigate).not.toHaveBeenCalled();

    // Simulate approval: status transitions to "approved"
    mockJoinRequestStatus = "approved";
    rerender(
      <MemoryRouter initialEntries={["/group/group-abc"]}>
        <GroupView group={buildGroup()} households={households} />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith("/group/group-abc/shopper");
  });

  it("does NOT navigate when mounting with status already approved (regression)", () => {
    // Simulate: user presses Back from ShopperMode, lands on GroupView
    // with joinRequestStatus already "approved"
    mockUseTripReturn = {
      ...mockUseTripReturn,
      activeTrip: { id: "trip-1" },
      isShopperMode: true,
      isActiveShopper: true,
    };
    mockJoinRequestStatus = "approved";

    renderGroupView();

    // Should NOT redirect — the user intentionally navigated back
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("does NOT navigate when status is still pending", () => {
    mockUseTripReturn = {
      ...mockUseTripReturn,
      activeTrip: { id: "trip-1" },
      isShopperMode: true,
    };
    mockJoinRequestStatus = "pending";

    renderGroupView();

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
