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
}

/**
 * A group with only 1 household is in "holding" state.
 * A group with 2+ households is "active".
 */
export type GroupStatus = "holding" | "active";
