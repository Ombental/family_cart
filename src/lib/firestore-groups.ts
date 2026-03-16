/**
 * Firestore operations for groups, households, and group memberships.
 *
 * New hierarchy:
 *   /groups/{groupId}
 *   /groups/{groupId}/households/{householdId}  — with memberUserIds[]
 *   /users/{userId}/groupMemberships/{groupId}  — denormalized membership
 *
 * All reads/writes are direct client-side Firestore operations (no REST API).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
  onSnapshot,
  writeBatch,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  runTransaction,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateInviteCode, getInviteExpiration, isInviteValid } from "@/lib/invite";
import { pickHouseholdColor } from "@/lib/colors";
import type { Group, Household, GroupMembership } from "@/types/group";

const MAX_HOUSEHOLDS_PER_GROUP = 10;

// ---------------------------------------------------------------------------
// CREATE GROUP  (US-HHR-03)
// ---------------------------------------------------------------------------

export interface CreateGroupParams {
  groupName: string;
  householdName: string;
  userId: string;
}

export interface CreateGroupResult {
  groupId: string;
  inviteCode: string;
}

/**
 * Create a new group with the creator's household in a single batch.
 *
 * Writes: group doc, household doc (with creator as member), membership doc.
 */
export async function createGroup(
  params: CreateGroupParams
): Promise<CreateGroupResult> {
  const { groupName, householdName, userId } = params;

  const groupRef = doc(collection(db, "groups"));
  const inviteCode = generateInviteCode();
  const inviteExpiresAt = Timestamp.fromDate(getInviteExpiration());

  const householdRef = doc(collection(db, "groups", groupRef.id, "households"));
  const color = pickHouseholdColor(0);

  const membershipRef = doc(db, "users", userId, "groupMemberships", groupRef.id);

  const batch = writeBatch(db);

  batch.set(groupRef, {
    name: groupName,
    inviteCode,
    inviteExpiresAt,
    createdByUserId: userId,
  });

  batch.set(householdRef, {
    name: householdName,
    color,
    memberUserIds: [userId],
  });

  batch.set(membershipRef, {
    householdId: householdRef.id,
    householdName,
    groupName,
    joinedAt: serverTimestamp(),
  });

  await batch.commit();

  return { groupId: groupRef.id, inviteCode };
}

// ---------------------------------------------------------------------------
// RENAME GROUP
// ---------------------------------------------------------------------------

export interface RenameGroupParams {
  groupId: string;
  newName: string;
}

/**
 * Rename a group and fan out the denormalized name to all members' memberships.
 */
export async function renameGroup(params: RenameGroupParams): Promise<void> {
  const { groupId, newName } = params;
  const trimmed = newName.trim();

  if (!trimmed || trimmed.length > 50) {
    throw new Error("Group name must be 1-50 characters.");
  }

  // Collect all member user IDs across all households
  const householdsSnap = await getDocs(
    collection(db, "groups", groupId, "households")
  );

  const allUserIds = new Set<string>();
  for (const hhDoc of householdsSnap.docs) {
    const members = hhDoc.data().memberUserIds as string[];
    for (const uid of members) {
      allUserIds.add(uid);
    }
  }

  const batch = writeBatch(db);

  // Update group doc name
  const groupRef = doc(db, "groups", groupId);
  batch.update(groupRef, { name: trimmed });

  // Fan out to all members' membership docs
  for (const uid of allUserIds) {
    const membershipRef = doc(db, "users", uid, "groupMemberships", groupId);
    batch.update(membershipRef, { groupName: trimmed });
  }

  await batch.commit();
}

// ---------------------------------------------------------------------------
// REGENERATE INVITE CODE  (US-HHR-04)
// ---------------------------------------------------------------------------

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
// JOIN GROUP VIA INVITE  (US-HHR-05 / US-HHR-06)
// ---------------------------------------------------------------------------

export interface JoinGroupParams {
  inviteCode: string;
  userId: string;
  /** Set when joining an existing household. */
  existingHouseholdId?: string;
  /** Set when creating a new household. */
  newHouseholdName?: string;
}

export type JoinGroupError =
  | "invalid_code"
  | "expired"
  | "already_member"
  | "household_name_taken"
  | "household_limit";

export interface JoinGroupResult {
  groupId: string;
  householdId: string;
}

/**
 * Join a group by invite code.
 *
 * The caller must provide either `existingHouseholdId` (join existing)
 * or `newHouseholdName` (create new household).
 */
export async function joinGroup(
  params: JoinGroupParams
): Promise<JoinGroupResult> {
  const { inviteCode, userId, existingHouseholdId, newHouseholdName } = params;
  const normalised = inviteCode.trim().toUpperCase();

  // 1. Find the group
  const groupsRef = collection(db, "groups");
  const q = query(groupsRef, where("inviteCode", "==", normalised));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new JoinError("invalid_code", "This invite code doesn't match any group.");
  }

  // Warn on invite code collision (multiple groups sharing the same code)
  if (snap.docs.length > 1) {
    console.warn(
      `[joinGroup] Invite code collision detected for "${normalised}" — ${snap.docs.length} groups match. Using first result.`
    );
  }

  const groupDoc = snap.docs[0];
  const groupData = groupDoc.data();
  const groupId = groupDoc.id;

  // 2. Check expiry
  const expiresAt = (groupData.inviteExpiresAt as Timestamp).toDate();
  if (!isInviteValid(expiresAt)) {
    throw new JoinError("expired", "This invite code has expired. Ask for a new one.");
  }

  // 3. Load existing households for validation (outside transaction because
  // Firestore transactions do not support collection queries).
  const householdsColRef = collection(db, "groups", groupId, "households");
  const householdsSnap = await getDocs(householdsColRef);

  // 4. Use a transaction to atomically check membership and write, eliminating
  // the TOCTOU race between the existence check and the write.
  const membershipRef = doc(db, "users", userId, "groupMemberships", groupId);

  if (existingHouseholdId) {
    // Join an existing household
    const householdDoc = householdsSnap.docs.find((d) => d.id === existingHouseholdId);
    if (!householdDoc) {
      throw new Error("Household not found.");
    }

    const householdData = householdDoc.data();

    await runTransaction(db, async (tx) => {
      const membershipSnap = await tx.get(membershipRef);
      if (membershipSnap.exists()) {
        throw new JoinError("already_member", "You're already in this group.");
      }

      // Add user to household's memberUserIds
      tx.update(householdDoc.ref, {
        memberUserIds: arrayUnion(userId),
      });

      // Create membership doc
      tx.set(membershipRef, {
        householdId: existingHouseholdId,
        householdName: householdData.name,
        groupName: groupData.name,
        joinedAt: serverTimestamp(),
      });
    });

    return { groupId, householdId: existingHouseholdId };
  }

  if (newHouseholdName) {
    // Create a new household
    const trimmedName = newHouseholdName.trim();

    // Check name uniqueness
    const nameTaken = householdsSnap.docs.some(
      (d) => d.data().name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameTaken) {
      throw new JoinError(
        "household_name_taken",
        "A household with this name already exists. Join it instead?"
      );
    }

    // Check soft limit
    if (householdsSnap.size >= MAX_HOUSEHOLDS_PER_GROUP) {
      throw new JoinError(
        "household_limit",
        `This group already has ${MAX_HOUSEHOLDS_PER_GROUP} households.`
      );
    }

    const color = pickHouseholdColor(householdsSnap.size);
    const householdRef = doc(collection(db, "groups", groupId, "households"));

    await runTransaction(db, async (tx) => {
      const membershipSnap = await tx.get(membershipRef);
      if (membershipSnap.exists()) {
        throw new JoinError("already_member", "You're already in this group.");
      }

      tx.set(householdRef, {
        name: trimmedName,
        color,
        memberUserIds: [userId],
      });

      tx.set(membershipRef, {
        householdId: householdRef.id,
        householdName: trimmedName,
        groupName: groupData.name,
        joinedAt: serverTimestamp(),
      });
    });

    return { groupId, householdId: householdRef.id };
  }

  throw new Error("Must provide either existingHouseholdId or newHouseholdName.");
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
// VALIDATE INVITE CODE  (US-HHR-05 step 1)
// ---------------------------------------------------------------------------

export interface ValidateInviteResult {
  groupId: string;
  groupName: string;
  households: Household[];
}

/**
 * Validate an invite code and return the group info + existing households.
 * Used by the join flow to show the household picker.
 */
export async function validateInviteCode(
  inviteCode: string
): Promise<ValidateInviteResult> {
  const normalised = inviteCode.trim().toUpperCase();

  const groupsRef = collection(db, "groups");
  const q = query(groupsRef, where("inviteCode", "==", normalised));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new JoinError("invalid_code", "This invite code doesn't match any group.");
  }

  const groupDoc = snap.docs[0];
  const groupData = groupDoc.data();

  const expiresAt = (groupData.inviteExpiresAt as Timestamp).toDate();
  if (!isInviteValid(expiresAt)) {
    throw new JoinError("expired", "This invite code has expired. Ask for a new one.");
  }

  const householdsSnap = await getDocs(
    collection(db, "groups", groupDoc.id, "households")
  );
  const households: Household[] = householdsSnap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    color: d.data().color,
    memberUserIds: d.data().memberUserIds ?? [],
  }));

  return {
    groupId: groupDoc.id,
    groupName: groupData.name,
    households,
  };
}

// ---------------------------------------------------------------------------
// FETCH GROUP  (US-HHR-01)
// ---------------------------------------------------------------------------

export async function fetchGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, "groups", groupId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name,
    inviteCode: data.inviteCode,
    inviteExpiresAt: data.inviteExpiresAt,
    createdByUserId: data.createdByUserId ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// SUBSCRIBE TO HOUSEHOLDS  (real-time)
// ---------------------------------------------------------------------------

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
      memberUserIds: d.data().memberUserIds ?? [],
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
      createdByUserId: data.createdByUserId ?? undefined,
    });
  });
}

// ---------------------------------------------------------------------------
// SUBSCRIBE TO USER'S GROUP MEMBERSHIPS  (US-HHR-01 — home screen)
// ---------------------------------------------------------------------------

export function subscribeToUserGroups(
  userId: string,
  onChange: (memberships: GroupMembership[]) => void
): Unsubscribe {
  const colRef = collection(db, "users", userId, "groupMemberships");
  return onSnapshot(colRef, (snap) => {
    const memberships: GroupMembership[] = snap.docs.map((d) => ({
      groupId: d.id,
      householdId: d.data().householdId,
      householdName: d.data().householdName,
      groupName: d.data().groupName,
      joinedAt: d.data().joinedAt,
    }));
    onChange(memberships);
  });
}

// ---------------------------------------------------------------------------
// GET USER MEMBERSHIP FOR A GROUP
// ---------------------------------------------------------------------------

export async function getUserMembership(
  userId: string,
  groupId: string
): Promise<GroupMembership | null> {
  const ref = doc(db, "users", userId, "groupMemberships", groupId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    groupId: snap.id,
    householdId: data.householdId,
    householdName: data.householdName,
    groupName: data.groupName,
    joinedAt: data.joinedAt,
  };
}

// ---------------------------------------------------------------------------
// SUBSCRIBE TO USER MEMBERSHIP FOR A GROUP  (real-time)
// ---------------------------------------------------------------------------

export function subscribeToUserMembership(
  userId: string,
  groupId: string,
  onChange: (membership: GroupMembership | null) => void
): Unsubscribe {
  const ref = doc(db, "users", userId, "groupMemberships", groupId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      onChange(null);
      return;
    }
    const data = snap.data();
    onChange({
      groupId: snap.id,
      householdId: data.householdId,
      householdName: data.householdName,
      groupName: data.groupName,
      joinedAt: data.joinedAt,
    });
  });
}

// ---------------------------------------------------------------------------
// SWITCH HOUSEHOLD  (US-HHR-08)
// ---------------------------------------------------------------------------

export interface SwitchHouseholdParams {
  groupId: string;
  userId: string;
  oldHouseholdId: string;
  /** Set when switching to an existing household. */
  newHouseholdId?: string;
  /** Set when creating a new household to switch to. */
  newHouseholdName?: string;
}

export async function switchHousehold(
  params: SwitchHouseholdParams
): Promise<string> {
  const { groupId, userId, oldHouseholdId, newHouseholdId, newHouseholdName } = params;

  const batch = writeBatch(db);

  // Remove user from old household
  const oldRef = doc(db, "groups", groupId, "households", oldHouseholdId);
  batch.update(oldRef, { memberUserIds: arrayRemove(userId) });

  let targetHouseholdId: string;
  let targetHouseholdName: string;

  if (newHouseholdId) {
    // Switching to an existing household
    const newRef = doc(db, "groups", groupId, "households", newHouseholdId);
    const newSnap = await getDoc(newRef);
    if (!newSnap.exists()) throw new Error("Target household not found.");
    targetHouseholdId = newHouseholdId;
    targetHouseholdName = newSnap.data().name;
    batch.update(newRef, { memberUserIds: arrayUnion(userId) });
  } else if (newHouseholdName) {
    // Creating a new household to switch to
    const householdsSnap = await getDocs(
      collection(db, "groups", groupId, "households")
    );

    // Check name uniqueness
    const nameTaken = householdsSnap.docs.some(
      (d) => d.data().name.toLowerCase() === newHouseholdName.trim().toLowerCase()
    );
    if (nameTaken) {
      throw new JoinError("household_name_taken", "A household with this name already exists.");
    }

    if (householdsSnap.size >= MAX_HOUSEHOLDS_PER_GROUP) {
      throw new JoinError("household_limit", `This group already has ${MAX_HOUSEHOLDS_PER_GROUP} households.`);
    }

    const color = pickHouseholdColor(householdsSnap.size);
    const newRef = doc(collection(db, "groups", groupId, "households"));
    targetHouseholdId = newRef.id;
    targetHouseholdName = newHouseholdName.trim();
    batch.set(newRef, {
      name: targetHouseholdName,
      color,
      memberUserIds: [userId],
    });
  } else {
    throw new Error("Must provide either newHouseholdId or newHouseholdName.");
  }

  // Update membership doc
  const membershipRef = doc(db, "users", userId, "groupMemberships", groupId);
  batch.update(membershipRef, {
    householdId: targetHouseholdId,
    householdName: targetHouseholdName,
  });

  await batch.commit();

  // Clean up empty old household
  const oldSnap = await getDoc(oldRef);
  if (oldSnap.exists()) {
    const members = oldSnap.data().memberUserIds as string[];
    if (members.length === 0) {
      await deleteEmptyHousehold(groupId, oldHouseholdId);
    }
  }

  return targetHouseholdId;
}

// ---------------------------------------------------------------------------
// RENAME HOUSEHOLD  (US-HHR-09)
// ---------------------------------------------------------------------------

export interface RenameHouseholdParams {
  groupId: string;
  householdId: string;
  newName: string;
}

/**
 * Rename a household and fan out the denormalized name to all members' memberships.
 */
export async function renameHousehold(
  params: RenameHouseholdParams
): Promise<void> {
  const { groupId, householdId, newName } = params;
  const trimmed = newName.trim();

  if (!trimmed || trimmed.length > 50) {
    throw new Error("Household name must be 1-50 characters.");
  }

  // Check name uniqueness within group
  const householdsSnap = await getDocs(
    collection(db, "groups", groupId, "households")
  );
  const nameTaken = householdsSnap.docs.some(
    (d) =>
      d.id !== householdId &&
      d.data().name.toLowerCase() === trimmed.toLowerCase()
  );
  if (nameTaken) {
    throw new Error("A household with this name already exists in the group.");
  }

  const batch = writeBatch(db);

  // Update household doc
  const householdRef = doc(db, "groups", groupId, "households", householdId);
  batch.update(householdRef, { name: trimmed });

  // Fan out to all members' membership docs
  const householdSnap = await getDoc(householdRef);
  if (!householdSnap.exists()) throw new Error("Household not found.");

  const memberUserIds = householdSnap.data().memberUserIds as string[];
  for (const uid of memberUserIds) {
    const membershipRef = doc(db, "users", uid, "groupMemberships", groupId);
    batch.update(membershipRef, { householdName: trimmed });
  }

  await batch.commit();
}

// ---------------------------------------------------------------------------
// DELETE HOUSEHOLD  (US-HHR-10)
// ---------------------------------------------------------------------------

export interface DeleteHouseholdParams {
  groupId: string;
  householdId: string;
}

/**
 * Delete a household from a group.
 *
 * Blocked during active trips. Removes the household doc, deletes pending
 * items, and cleans up membership docs for all members.
 */
// Firestore batches are capped at 500 operations. Keep each batch
// safely below that limit to avoid silent failures with large item lists.
const BATCH_SIZE_LIMIT = 499;

export async function deleteHousehold(
  params: DeleteHouseholdParams
): Promise<void> {
  const { groupId, householdId } = params;

  // Check for active trip
  const tripsRef = collection(db, "groups", groupId, "trips");
  const activeTripsQuery = query(tripsRef, where("status", "==", "active"));
  const activeTripsSnap = await getDocs(activeTripsQuery);
  if (!activeTripsSnap.empty) {
    throw new Error("Cannot delete a household while a trip is active.");
  }

  // Get household data for member list
  const householdRef = doc(db, "groups", groupId, "households", householdId);
  const householdSnap = await getDoc(householdRef);
  if (!householdSnap.exists()) throw new Error("Household not found.");

  const memberUserIds = householdSnap.data().memberUserIds as string[];

  // First batch: household delete + pending item deletes + membership deletes
  let batch = writeBatch(db);
  batch.delete(householdRef);
  let opsInBatch = 1;
  const batches: ReturnType<typeof writeBatch>[] = [batch];

  // Delete pending items from this household
  const itemsRef = collection(db, "groups", groupId, "items");
  const pendingItemsQuery = query(
    itemsRef,
    where("householdId", "==", householdId),
    where("status", "==", "pending")
  );
  const pendingItemsSnap = await getDocs(pendingItemsQuery);
  for (const itemDoc of pendingItemsSnap.docs) {
    if (opsInBatch >= BATCH_SIZE_LIMIT) {
      batch = writeBatch(db);
      batches.push(batch);
      opsInBatch = 0;
    }
    batch.delete(itemDoc.ref);
    opsInBatch++;
  }

  // Delete membership docs for all members
  for (const uid of memberUserIds) {
    if (opsInBatch >= BATCH_SIZE_LIMIT) {
      batch = writeBatch(db);
      batches.push(batch);
      opsInBatch = 0;
    }
    const membershipRef = doc(db, "users", uid, "groupMemberships", groupId);
    batch.delete(membershipRef);
    opsInBatch++;
  }

  // Commit all batches sequentially
  for (const b of batches) {
    await b.commit();
  }
}

// ---------------------------------------------------------------------------
// DELETE GROUP  (creator only)
// ---------------------------------------------------------------------------

export interface DeleteGroupParams {
  groupId: string;
  userId: string;
}

/**
 * Delete a group entirely. Only the creator can delete.
 * Blocked during active trips. Removes all items, trips, households,
 * membership docs, and the group doc itself.
 */
export async function deleteGroup(params: DeleteGroupParams): Promise<void> {
  const { groupId, userId } = params;

  // Verify creator
  const groupRef = doc(db, "groups", groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error("Group not found.");
  if (groupSnap.data().createdByUserId !== userId) {
    throw new Error("Only the group creator can delete this group.");
  }

  // Check for active trip
  const tripsRef = collection(db, "groups", groupId, "trips");
  const activeTripsQuery = query(tripsRef, where("status", "==", "active"));
  const activeTripsSnap = await getDocs(activeTripsQuery);
  if (!activeTripsSnap.empty) {
    throw new Error("Cannot delete group while a trip is active.");
  }

  // Collect all member user IDs across all households
  const householdsSnap = await getDocs(
    collection(db, "groups", groupId, "households")
  );
  const allUserIds = new Set<string>();
  for (const hhDoc of householdsSnap.docs) {
    const members = hhDoc.data().memberUserIds as string[];
    for (const uid of members) {
      allUserIds.add(uid);
    }
  }

  // Collect all items and trips for deletion
  const itemsSnap = await getDocs(collection(db, "groups", groupId, "items"));
  const tripsSnap = await getDocs(tripsRef);

  // Build batches (respect 499-op limit)
  let batch = writeBatch(db);
  let opsInBatch = 0;
  const batches: ReturnType<typeof writeBatch>[] = [batch];

  const addOp = (fn: (b: ReturnType<typeof writeBatch>) => void) => {
    if (opsInBatch >= BATCH_SIZE_LIMIT) {
      batch = writeBatch(db);
      batches.push(batch);
      opsInBatch = 0;
    }
    fn(batch);
    opsInBatch++;
  };

  // Delete items
  for (const itemDoc of itemsSnap.docs) {
    addOp((b) => b.delete(itemDoc.ref));
  }

  // Delete trips
  for (const tripDoc of tripsSnap.docs) {
    addOp((b) => b.delete(tripDoc.ref));
  }

  // Delete households
  for (const hhDoc of householdsSnap.docs) {
    addOp((b) => b.delete(hhDoc.ref));
  }

  // Delete membership docs
  for (const uid of allUserIds) {
    const membershipRef = doc(db, "users", uid, "groupMemberships", groupId);
    addOp((b) => b.delete(membershipRef));
  }

  // Delete group doc
  addOp((b) => b.delete(groupRef));

  // Commit all batches
  for (const b of batches) {
    await b.commit();
  }
}

// ---------------------------------------------------------------------------
// LEAVE GROUP  (US-HHR-11)
// ---------------------------------------------------------------------------

export interface LeaveGroupParams {
  groupId: string;
  userId: string;
  householdId: string;
}

/**
 * Leave a group. Removes user from household and deletes membership.
 * If the household becomes empty, auto-deletes it and its pending items.
 */
export async function leaveGroup(params: LeaveGroupParams): Promise<void> {
  const { groupId, userId, householdId } = params;

  const batch = writeBatch(db);

  // Remove user from household's memberUserIds
  const householdRef = doc(db, "groups", groupId, "households", householdId);
  batch.update(householdRef, { memberUserIds: arrayRemove(userId) });

  // Delete membership doc
  const membershipRef = doc(db, "users", userId, "groupMemberships", groupId);
  batch.delete(membershipRef);

  await batch.commit();

  // Check if household is now empty → auto-delete
  const householdSnap = await getDoc(householdRef);
  if (householdSnap.exists()) {
    const members = householdSnap.data().memberUserIds as string[];
    if (members.length === 0) {
      await deleteEmptyHousehold(groupId, householdId);
    }
  }
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Delete an empty household and its pending items.
 * Used after leave/switch when a household has zero members.
 */
async function deleteEmptyHousehold(
  groupId: string,
  householdId: string
): Promise<void> {
  const batch = writeBatch(db);

  batch.delete(doc(db, "groups", groupId, "households", householdId));

  const itemsRef = collection(db, "groups", groupId, "items");
  const pendingQuery = query(
    itemsRef,
    where("householdId", "==", householdId),
    where("status", "==", "pending")
  );
  const pendingSnap = await getDocs(pendingQuery);
  for (const itemDoc of pendingSnap.docs) {
    batch.delete(itemDoc.ref);
  }

  await batch.commit();
}
