/**
 * Firestore operations for collaborative shopping join requests.
 *
 * Join requests live at: /groups/{groupId}/trips/{tripId}/joinRequests/{requestId}
 *
 * Flow:
 * 1. Group member calls requestToJoin() → creates a "pending" request doc
 * 2. Any active shopper calls approveJoinRequest() → updates request to "approved"
 *    and adds the requester to the trip's activeShoppers array (atomic batch)
 * 3. Or calls rejectJoinRequest() → updates request to "rejected"
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  writeBatch,
  arrayUnion,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { JoinRequest } from "@/types/join-request";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

function joinRequestsRef(groupId: string, tripId: string) {
  return collection(db, "groups", groupId, "trips", tripId, "joinRequests");
}

function mapJoinRequest(id: string, data: Record<string, unknown>): JoinRequest {
  return {
    id,
    userId: data.userId as string,
    userName: data.userName as string,
    householdId: data.householdId as string,
    householdName: data.householdName as string,
    status: data.status as JoinRequest["status"],
    requestedAt: data.requestedAt as Timestamp,
    respondedAt: (data.respondedAt as Timestamp) ?? null,
  };
}

// ---------------------------------------------------------------------------
// REQUEST TO JOIN
// ---------------------------------------------------------------------------

export interface RequestToJoinParams {
  groupId: string;
  tripId: string;
  userId: string;
  userName: string;
  householdId: string;
  householdName: string;
}

/**
 * Create a join request for an active trip.
 *
 * Checks for an existing pending/approved request from this user first
 * to prevent duplicates.
 */
export async function requestToJoin(params: RequestToJoinParams): Promise<string> {
  const { groupId, tripId, userId, userName, householdId, householdName } = params;

  const ref = joinRequestsRef(groupId, tripId);

  // Check for existing non-rejected request
  const existingQuery = query(ref, where("userId", "==", userId), where("status", "in", ["pending", "approved"]));
  const existing = await getDocs(existingQuery);
  if (!existing.empty) {
    return existing.docs[0].id;
  }

  const docRef = await addDoc(ref, {
    userId,
    userName,
    householdId,
    householdName,
    status: "pending",
    requestedAt: serverTimestamp(),
    respondedAt: null,
  });

  return docRef.id;
}

// ---------------------------------------------------------------------------
// APPROVE JOIN REQUEST
// ---------------------------------------------------------------------------

/**
 * Approve a join request — atomically updates the request status
 * and adds the requester to the trip's activeShoppers array.
 */
export async function approveJoinRequest(
  groupId: string,
  tripId: string,
  requestId: string,
  request: JoinRequest
): Promise<void> {
  const batch = writeBatch(db);

  // Update request status
  const requestRef = doc(db, "groups", groupId, "trips", tripId, "joinRequests", requestId);
  batch.update(requestRef, {
    status: "approved",
    respondedAt: serverTimestamp(),
  });

  // Add to trip's activeShoppers
  const tripRef = doc(db, "groups", groupId, "trips", tripId);
  batch.update(tripRef, {
    activeShoppers: arrayUnion({
      userId: request.userId,
      userName: request.userName,
      householdId: request.householdId,
      householdName: request.householdName,
      joinedAt: Timestamp.now(),
    }),
  });

  await batch.commit();
}

// ---------------------------------------------------------------------------
// REJECT JOIN REQUEST
// ---------------------------------------------------------------------------

/**
 * Reject a join request.
 */
export async function rejectJoinRequest(
  groupId: string,
  tripId: string,
  requestId: string
): Promise<void> {
  const batch = writeBatch(db);
  const requestRef = doc(db, "groups", groupId, "trips", tripId, "joinRequests", requestId);
  batch.update(requestRef, {
    status: "rejected",
    respondedAt: serverTimestamp(),
  });
  await batch.commit();
}

// ---------------------------------------------------------------------------
// SUBSCRIBE TO JOIN REQUESTS (for active shoppers — see all pending)
// ---------------------------------------------------------------------------

/**
 * Subscribe to all pending join requests for a trip.
 * Used by active shoppers to see incoming requests.
 */
export function subscribeToPendingRequests(
  groupId: string,
  tripId: string,
  onChange: (requests: JoinRequest[]) => void
): Unsubscribe {
  const ref = joinRequestsRef(groupId, tripId);
  const q = query(ref, where("status", "==", "pending"));

  return onSnapshot(q, (snap) => {
    const requests = snap.docs.map((d) => mapJoinRequest(d.id, d.data()));
    onChange(requests);
  });
}

// ---------------------------------------------------------------------------
// SUBSCRIBE TO MY JOIN REQUEST (for requesting user — see own status)
// ---------------------------------------------------------------------------

/**
 * Subscribe to the current user's join request status for a trip.
 * Returns the most recent request (pending or rejected).
 * Used by the requesting user to get real-time feedback.
 */
export function subscribeToMyJoinRequest(
  groupId: string,
  tripId: string,
  userId: string,
  onChange: (request: JoinRequest | null) => void
): Unsubscribe {
  const ref = joinRequestsRef(groupId, tripId);
  const q = query(ref, where("userId", "==", userId));

  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      onChange(null);
      return;
    }

    // Return the most recent request
    const requests = snap.docs
      .map((d) => mapJoinRequest(d.id, d.data()))
      .sort((a, b) => {
        const aTime = a.requestedAt?.toMillis?.() ?? 0;
        const bTime = b.requestedAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });

    onChange(requests[0]);
  });
}
