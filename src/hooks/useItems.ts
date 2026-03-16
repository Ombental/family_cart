/**
 * Hook to subscribe to a group's items in real-time.
 *
 * Provides:
 * - items: the list of non-deleted Item documents
 * - loading: true while the initial snapshot loads
 * - addItem: add a new item (auto-injects householdId)
 * - updateItem: update an existing item (ownership-enforced)
 * - softDeleteItem: soft-delete an item (ownership-enforced)
 * - undoDeleteItem: undo a soft-delete (ownership-enforced)
 * - toggleItemStatus: toggle item between "pending" and "bought" (no ownership check)
 */

import { useState, useEffect, useCallback } from "react";
import {
  subscribeToItems,
  purgeDeletedItems,
  addItem as firestoreAddItem,
  updateItem as firestoreUpdateItem,
  softDeleteItem as firestoreSoftDeleteItem,
  undoDeleteItem as firestoreUndoDeleteItem,
  toggleItemStatus as firestoreToggleItemStatus,
} from "@/lib/firestore-items";
import type { Item } from "@/types/item";

export interface UseItemsResult {
  items: Item[];
  loading: boolean;
  addItem: (params: {
    name: string;
    qty: number;
    unit: string;
    notes: string;
    addedDuringTripId?: string | null;
  }) => Promise<string>;
  updateItem: (params: {
    itemId: string;
    name?: string;
    qty?: number;
    unit?: string;
    notes?: string;
  }) => Promise<void>;
  softDeleteItem: (itemId: string) => Promise<void>;
  undoDeleteItem: (itemId: string) => Promise<void>;
  toggleItemStatus: (itemId: string) => Promise<void>;
}

export function useItems(
  groupId: string | undefined,
  householdId: string
): UseItemsResult {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setLoading(false); // eslint-disable-line react-hooks/set-state-in-effect -- guard for missing groupId
      return;
    }

    // Purge stale soft-deleted items on mount (replaces Cloud Function)
    purgeDeletedItems(groupId).catch(() => {/* best-effort cleanup */});

    const unsub = subscribeToItems(groupId, (updatedItems) => {
      setItems(updatedItems);
      setLoading(false);
    });

    return () => {
      unsub();
    };
  }, [groupId]);

  const addItem = useCallback(
    async (params: {
      name: string;
      qty: number;
      unit: string;
      notes: string;
      addedDuringTripId?: string | null;
    }) => {
      if (!groupId) throw new Error("No group selected.");
      return firestoreAddItem({
        groupId,
        householdId,
        ...params,
      });
    },
    [groupId, householdId]
  );

  const updateItem = useCallback(
    async (params: {
      itemId: string;
      name?: string;
      qty?: number;
      unit?: string;
      notes?: string;
    }) => {
      if (!groupId) throw new Error("No group selected.");
      return firestoreUpdateItem({
        groupId,
        householdId,
        ...params,
      });
    },
    [groupId, householdId]
  );

  const softDeleteItem = useCallback(
    async (itemId: string) => {
      if (!groupId) throw new Error("No group selected.");
      return firestoreSoftDeleteItem({
        groupId,
        itemId,
        householdId,
      });
    },
    [groupId, householdId]
  );

  const undoDeleteItem = useCallback(
    async (itemId: string) => {
      if (!groupId) throw new Error("No group selected.");
      return firestoreUndoDeleteItem({
        groupId,
        itemId,
        householdId,
      });
    },
    [groupId, householdId]
  );

  const toggleItemStatus = useCallback(
    async (itemId: string) => {
      if (!groupId) throw new Error("No group selected.");
      return firestoreToggleItemStatus({
        groupId,
        itemId,
      });
    },
    [groupId]
  );

  return { items, loading, addItem, updateItem, softDeleteItem, undoDeleteItem, toggleItemStatus };
}
