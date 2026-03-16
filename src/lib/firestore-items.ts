/**
 * Firestore operations for items.
 *
 * All reads/writes are direct client-side Firestore operations (no REST API).
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Item } from "@/types/item";

// ---------------------------------------------------------------------------
// ADD ITEM  (US-02)
// ---------------------------------------------------------------------------

export interface AddItemParams {
  groupId: string;
  name: string;
  qty: number;
  unit: string;
  notes: string;
  householdId: string;
  addedDuringTripId?: string | null;
}

/**
 * Add a new item to /groups/{groupId}/items.
 *
 * The item is created with status "pending", deleted: false,
 * and createdAt set via serverTimestamp().
 */
export async function addItem(params: AddItemParams): Promise<string> {
  const { groupId, name, qty, unit, notes, householdId, addedDuringTripId } =
    params;

  const itemsRef = collection(db, "groups", groupId, "items");
  const docRef = await addDoc(itemsRef, {
    name,
    qty,
    unit,
    notes,
    householdId,
    status: "pending",
    createdAt: serverTimestamp(),
    addedDuringTripId: addedDuringTripId ?? null,
    deleted: false,
    deletedAt: null,
  });

  return docRef.id;
}

// ---------------------------------------------------------------------------
// UPDATE ITEM  (US-04)
// ---------------------------------------------------------------------------

export interface UpdateItemParams {
  groupId: string;
  itemId: string;
  householdId: string;
  name?: string;
  qty?: number;
  unit?: string;
  notes?: string;
}

/**
 * Update an existing item's name, qty, unit, and/or notes.
 *
 * Enforces ownership: only the household that created the item may update it.
 * Throws if the item does not exist or belongs to a different household.
 */
export async function updateItem(params: UpdateItemParams): Promise<void> {
  const { groupId, itemId, householdId, ...fields } = params;

  const itemRef = doc(db, "groups", groupId, "items", itemId);

  // Ownership check
  const snap = await getDoc(itemRef);
  if (!snap.exists()) {
    throw new Error("Item not found.");
  }
  if (snap.data().householdId !== householdId) {
    throw new Error("You can only edit items added by your household.");
  }

  // Build update payload — only include fields that were provided
  const update: Record<string, unknown> = {};
  if (fields.name !== undefined) update.name = fields.name;
  if (fields.qty !== undefined) update.qty = fields.qty;
  if (fields.unit !== undefined) update.unit = fields.unit;
  if (fields.notes !== undefined) update.notes = fields.notes;

  if (Object.keys(update).length === 0) return;

  await updateDoc(itemRef, update);
}

// ---------------------------------------------------------------------------
// SOFT-DELETE ITEM  (US-04)
// ---------------------------------------------------------------------------

export interface SoftDeleteItemParams {
  groupId: string;
  itemId: string;
  householdId: string;
}

/**
 * Soft-delete an item by setting deleted: true and deletedAt: serverTimestamp().
 *
 * Enforces ownership: only the household that created the item may delete it.
 * Throws if the item does not exist or belongs to a different household.
 */
export async function softDeleteItem(
  params: SoftDeleteItemParams
): Promise<void> {
  const { groupId, itemId, householdId } = params;

  const itemRef = doc(db, "groups", groupId, "items", itemId);

  // Ownership check
  const snap = await getDoc(itemRef);
  if (!snap.exists()) {
    throw new Error("Item not found.");
  }
  if (snap.data().householdId !== householdId) {
    throw new Error("You can only delete items added by your household.");
  }

  await updateDoc(itemRef, {
    deleted: true,
    deletedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// UNDO DELETE ITEM  (US-04)
// ---------------------------------------------------------------------------

export interface UndoDeleteItemParams {
  groupId: string;
  itemId: string;
  householdId: string;
}

/**
 * Undo a soft-delete by setting deleted: false and deletedAt: null.
 *
 * Can be called by the same household that deleted the item.
 * Throws if the item does not exist or belongs to a different household.
 */
export async function undoDeleteItem(
  params: UndoDeleteItemParams
): Promise<void> {
  const { groupId, itemId, householdId } = params;

  const itemRef = doc(db, "groups", groupId, "items", itemId);

  // Ownership check
  const snap = await getDoc(itemRef);
  if (!snap.exists()) {
    throw new Error("Item not found.");
  }
  if (snap.data().householdId !== householdId) {
    throw new Error("You can only undo deletes for items added by your household.");
  }

  await updateDoc(itemRef, {
    deleted: false,
    deletedAt: null,
  });
}

// ---------------------------------------------------------------------------
// TOGGLE ITEM STATUS  (US-08)
// ---------------------------------------------------------------------------

export interface ToggleItemStatusParams {
  groupId: string;
  itemId: string;
}

/**
 * Toggle an item's status between "pending" and "bought".
 *
 * No ownership check — any household can check off items during a trip.
 * Throws if the item does not exist.
 */
export async function toggleItemStatus(
  params: ToggleItemStatusParams
): Promise<void> {
  const { groupId, itemId } = params;

  const itemRef = doc(db, "groups", groupId, "items", itemId);

  const snap = await getDoc(itemRef);
  if (!snap.exists()) {
    throw new Error("Item not found.");
  }

  const currentStatus = snap.data().status as string;
  const newStatus = currentStatus === "pending" ? "bought" : "pending";

  await updateDoc(itemRef, { status: newStatus });
}

// ---------------------------------------------------------------------------
// PURGE DELETED ITEMS  (client-side replacement for Cloud Function)
// ---------------------------------------------------------------------------

/**
 * Permanently delete soft-deleted items whose deletedAt is older than 10 seconds.
 *
 * Runs client-side on subscription init — replaces the scheduled Cloud Function
 * that required the Blaze plan.
 */
export async function purgeDeletedItems(groupId: string): Promise<void> {
  const cutoff = Timestamp.fromMillis(Date.now() - 10_000);
  const colRef = collection(db, "groups", groupId, "items");
  const q = query(
    colRef,
    where("deleted", "==", true),
    where("deletedAt", "<", cutoff)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

// ---------------------------------------------------------------------------
// SUBSCRIBE TO ITEMS  (real-time listener)
// ---------------------------------------------------------------------------

/**
 * Subscribe to the items subcollection of a group.
 *
 * Filters out soft-deleted items (deleted: true) before passing to the callback.
 * Items are ordered by createdAt ascending.
 *
 * Returns an unsubscribe function.
 */
export function subscribeToItems(
  groupId: string,
  onChange: (items: Item[]) => void
): Unsubscribe {
  const colRef = collection(db, "groups", groupId, "items");
  const q = query(colRef, orderBy("createdAt", "asc"));

  return onSnapshot(q, (snap) => {
    const items: Item[] = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name,
          qty: data.qty,
          unit: data.unit,
          notes: data.notes,
          householdId: data.householdId,
          status: data.status,
          createdAt: data.createdAt,
          addedDuringTripId: data.addedDuringTripId,
          deleted: data.deleted,
          deletedAt: data.deletedAt,
        } as Item;
      })
      .filter((item) => !item.deleted);

    onChange(items);
  });
}
