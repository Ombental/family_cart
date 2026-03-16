import type { Timestamp } from "firebase/firestore";

export interface Store {
  id: string;
  name: string;
  createdAt: Timestamp;
}
