import type { Timestamp } from "firebase/firestore";

/**
 * A request from a group member to join an active shopping trip.
 *
 * Stored at: /groups/{groupId}/trips/{tripId}/joinRequests/{requestId}
 *
 * Any active shopper can approve or reject pending requests.
 * Approved requests trigger adding the requester to the trip's activeShoppers array.
 */
export interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  householdId: string;
  householdName: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: Timestamp;
  respondedAt: Timestamp | null;
}
