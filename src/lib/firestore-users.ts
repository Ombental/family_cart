/**
 * Firestore operations for users.
 *
 * All reads/writes are direct client-side Firestore operations (no REST API).
 *
 * Users are stored at: /users/{userId}
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { User } from "@/types/user";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Convert a Firestore document snapshot data object into a User,
 * converting Timestamp fields to Date instances.
 */
function toUser(id: string, data: Record<string, unknown>): User {
  return {
    id,
    phoneNumber: data.phoneNumber as string,
    displayName: data.displayName as string,
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  };
}

// ---------------------------------------------------------------------------
// CREATE USER
// ---------------------------------------------------------------------------

/**
 * Create a new user in the `users` collection.
 *
 * Generates a userId via crypto.randomUUID() and writes it as the document ID.
 * Throws if a user with the given phoneNumber already exists.
 */
export async function createUser(
  phoneNumber: string,
  displayName: string
): Promise<User> {
  // Check for duplicate phone number
  const existing = await getUserByPhone(phoneNumber);
  if (existing) {
    throw new Error("A user with this phone number already exists.");
  }

  const userId = crypto.randomUUID();
  const userRef = doc(db, "users", userId);

  await setDoc(userRef, {
    phoneNumber,
    displayName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Read back to get server-resolved timestamps
  const snap = await getDoc(userRef);
  return toUser(snap.id, snap.data() as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// GET USER BY PHONE
// ---------------------------------------------------------------------------

/**
 * Query the users collection for a user with the given phone number.
 * Returns the first matching user or null if none found.
 */
export async function getUserByPhone(
  phoneNumber: string
): Promise<User | null> {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("phoneNumber", "==", phoneNumber));
  const snap = await getDocs(q);

  if (snap.empty) return null;

  const userDoc = snap.docs[0];
  return toUser(userDoc.id, userDoc.data() as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// GET USER BY ID
// ---------------------------------------------------------------------------

/**
 * Fetch a user document by its ID.
 * Returns the user or null if the document does not exist.
 */
export async function getUserById(userId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  return toUser(snap.id, snap.data() as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// UPDATE USER NAME
// ---------------------------------------------------------------------------

/**
 * Update a user's display name and updatedAt timestamp.
 * Throws if the user document does not exist.
 */
export async function updateUserName(
  userId: string,
  displayName: string
): Promise<void> {
  const userRef = doc(db, "users", userId);

  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    throw new Error("User not found.");
  }

  await updateDoc(userRef, {
    displayName,
    updatedAt: serverTimestamp(),
  });
}
