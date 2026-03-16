import type { Timestamp } from "firebase/firestore";

/**
 * A snapshot of a purchased item, archived when a trip is completed.
 *
 * These are stored inside the Trip document's `purchasedItems` array
 * so that bought items can be hard-deleted from the items subcollection
 * while still preserving a record for trip summaries.
 */
export interface PurchasedItemSnapshot {
  name: string;
  qty: number;
  unit: string;
  department: string;
  householdId: string;
}

/**
 * A shopping trip record.
 *
 * Stored at: /groups/{groupId}/trips/{tripId}
 *
 * Trips represent a shopper's session in Shopper Mode. Only one active trip is permitted
 * per group at a time. The trip tracks when the shopping session started and ended,
 * and which household initiated it.
 *
 * Conflict detection (US-07): Before creating a trip, the client checks for any existing
 * trip with `status === "active"`. If found, the conflict screen displays the household
 * name using the `startedByHouseholdName` field — which is denormalized at trip creation
 * to avoid requiring a second Firestore read.
 *
 * Trip completion (US-11): When a trip is completed, all "bought" items are snapshotted
 * into `purchasedItems` and hard-deleted from the items subcollection. Pending/missed
 * items remain untouched on the list.
 *
 * Trip summary retention (NFR-03): Completed trips are retained for 30 days, then purged
 * by a scheduled Cloud Function (`purgeExpiredTripSummaries`).
 */
export interface Trip {
  id: string;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  status: "active" | "complete";
  startedByHouseholdId: string;
  startedByHouseholdName: string;
  startedByUserName?: string;
  purchasedItems: PurchasedItemSnapshot[];
  storeName?: string;
  totalAmount?: number;
  completedByUserId?: string;
}
