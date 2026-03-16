/**
 * Unit tests for the Firestore items operations layer.
 *
 * Mocks firebase/firestore entirely to test business logic in isolation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock firebase/firestore
// ---------------------------------------------------------------------------
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockQuery = vi.fn();
const mockOrderBy = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _type: "serverTimestamp" }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

// ---------------------------------------------------------------------------
// Mock @/lib/firebase
// ---------------------------------------------------------------------------
vi.mock("@/lib/firebase", () => ({
  db: { _mockDb: true },
}));

// ---------------------------------------------------------------------------
// Import SUT after mocks
// ---------------------------------------------------------------------------
import {
  addItem,
  updateItem,
  softDeleteItem,
  undoDeleteItem,
  subscribeToItems,
} from "@/lib/firestore-items";

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();

  // Default mock return values
  mockCollection.mockReturnValue("mock-collection-ref");
  mockDoc.mockReturnValue("mock-doc-ref");
  mockQuery.mockReturnValue("mock-query");
  mockOrderBy.mockReturnValue("mock-order-constraint");
});

// =========================================================================
// addItem
// =========================================================================

describe("addItem", () => {
  it("creates doc with all required fields", async () => {
    mockAddDoc.mockResolvedValue({ id: "new-item-123" });

    const result = await addItem({
      groupId: "group-abc",
      name: "Milk",
      qty: 2,
      unit: "gallons",
      notes: "whole milk",
      householdId: "household-1",
    });

    expect(result).toBe("new-item-123");

    // Verify collection was called with correct path
    expect(mockCollection).toHaveBeenCalledWith(
      { _mockDb: true },
      "groups",
      "group-abc",
      "items"
    );

    // Verify addDoc was called with full document shape
    expect(mockAddDoc).toHaveBeenCalledWith("mock-collection-ref", {
      name: "Milk",
      qty: 2,
      unit: "gallons",
      notes: "whole milk",
      householdId: "household-1",
      status: "pending",
      createdAt: { _type: "serverTimestamp" },
      addedDuringTripId: null,
      deleted: false,
      deletedAt: null,
    });
  });
});

// =========================================================================
// updateItem — ownership enforcement
// =========================================================================

describe("updateItem", () => {
  it("throws when householdId doesn't match (ownership error)", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ householdId: "household-2" }),
    });

    await expect(
      updateItem({
        groupId: "group-abc",
        itemId: "item-1",
        householdId: "household-1",
        name: "Updated Name",
      })
    ).rejects.toThrow("You can only edit items added by your household.");

    // Should NOT have called updateDoc
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

// =========================================================================
// softDeleteItem
// =========================================================================

describe("softDeleteItem", () => {
  it("sets deleted: true and deletedAt", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ householdId: "household-1" }),
    });
    mockUpdateDoc.mockResolvedValue(undefined);

    await softDeleteItem({
      groupId: "group-abc",
      itemId: "item-1",
      householdId: "household-1",
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", {
      deleted: true,
      deletedAt: { _type: "serverTimestamp" },
    });
  });
});

// =========================================================================
// undoDeleteItem
// =========================================================================

describe("undoDeleteItem", () => {
  it("sets deleted: false and deletedAt: null", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ householdId: "household-1" }),
    });
    mockUpdateDoc.mockResolvedValue(undefined);

    await undoDeleteItem({
      groupId: "group-abc",
      itemId: "item-1",
      householdId: "household-1",
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", {
      deleted: false,
      deletedAt: null,
    });
  });
});

// =========================================================================
// subscribeToItems — filters out deleted items
// =========================================================================

describe("subscribeToItems", () => {
  it("filters out deleted items", () => {
    const unsubscribe = vi.fn();

    // Capture the onSnapshot callback
    mockOnSnapshot.mockImplementation((_q: unknown, cb: (snap: unknown) => void) => {
      // Simulate a snapshot with 3 docs, 1 deleted
      cb({
        docs: [
          {
            id: "item-1",
            data: () => ({
              name: "Milk",
              qty: 2,
              unit: "gallons",
              notes: "",
              householdId: "household-1",
              status: "pending",
              createdAt: null,
              addedDuringTripId: null,
              deleted: false,
              deletedAt: null,
            }),
          },
          {
            id: "item-2",
            data: () => ({
              name: "Bread",
              qty: 1,
              unit: "loaf",
              notes: "",
              householdId: "household-1",
              status: "pending",
              createdAt: null,
              addedDuringTripId: null,
              deleted: true,
              deletedAt: null,
            }),
          },
          {
            id: "item-3",
            data: () => ({
              name: "Eggs",
              qty: 12,
              unit: "pcs",
              notes: "",
              householdId: "household-2",
              status: "pending",
              createdAt: null,
              addedDuringTripId: null,
              deleted: false,
              deletedAt: null,
            }),
          },
        ],
      });
      return unsubscribe;
    });

    const onChange = vi.fn();
    const unsub = subscribeToItems("group-abc", onChange);

    // onChange should have been called with only the 2 non-deleted items
    expect(onChange).toHaveBeenCalledOnce();
    const receivedItems = onChange.mock.calls[0][0];
    expect(receivedItems).toHaveLength(2);
    expect(receivedItems[0].id).toBe("item-1");
    expect(receivedItems[0].name).toBe("Milk");
    expect(receivedItems[1].id).toBe("item-3");
    expect(receivedItems[1].name).toBe("Eggs");

    // Unsubscribe function should be returned
    expect(typeof unsub).toBe("function");
  });
});
