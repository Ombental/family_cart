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

