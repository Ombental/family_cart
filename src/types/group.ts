import type { Timestamp } from "firebase/firestore";

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  inviteExpiresAt: Timestamp;
}

export interface Household {
  id: string;
  name: string;
  color: string;
  memberUserIds: string[];
}

/**
 * A user's membership in a group — stored at /users/{userId}/groupMemberships/{groupId}.
 * Denormalized for fast home-screen rendering.
 */
export interface GroupMembership {
  groupId: string;
  householdId: string;
  householdName: string;
  groupName: string;
  joinedAt: Timestamp;
}

/**
 * A group with only 1 household is in "holding" state.
 * A group with 2+ households is "active".
 */
export type GroupStatus = "holding" | "active";
