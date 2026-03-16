import type { Timestamp } from "firebase/firestore";

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  inviteExpiresAt: Timestamp;
  createdByUserId?: string;
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

export type GroupStatus = "holding" | "active";

