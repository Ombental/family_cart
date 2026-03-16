/**
 * Unit tests for the Firestore trips operations layer + toggleItemStatus.
 *
 * Mocks firebase/firestore entirely to test business logic in isolation.
 * Follows the same mocking pattern established in firestore-items.test.ts.
 *
 * Covers:
 *   US-07  Shopper Mode — createTrip, completeTrip, subscribeToActiveTrip
 *   US-08  Check-off — toggleItemStatus
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock firebase/firestore
// ---------------------------------------------------------------------------
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _type: "serverTimestamp" }));
const mockBatch = {
  update: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
};
const mockWriteBatch = vi.fn(() => mockBatch);

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  limit: (...args: unknown[]) => mockLimit(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  serverTimestamp: () => mockServerTimestamp(),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
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
  createTrip,
  completeTrip,
  subscribeToActiveTrip,
  subscribeToCompletedTrips,
} from "@/lib/firestore-trips";
import { toggleItemStatus } from "@/lib/firestore-items";

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();

  // Default mock return values
  mockCollection.mockReturnValue("mock-collection-ref");
  mockDoc.mockReturnValue("mock-doc-ref");
  mockQuery.mockReturnValue("mock-query");
  mockWhere.mockReturnValue("mock-where-constraint");
  mockLimit.mockReturnValue("mock-limit-constraint");
  mockOrderBy.mockReturnValue("mock-order-constraint");
});

// =========================================================================
// createTrip (US-07)
// =========================================================================

describe("createTrip", () => {
  it("creates a trip document when no active trip exists", async () => {
    // Mock getDocs returning empty snapshot (no active trip)
    mockGetDocs.mockResolvedValue({
      empty: true,
      docs: [],
    });

    mockAddDoc.mockResolvedValue({ id: "new-trip-123" });

    const result = await createTrip({
      groupId: "group-abc",
      startedByHouseholdId: "household-1",
      startedByHouseholdName: "Smith Family",
    });

    // Verify collection was called with correct path
    expect(mockCollection).toHaveBeenCalledWith(
      { _mockDb: true },
      "groups",
      "group-abc",
      "trips"
    );

    // Verify addDoc was called with the full document shape
    expect(mockAddDoc).toHaveBeenCalledWith("mock-collection-ref", {
      startedAt: { _type: "serverTimestamp" },
      completedAt: null,
      status: "active",
      startedByHouseholdId: "household-1",
      startedByHouseholdName: "Smith Family",
      purchasedItems: [],
    });

    // Verify result shape
    expect(result).toEqual({ conflict: false, tripId: "new-trip-123" });
  });

  it("includes startedByUserName when provided", async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
    mockAddDoc.mockResolvedValue({ id: "new-trip-456" });

    const result = await createTrip({
      groupId: "group-abc",
      startedByHouseholdId: "household-1",
      startedByHouseholdName: "Smith Family",
      startedByUserName: "Alice",
    });

    expect(mockAddDoc).toHaveBeenCalledWith("mock-collection-ref", {
      startedAt: { _type: "serverTimestamp" },
      completedAt: null,
      status: "active",
      startedByHouseholdId: "household-1",
      startedByHouseholdName: "Smith Family",
      startedByUserName: "Alice",
      purchasedItems: [],
    });

    expect(result).toEqual({ conflict: false, tripId: "new-trip-456" });
  });

  it("returns conflict when active trip exists", async () => {
    // Mock getDocs returning a trip doc (active trip already exists)
    mockGetDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "existing-trip-456",
          data: () => ({
            startedAt: { seconds: 1000 },
            completedAt: null,
            status: "active",
            startedByHouseholdId: "household-2",
            startedByHouseholdName: "Jones Family",
          }),
        },
      ],
    });

    const result = await createTrip({
      groupId: "group-abc",
      startedByHouseholdId: "household-1",
      startedByHouseholdName: "Smith Family",
    });

    // addDoc should NOT have been called
    expect(mockAddDoc).not.toHaveBeenCalled();

    // Verify conflict result with the active trip
    expect(result).toEqual({
      conflict: true,
      activeTrip: {
        id: "existing-trip-456",
        startedAt: { seconds: 1000 },
        completedAt: null,
        status: "active",
        startedByHouseholdId: "household-2",
        startedByHouseholdName: "Jones Family",
        purchasedItems: [],
      },
    });
  });
});

// =========================================================================
// completeTrip (US-07 + US-11 archival)
// =========================================================================

describe("completeTrip", () => {
  beforeEach(() => {
    // Reset batch mocks before each test in this block
    mockBatch.update.mockClear();
    mockBatch.delete.mockClear();
    mockBatch.commit.mockClear().mockResolvedValue(undefined);
    mockWriteBatch.mockClear().mockReturnValue(mockBatch);
  });

  it("archives bought items in trip doc via batch", async () => {
    // Mock getDocs to return 2 bought items
    const boughtDoc1 = {
      id: "item-bought-1",
      ref: "ref-bought-1",
      data: () => ({
        name: "Milk",
        qty: 2,
        unit: "gallons",
        department: "Dairy",
        householdId: "household-1",
        status: "bought",
        deleted: false,
      }),
    };
    const boughtDoc2 = {
      id: "item-bought-2",
      ref: "ref-bought-2",
      data: () => ({
        name: "Bread",
        qty: 1,
        unit: "loaf",
        department: "Bakery",
        householdId: "household-2",
        status: "bought",
        deleted: false,
      }),
    };

    mockGetDocs.mockResolvedValue({
      docs: [boughtDoc1, boughtDoc2],
    });

    await completeTrip({
      groupId: "group-abc",
      tripId: "trip-123",
      storeName: "Test Store",
      totalAmount: 100,
      completedByUserId: "user-1",
    });

    // Verify writeBatch was called
    expect(mockWriteBatch).toHaveBeenCalledWith({ _mockDb: true });

    // Verify the trip doc was updated with purchasedItems, status, and metadata
    expect(mockBatch.update).toHaveBeenCalledWith("mock-doc-ref", {
      status: "complete",
      completedAt: { _type: "serverTimestamp" },
      purchasedItems: [
        { name: "Milk", qty: 2, unit: "gallons", department: "Dairy", householdId: "household-1" },
        { name: "Bread", qty: 1, unit: "loaf", department: "Bakery", householdId: "household-2" },
      ],
      storeName: "Test Store",
      totalAmount: 100,
      completedByUserId: "user-1",
    });

    // Verify bought items were batch-deleted
    expect(mockBatch.delete).toHaveBeenCalledTimes(2);
    expect(mockBatch.delete).toHaveBeenCalledWith("ref-bought-1");
    expect(mockBatch.delete).toHaveBeenCalledWith("ref-bought-2");

    // Verify batch was committed
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });

  it("leaves pending items untouched (only bought items are deleted)", async () => {
    // Mock getDocs returns only bought items (pending items are NOT returned by the query)
    const boughtDoc = {
      id: "item-bought-1",
      ref: "ref-bought-1",
      data: () => ({
        name: "Milk",
        qty: 2,
        unit: "gallons",
        department: "Dairy",
        householdId: "household-1",
        status: "bought",
        deleted: false,
      }),
    };

    mockGetDocs.mockResolvedValue({
      docs: [boughtDoc],
    });

    await completeTrip({
      groupId: "group-abc",
      tripId: "trip-123",
      storeName: "Test Store",
      totalAmount: 50,
      completedByUserId: "user-1",
    });

    // Only the single bought item should be batch-deleted
    expect(mockBatch.delete).toHaveBeenCalledTimes(1);
    expect(mockBatch.delete).toHaveBeenCalledWith("ref-bought-1");

    // purchasedItems should only contain the bought item
    expect(mockBatch.update).toHaveBeenCalledWith(
      "mock-doc-ref",
      expect.objectContaining({
        purchasedItems: [
          { name: "Milk", qty: 2, unit: "gallons", department: "Dairy", householdId: "household-1" },
        ],
      })
    );
  });

  it("handles empty bought items gracefully", async () => {
    // Mock getDocs returns no bought items
    mockGetDocs.mockResolvedValue({
      docs: [],
    });

    await completeTrip({
      groupId: "group-abc",
      tripId: "trip-123",
      storeName: "Test Store",
      totalAmount: 0,
      completedByUserId: "user-1",
    });

    // purchasedItems should be empty array, metadata should be present
    expect(mockBatch.update).toHaveBeenCalledWith(
      "mock-doc-ref",
      expect.objectContaining({
        purchasedItems: [],
        storeName: "Test Store",
        totalAmount: 0,
        completedByUserId: "user-1",
      })
    );

    // No items to delete
    expect(mockBatch.delete).not.toHaveBeenCalled();

    // Batch should still be committed
    expect(mockBatch.commit).toHaveBeenCalledOnce();
  });
});

// =========================================================================
// subscribeToActiveTrip (real-time listener)
// =========================================================================

describe("subscribeToActiveTrip", () => {
  it("calls onChange with trip when active trip exists", () => {
    const unsubscribe = vi.fn();

    // Capture the onSnapshot callback
    mockOnSnapshot.mockImplementation(
      (_q: unknown, cb: (snap: unknown) => void) => {
        // Simulate a snapshot with one active trip
        cb({
          empty: false,
          docs: [
            {
              id: "trip-active-1",
              data: () => ({
                startedAt: { seconds: 2000 },
                completedAt: null,
                status: "active",
                startedByHouseholdId: "household-1",
                startedByHouseholdName: "Smith Family",
              }),
            },
          ],
        });
        return unsubscribe;
      }
    );

    const onChange = vi.fn();
    const unsub = subscribeToActiveTrip("group-abc", onChange);

    // onChange should have been called with the trip
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith({
      id: "trip-active-1",
      startedAt: { seconds: 2000 },
      completedAt: null,
      status: "active",
      startedByHouseholdId: "household-1",
      startedByHouseholdName: "Smith Family",
      purchasedItems: [],
    });

    // Unsubscribe function should be returned
    expect(typeof unsub).toBe("function");
  });

  it("calls onChange with null when no active trip", () => {
    const unsubscribe = vi.fn();

    // Capture the onSnapshot callback
    mockOnSnapshot.mockImplementation(
      (_q: unknown, cb: (snap: unknown) => void) => {
        // Simulate an empty snapshot (no active trip)
        cb({
          empty: true,
          docs: [],
        });
        return unsubscribe;
      }
    );

    const onChange = vi.fn();
    const unsub = subscribeToActiveTrip("group-abc", onChange);

    // onChange should have been called with null
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(null);

    // Unsubscribe function should be returned
    expect(typeof unsub).toBe("function");
  });
});

// =========================================================================
// toggleItemStatus (US-08)
// =========================================================================

describe("toggleItemStatus", () => {
  it("flips pending to bought", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ status: "pending" }),
    });
    mockUpdateDoc.mockResolvedValue(undefined);

    await toggleItemStatus({
      groupId: "group-abc",
      itemId: "item-1",
    });

    // Verify doc was called with correct path
    expect(mockDoc).toHaveBeenCalledWith(
      { _mockDb: true },
      "groups",
      "group-abc",
      "items",
      "item-1"
    );

    // Verify updateDoc was called to flip to "bought"
    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", {
      status: "bought",
    });
  });

  it("flips bought to pending", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ status: "bought" }),
    });
    mockUpdateDoc.mockResolvedValue(undefined);

    await toggleItemStatus({
      groupId: "group-abc",
      itemId: "item-1",
    });

    // Verify updateDoc was called to flip to "pending"
    expect(mockUpdateDoc).toHaveBeenCalledWith("mock-doc-ref", {
      status: "pending",
    });
  });

  it("throws if item not found", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    });

    await expect(
      toggleItemStatus({
        groupId: "group-abc",
        itemId: "item-nonexistent",
      })
    ).rejects.toThrow("Item not found.");

    // updateDoc should NOT have been called
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

// =========================================================================
// subscribeToCompletedTrips (US-12 — trip history)
// =========================================================================

describe("subscribeToCompletedTrips", () => {
  it("calls onChange with completed trips including purchasedItems", () => {
    const unsubscribe = vi.fn();

    mockOnSnapshot.mockImplementation(
      (_q: unknown, cb: (snap: unknown) => void) => {
        cb({
          docs: [
            {
              id: "trip-complete-1",
              data: () => ({
                startedAt: { seconds: 3000 },
                completedAt: { seconds: 3600 },
                status: "complete",
                startedByHouseholdId: "household-1",
                startedByHouseholdName: "Smith Family",
                purchasedItems: [
                  { name: "Milk", qty: 2, unit: "gallons", department: "Dairy", householdId: "household-1" },
                  { name: "Bread", qty: 1, unit: "loaf", department: "Bakery", householdId: "household-2" },
                ],
              }),
            },
            {
              id: "trip-complete-2",
              data: () => ({
                startedAt: { seconds: 1000 },
                completedAt: { seconds: 2000 },
                status: "complete",
                startedByHouseholdId: "household-2",
                startedByHouseholdName: "Jones Family",
                purchasedItems: [
                  { name: "Eggs", qty: 12, unit: "pcs", department: "", householdId: "household-1" },
                ],
              }),
            },
          ],
        });
        return unsubscribe;
      }
    );

    const onChange = vi.fn();
    const unsub = subscribeToCompletedTrips("group-abc", onChange);

    expect(onChange).toHaveBeenCalledOnce();
    const receivedTrips = onChange.mock.calls[0][0];
    expect(receivedTrips).toHaveLength(2);

    // First trip
    expect(receivedTrips[0]).toEqual({
      id: "trip-complete-1",
      startedAt: { seconds: 3000 },
      completedAt: { seconds: 3600 },
      status: "complete",
      startedByHouseholdId: "household-1",
      startedByHouseholdName: "Smith Family",
      purchasedItems: [
        { name: "Milk", qty: 2, unit: "gallons", department: "Dairy", householdId: "household-1" },
        { name: "Bread", qty: 1, unit: "loaf", department: "Bakery", householdId: "household-2" },
      ],
    });

    // Second trip
    expect(receivedTrips[1]).toEqual({
      id: "trip-complete-2",
      startedAt: { seconds: 1000 },
      completedAt: { seconds: 2000 },
      status: "complete",
      startedByHouseholdId: "household-2",
      startedByHouseholdName: "Jones Family",
      purchasedItems: [
        { name: "Eggs", qty: 12, unit: "pcs", department: "", householdId: "household-1" },
      ],
    });

    // Unsubscribe function should be returned
    expect(typeof unsub).toBe("function");
  });

  it("calls onChange with empty array when no completed trips", () => {
    const unsubscribe = vi.fn();

    mockOnSnapshot.mockImplementation(
      (_q: unknown, cb: (snap: unknown) => void) => {
        cb({
          docs: [],
        });
        return unsubscribe;
      }
    );

    const onChange = vi.fn();
    const unsub = subscribeToCompletedTrips("group-abc", onChange);

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith([]);

    expect(typeof unsub).toBe("function");
  });
});
