/**
 * Hook to subscribe to a group's stores in real-time.
 *
 * Provides:
 * - stores: alphabetically sorted Store list
 * - loading: true while initial snapshot loads
 * - addStore: add a new store (returns existing ID if duplicate)
 */

import { useState, useEffect, useCallback } from "react";
import {
  subscribeToStores,
  addStore as firestoreAddStore,
} from "@/lib/firestore-stores";
import type { Store } from "@/types/store";

export interface UseStoresResult {
  stores: Store[];
  loading: boolean;
  addStore: (name: string) => Promise<string>;
}

export function useStores(groupId: string | undefined): UseStoresResult {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setLoading(false); // eslint-disable-line react-hooks/set-state-in-effect -- guard for missing groupId
      return;
    }

    const unsub = subscribeToStores(groupId, (updatedStores) => {
      setStores(updatedStores);
      setLoading(false);
    });

    return () => {
      unsub();
    };
  }, [groupId]);

  const addStore = useCallback(
    async (name: string): Promise<string> => {
      if (!groupId) throw new Error("No group selected.");
      return firestoreAddStore(groupId, name);
    },
    [groupId]
  );

  return { stores, loading, addStore };
}
