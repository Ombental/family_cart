/**
 * Firestore operations for shopping trips.
 *
 * All reads/writes are direct client-side Firestore operations (no REST API).
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  limit,
  orderBy,
  writeBatch,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Trip, PurchasedItemSnapshot } from "@/types/trip";

// ---------------------------------------------------------------------------
// CREATE TRIP  (US-07)
// ---------------------------------------------------------------------------

export interface CreateTripParams {
  groupId: string;
  startedByHouseholdId: string;
  startedByHouseholdName: string;
  startedByUserName?: string;
}

export type CreateTripResult =
  | { conflict: false; tripId: string }
  | { conflict: true; activeTrip: Trip };

/**
 * Create a new shopping trip for the group.
 *
 * Enforces one-active-per-group: queries for an existing trip with
 * status === "active" before creating. If one exists, returns a
 * conflict result containing the active trip.
 *
 * NOTE: This check-then-write is NOT wrapped in a Firestore transaction.
 * At pilot/design-partner scale the race-condition window is narrow and
 * acceptable. For production, wrap in a transaction or use a Cloud Function
 * with a transaction to guarantee atomicity.
 */
export async function createTrip(
  params: CreateTripParams
): Promise<CreateTripResult> {
  const { groupId, startedByHouseholdId, startedByHouseholdName, startedByUserName } = params;

  const tripsRef = collection(db, "groups", groupId, "trips");

  // Conflict check: look for an already-active trip
  const activeQuery = query(
    tripsRef,
    where("status", "==", "active"),
    limit(1)
  );
  const activeSnap = await getDocs(activeQuery);

  if (!activeSnap.empty) {
    const activeDoc = activeSnap.docs[0];
    const data = activeDoc.data();
    const activeTrip: Trip = {
      id: activeDoc.id,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      status: data.status,
      startedByHouseholdId: data.startedByHouseholdId,
      startedByHouseholdName: data.startedByHouseholdName,
      startedByUserName: data.startedByUserName ?? undefined,
      purchasedItems: data.purchasedItems ?? [],
    };
    return { conflict: true, activeTrip };
  }

  // No active trip — create one
  const docRef = await addDoc(tripsRef, {
    startedAt: serverTimestamp(),
    completedAt: null,
    status: "active",
    startedByHouseholdId,
    startedByHouseholdName,
    ...(startedByUserName ? { startedByUserName } : {}),
    purchasedItems: [],
  });

  return { conflict: false, tripId: docRef.id };
}

// ---------------------------------------------------------------------------
// SUBSCRIBE TO ACTIVE TRIP  (real-time listener)
// ---------------------------------------------------------------------------

/**
 * Subscribe to the active trip in a group.
 *
 * Queries for trips with status === "active" (limit 1).
 * Calls onChange with the Trip or null if none is active.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToActiveTrip(
  groupId: string,
  onChange: (trip: Trip | null) => void
): Unsubscribe {
  const tripsRef = collection(db, "groups", groupId, "trips");
  const q = query(tripsRef, where("status", "==", "active"), limit(1));

  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      onChange(null);
      return;
    }

    const tripDoc = snap.docs[0];
    const data = tripDoc.data();
    onChange({
      id: tripDoc.id,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      status: data.status,
      startedByHouseholdId: data.startedByHouseholdId,
      startedByHouseholdName: data.startedByHouseholdName,
      startedByUserName: data.startedByUserName ?? undefined,
      purchasedItems: data.purchasedItems ?? [],
    });
  });
}

// ---------------------------------------------------------------------------
// COMPLETE TRIP  (US-07)
// ---------------------------------------------------------------------------

export interface CompleteTripParams {
  groupId: string;
  tripId: string;
}

/**
 * Complete a trip: archive bought items and clear them from the list.
 *
 * 1. Queries all items with status === "bought" and deleted === false.
 * 2. Builds a PurchasedItemSnapshot array from those items.
 * 3. In a single atomic batch:
 *    a. Updates the trip doc with status "complete", completedAt, and purchasedItems.
 *    b. Hard-deletes all "bought" item docs (they are now archived in the trip).
 * 4. Pending/missed items remain untouched on the list.
 */
export async function completeTrip(params: CompleteTripParams): Promise<void> {
  const { groupId, tripId } = params;

  // 1. Query bought items
  const itemsRef = collection(db, "groups", groupId, "items");
  const boughtQuery = query(
    itemsRef,
    where("status", "==", "bought"),
    where("deleted", "==", false)
  );
  const boughtSnap = await getDocs(boughtQuery);

  // 2. Build snapshot
  const purchasedItems: PurchasedItemSnapshot[] = boughtSnap.docs.map((d) => {
    const data = d.data();
    return {
      name: data.name,
      qty: data.qty,
      unit: data.unit,
      department: data.department ?? "",
      householdId: data.householdId,
    };
  });

  // 3. Batch: update trip + delete bought items
  const batch = writeBatch(db);
  const tripRef = doc(db, "groups", groupId, "trips", tripId);
  batch.update(tripRef, {
    status: "complete",
    completedAt: serverTimestamp(),
    purchasedItems,
  });
  for (const boughtDoc of boughtSnap.docs) {
    batch.delete(boughtDoc.ref);
  }
  await batch.commit();
}

// ---------------------------------------------------------------------------
// PURGE EXPIRED TRIP SUMMARIES  (client-side replacement for Cloud Function)
// ---------------------------------------------------------------------------

/**
 * Permanently delete completed trip summaries older than 30 days.
 *
 * Runs client-side on subscription init — replaces the scheduled Cloud Function
 * that required the Blaze plan.
 */
export async function purgeExpiredTrips(groupId: string): Promise<void> {
  const cutoff = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const tripsRef = collection(db, "groups", groupId, "trips");
  const q = query(
    tripsRef,
    where("status", "==", "complete"),
    where("completedAt", "<", cutoff)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

// ---------------------------------------------------------------------------
// SUBSCRIBE TO COMPLETED TRIPS  (real-time listener for trip summaries)
// ---------------------------------------------------------------------------

/**
 * Subscribe to completed trips in a group.
 *
 * Queries trips where status === "complete", ordered by completedAt descending.
 * Each Trip includes the `purchasedItems` snapshot for rendering summaries.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToCompletedTrips(
  groupId: string,
  onChange: (trips: Trip[]) => void
): Unsubscribe {
  const tripsRef = collection(db, "groups", groupId, "trips");
  const q = query(
    tripsRef,
    where("status", "==", "complete"),
    orderBy("completedAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    const trips: Trip[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        status: data.status,
        startedByHouseholdId: data.startedByHouseholdId,
        startedByHouseholdName: data.startedByHouseholdName,
        startedByUserName: data.startedByUserName ?? undefined,
        purchasedItems: data.purchasedItems ?? [],
      };
    });
    onChange(trips);
  });
}
