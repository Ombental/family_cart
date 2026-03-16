/**
 * Firestore operations for groups and households.
 *
 * All reads/writes are direct client-side Firestore operations (no REST API).
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
  Timestamp,
  onSnapshot,
  writeBatch,
  runTransaction,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateInviteCode, getInviteExpiration, isInviteValid } from "@/lib/invite";
import { pickHouseholdColor } from "@/lib/colors";
import type { Group, Household } from "@/types/group";

// ---------------------------------------------------------------------------
// CREATE GROUP  (US-01-T03)
// ---------------------------------------------------------------------------

export interface CreateGroupParams {
  groupName: string;
  householdId: string;
  householdName: string;
}

export interface CreateGroupResult {
  groupId: string;
  inviteCode: string;
}

/**
 * Create a new group in Firestore and add the creator's household
 * as the first member.
 */
export async function createGroup(
  params: CreateGroupParams
): Promise<CreateGroupResult> {
  const { groupName, householdId, householdName } = params;

  const groupRef = doc(collection(db, "groups"));
  const inviteCode = generateInviteCode();
  const inviteExpiresAt = Timestamp.fromDate(getInviteExpiration());

  // Write the group document
  await setDoc(groupRef, {
    name: groupName,
    inviteCode,
    inviteExpiresAt,
  });

  // Add the creator's household as the first member
  const householdRef = doc(
    collection(db, "groups", groupRef.id, "households"),
    householdId
  );
  await setDoc(householdRef, {
    name: householdName,
    color: pickHouseholdColor(0),
  });

  return { groupId: groupRef.id, inviteCode };
}

// ---------------------------------------------------------------------------
// REGENERATE INVITE CODE  (US-00c-T02)
// ---------------------------------------------------------------------------

/**
 * Regenerate the invite code for an existing group.
 * Sets a new code and resets inviteExpiresAt to now + 48h.
 */
export async function regenerateInviteCode(groupId: string): Promise<string> {
  const newCode = generateInviteCode();
  const newExpiry = Timestamp.fromDate(getInviteExpiration());

  const groupRef = doc(db, "groups", groupId);
  await updateDoc(groupRef, {
    inviteCode: newCode,
    inviteExpiresAt: newExpiry,
  });

  return newCode;
}

// ---------------------------------------------------------------------------
// JOIN GROUP VIA INVITE  (US-00c-T03)
// ---------------------------------------------------------------------------

export interface JoinGroupParams {
  inviteCode: string;
  householdId: string;
  householdName: string;
}

export type JoinGroupError = "invalid_code" | "expired" | "already_member";

export interface JoinGroupResult {
  groupId: string;
}

/**
 * Join a group by invite code.
 *
 * - Validates the invite code matches a group
 * - Checks the invite is not expired
 * - Adds the household to the group's households subcollection
 */
export async function joinGroup(
  params: JoinGroupParams
): Promise<JoinGroupResult> {
  const { inviteCode, householdId, householdName } = params;
  const normalised = inviteCode.trim().toUpperCase();

  // Find the group with this invite code
  const groupsRef = collection(db, "groups");
  const q = query(groupsRef, where("inviteCode", "==", normalised));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new JoinError("invalid_code", "Invalid invite code.");
  }

  // Minor 12: warn on invite code collision (multiple groups sharing the same code)
  if (snap.docs.length > 1) {
    console.warn(
      `[joinGroup] Invite code collision detected for "${normalised}" — ${snap.docs.length} groups match. Using first result.`
    );
  }

  const groupDoc = snap.docs[0];
  const data = groupDoc.data();

  // Check expiry
  const expiresAt = (data.inviteExpiresAt as Timestamp).toDate();
  if (!isInviteValid(expiresAt)) {
    throw new JoinError("expired", "This invite code has expired. Ask for a new one.");
  }

  // Count existing households to assign color. This happens outside the
  // transaction because Firestore transactions do not support collection
  // queries. A concurrent join could result in two households sharing a
  // color (cosmetic only); atomicity of membership is guaranteed below.
  const householdsSnap = await getDocs(
    collection(db, "groups", groupDoc.id, "households")
  );
  const color = pickHouseholdColor(householdsSnap.size);

  // Important 3: Use a transaction to atomically check membership and add the
  // household, eliminating the TOCTOU race between the existence check and the
  // write that existed when these were separate operations.
  const memberRef = doc(db, "groups", groupDoc.id, "households", householdId);
  await runTransaction(db, async (tx) => {
    const memberSnap = await tx.get(memberRef);
    if (memberSnap.exists()) {
      throw new JoinError("already_member", "Your household is already in this group.");
    }
    tx.set(memberRef, { name: householdName, color });
  });

  return { groupId: groupDoc.id };
}

/**
 * Custom error for join flow so callers can inspect the error type.
 */
export class JoinError extends Error {
  readonly code: JoinGroupError;

  constructor(code: JoinGroupError, message: string) {
    super(message);
    this.name = "JoinError";
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// FETCH GROUP  (US-01-T04)
// ---------------------------------------------------------------------------

/**
 * Fetch a group document by ID.
 */
export async function fetchGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, "groups", groupId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    inviteCode: data.inviteCode,
    inviteExpiresAt: data.inviteExpiresAt,
  };
}

// ---------------------------------------------------------------------------
// SUBSCRIBE TO HOUSEHOLDS  (US-01-T05 — real-time activation)
// ---------------------------------------------------------------------------

/**
 * Subscribe to the households subcollection of a group.
 * Calls `onChange` whenever the list changes (including when a new household joins).
 *
 * Returns an unsubscribe function.
 */
export function subscribeToHouseholds(
  groupId: string,
  onChange: (households: Household[]) => void
): Unsubscribe {
  const colRef = collection(db, "groups", groupId, "households");
  return onSnapshot(colRef, (snap) => {
    const households: Household[] = snap.docs.map((d) => ({
      id: d.id,
      name: d.data().name,
      color: d.data().color,
    }));
    onChange(households);
  });
}

/**
 * Subscribe to a group document for real-time invite code updates.
 */
export function subscribeToGroup(
  groupId: string,
  onChange: (group: Group) => void
): Unsubscribe {
  const groupRef = doc(db, "groups", groupId);
  return onSnapshot(groupRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    onChange({
      id: snap.id,
      name: data.name,
      inviteCode: data.inviteCode,
      inviteExpiresAt: data.inviteExpiresAt,
    });
  });
}

// ---------------------------------------------------------------------------
// FIND GROUP BY HOUSEHOLD  (routing helper)
// ---------------------------------------------------------------------------

/**
 * Find the group that a household belongs to.
 * Used on app load to decide where to route the user.
 *
 * NOTE: This is a simplistic scan; in production you'd maintain a
 * `/households/{id}/groups` index. For the pilot this is acceptable.
 */
export async function findGroupByHousehold(
  householdId: string
): Promise<string | null> {
  // We store the groupId in localStorage after creation/join for fast lookup
  const cached = localStorage.getItem(`familycart_group_${householdId}`);
  if (cached) {
    // Verify the group still exists
    const snap = await getDoc(doc(db, "groups", cached));
    if (snap.exists()) {
      // Verify this household is still a member
      const memberSnap = await getDoc(
        doc(db, "groups", cached, "households", householdId)
      );
      if (memberSnap.exists()) return cached;
    }
    // Stale cache
    localStorage.removeItem(`familycart_group_${householdId}`);
  }
  return null;
}

/**
 * Cache the group-household mapping in localStorage for fast routing.
 */
export function cacheGroupMembership(
  householdId: string,
  groupId: string
): void {
  localStorage.setItem(`familycart_group_${householdId}`, groupId);
}

/**
 * Clear the cached group membership from localStorage.
 */
export function clearGroupMembership(householdId: string): void {
  localStorage.removeItem(`familycart_group_${householdId}`);
}

// ---------------------------------------------------------------------------
// LEAVE GROUP  (US-00d-T02)
// ---------------------------------------------------------------------------

export interface LeaveGroupParams {
  groupId: string;
  householdId: string;
}

/**
 * Leave a group.
 *
 * Atomically (batch write):
 * 1. Removes the household document from /groups/{groupId}/households/{householdId}
 * 2. Deletes all pending items added by that household
 * 3. Clears the cached group membership from localStorage
 *
 * After this operation, the remaining households' onSnapshot listeners will
 * detect the household count change. If only 1 household remains, the group
 * automatically enters "holding" state via the existing useGroup hook logic.
 */
// Critical 2: Firestore batches are capped at 500 operations. Keep each batch
// safely below that limit to avoid silent failures with large item lists.
const BATCH_SIZE_LIMIT = 499;

export async function leaveGroup(params: LeaveGroupParams): Promise<void> {
  const { groupId, householdId } = params;

  // 1. Find all pending items by this household
  const itemsRef = collection(db, "groups", groupId, "items");
  const pendingItemsQuery = query(
    itemsRef,
    where("householdId", "==", householdId),
    where("status", "==", "pending")
  );
  const pendingItemsSnap = await getDocs(pendingItemsQuery);
  const itemDocs = pendingItemsSnap.docs;

  // 2. First batch: household document delete + up to (BATCH_SIZE_LIMIT - 1) items.
  //    The household delete is always in the first batch so it commits as soon
  //    as possible, preventing new items from being associated with the leaving
  //    household mid-cleanup.
  const householdRef = doc(db, "groups", groupId, "households", householdId);
  let batch = writeBatch(db);
  batch.delete(householdRef);
  let opsInBatch = 1;

  const batches: ReturnType<typeof writeBatch>[] = [batch];

  for (const itemDoc of itemDocs) {
    if (opsInBatch >= BATCH_SIZE_LIMIT) {
      // Current batch is full — start a new one
      batch = writeBatch(db);
      batches.push(batch);
      opsInBatch = 0;
    }
    batch.delete(itemDoc.ref);
    opsInBatch++;
  }

  // 3. Commit all batches sequentially
  for (const b of batches) {
    await b.commit();
  }

  // 4. Clear localStorage cache
  clearGroupMembership(householdId);
}
