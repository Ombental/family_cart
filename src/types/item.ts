import type { Timestamp } from "firebase/firestore";

/**
 * An item on a shared grocery list.
 *
 * Stored at: /groups/{groupId}/items/{itemId}
 *
 * Attribution design (US-05): `householdId` identifies which household added the item.
 * This enables the "See Who Added What" feature, where the list view displays the
 * household name and color next to each item.
 *
 * Soft-delete pattern (US-04): When deleted, the item is marked with `deleted: true`
 * and `deletedAt` is set. A Cloud Function periodically purges items marked as deleted
 * for more than 10 seconds. The client must filter `deleted: true` items immediately.
 *
 * Trip context (US-06): When an item is added during an active trip (Shopper Mode),
 * `addedDuringTripId` is set to the active trip's ID. Items added outside an active trip
 * have `addedDuringTripId: null`. This enables the "newly added" visual indicator in
 * the Shopper Mode UI.
 */
export interface Item {
  id: string;
  name: string;
  qty: number;
  unit: string;
  notes: string;
  householdId: string;
  status: "pending" | "bought" | "missed";
  createdAt: Timestamp;
  department: string;
  addedDuringTripId: string | null;
  deleted: boolean;
  deletedAt: Timestamp | null;
}
