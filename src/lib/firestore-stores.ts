/**
 * Firestore operations for group stores.
 *
 * Stores are saved per group at /groups/{groupId}/stores/{storeId}.
 */

import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Store } from "@/types/store";

/**
 * Add a store to a group. Returns existing store ID if a case-insensitive
 * duplicate is found, otherwise creates a new doc and returns its ID.
 */
export async function addStore(groupId: string, name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Store name cannot be empty.");

  const storesRef = collection(db, "groups", groupId, "stores");

  // Check for case-insensitive duplicate (small collection, client-side compare)
  const snap = await getDocs(storesRef);
  const existing = snap.docs.find(
    (d) => (d.data().name as string).toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) return existing.id;

  const docRef = await addDoc(storesRef, {
    name: trimmed,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Subscribe to the store list for a group (alphabetical order).
 */
export function subscribeToStores(
  groupId: string,
  onChange: (stores: Store[]) => void
): Unsubscribe {
  const storesRef = collection(db, "groups", groupId, "stores");
  const q = query(storesRef, orderBy("name", "asc"));

  return onSnapshot(q, (snap) => {
    const stores: Store[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name,
        createdAt: data.createdAt,
      };
    });
    onChange(stores);
  });
}
