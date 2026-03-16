/**
 * Unit tests for the Firestore users operations layer.
 *
 * Regression: verifies that createUser, getUserByPhone, getUserById, and
 * updateUserName target the correct "users" collection path. A missing
 * Firestore security rule for "users" previously caused "Missing or
 * insufficient permissions" on registration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock firebase/firestore
// ---------------------------------------------------------------------------
const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCollection = vi.fn((_db: unknown, path: string) => ({
  _collectionPath: path,
}));
const mockDoc = vi.fn((_db: unknown, ...segments: string[]) => ({
  _path: segments.join("/"),
}));
const mockQuery = vi.fn((...args: unknown[]) => args);
const mockWhere = vi.fn((...args: unknown[]) => ({
  _type: "where",
  args,
}));
const mockServerTimestamp = vi.fn(() => ({ _type: "serverTimestamp" }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  serverTimestamp: () => mockServerTimestamp(),
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d }),
  },
}));

// ---------------------------------------------------------------------------
// Mock @/lib/firebase
// ---------------------------------------------------------------------------
vi.mock("@/lib/firebase", () => ({
  db: { _mockDb: true },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------
import {
  createUser,
  getUserByPhone,
  getUserById,
  updateUserName,
} from "@/lib/firestore-users";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const NOW = new Date("2025-06-01T12:00:00Z");

function mockTimestamp() {
  return { toDate: () => NOW };
}

function mockUserDocSnap(
  id: string,
  data: Record<string, unknown>,
  exists = true,
) {
  return {
    id,
    exists: () => exists,
    data: () => data,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("firestore-users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // REGRESSION: createUser must write to "users" collection
  // -------------------------------------------------------------------------
  describe("createUser", () => {
    it("writes to the 'users' collection (regression: permissions)", async () => {
      // No existing user with this phone
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });
      // setDoc succeeds
      mockSetDoc.mockResolvedValue(undefined);
      // Read-back after creation
      mockGetDoc.mockResolvedValue(
        mockUserDocSnap("generated-id", {
          phoneNumber: "555-0001",
          displayName: "Alice",
          createdAt: mockTimestamp(),
          updatedAt: mockTimestamp(),
        }),
      );

      const user = await createUser("555-0001", "Alice");

      // doc() should be called with db, "users", and a UUID
      expect(mockDoc).toHaveBeenCalledWith(
        { _mockDb: true },
        "users",
        expect.any(String),
      );

      // setDoc should have been called with the user data
      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _path: expect.stringContaining("users/") }),
        expect.objectContaining({
          phoneNumber: "555-0001",
          displayName: "Alice",
        }),
      );

      expect(user.phoneNumber).toBe("555-0001");
      expect(user.displayName).toBe("Alice");
    });

    it("throws on duplicate phone number", async () => {
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          mockUserDocSnap("existing-id", {
            phoneNumber: "555-0001",
            displayName: "Existing",
            createdAt: mockTimestamp(),
            updatedAt: mockTimestamp(),
          }),
        ],
      });

      await expect(createUser("555-0001", "Alice")).rejects.toThrow(
        "A user with this phone number already exists.",
      );

      // Should NOT have called setDoc
      expect(mockSetDoc).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // getUserByPhone
  // -------------------------------------------------------------------------
  describe("getUserByPhone", () => {
    it("queries the 'users' collection by phoneNumber", async () => {
      mockGetDocs.mockResolvedValue({
        empty: false,
        docs: [
          mockUserDocSnap("user-1", {
            phoneNumber: "555-0002",
            displayName: "Bob",
            createdAt: mockTimestamp(),
            updatedAt: mockTimestamp(),
          }),
        ],
      });

      const user = await getUserByPhone("555-0002");

      // collection() should target "users"
      expect(mockCollection).toHaveBeenCalledWith({ _mockDb: true }, "users");
      // where() should filter on phoneNumber
      expect(mockWhere).toHaveBeenCalledWith(
        "phoneNumber",
        "==",
        "555-0002",
      );

      expect(user).not.toBeNull();
      expect(user!.displayName).toBe("Bob");
    });

    it("returns null when phone not found", async () => {
      mockGetDocs.mockResolvedValue({ empty: true, docs: [] });

      const user = await getUserByPhone("555-9999");
      expect(user).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // getUserById
  // -------------------------------------------------------------------------
  describe("getUserById", () => {
    it("fetches from the 'users' collection by ID", async () => {
      mockGetDoc.mockResolvedValue(
        mockUserDocSnap("user-42", {
          phoneNumber: "555-0042",
          displayName: "Charlie",
          createdAt: mockTimestamp(),
          updatedAt: mockTimestamp(),
        }),
      );

      const user = await getUserById("user-42");

      expect(mockDoc).toHaveBeenCalledWith(
        { _mockDb: true },
        "users",
        "user-42",
      );
      expect(user).not.toBeNull();
      expect(user!.id).toBe("user-42");
    });

    it("returns null when user does not exist", async () => {
      mockGetDoc.mockResolvedValue(mockUserDocSnap("x", {}, false));

      const user = await getUserById("nonexistent");
      expect(user).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // updateUserName
  // -------------------------------------------------------------------------
  describe("updateUserName", () => {
    it("updates displayName in the 'users' collection", async () => {
      mockGetDoc.mockResolvedValue(
        mockUserDocSnap("user-99", {
          phoneNumber: "555-0099",
          displayName: "Old Name",
          createdAt: mockTimestamp(),
          updatedAt: mockTimestamp(),
        }),
      );
      mockUpdateDoc.mockResolvedValue(undefined);

      await updateUserName("user-99", "New Name");

      expect(mockDoc).toHaveBeenCalledWith(
        { _mockDb: true },
        "users",
        "user-99",
      );
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.objectContaining({ _path: "users/user-99" }),
        expect.objectContaining({ displayName: "New Name" }),
      );
    });

    it("throws when user not found", async () => {
      mockGetDoc.mockResolvedValue(mockUserDocSnap("x", {}, false));

      await expect(updateUserName("ghost", "Name")).rejects.toThrow(
        "User not found.",
      );
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });
  });
});
