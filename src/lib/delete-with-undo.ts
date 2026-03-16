/**
 * delete-with-undo.ts
 *
 * Fire-and-forget helper that soft-deletes an item and shows a sonner toast
 * with a 5-second "Undo" action. If the user taps Undo, the item is restored
 * immediately. Otherwise, a scheduled Cloud Function purges the item later.
 */

import { toast } from "sonner";

interface DeleteWithUndoParams {
  /** Display name of the item (shown in the toast message). */
  itemName: string;
  /** Soft-delete the item in Firestore. */
  softDelete: () => Promise<void>;
  /** Undo the soft-delete in Firestore. */
  undoDelete: () => Promise<void>;
  /** Pre-translated "removed" message (e.g. "Milk removed"). */
  removedLabel?: string;
  /** Pre-translated "Undo" button label. */
  undoLabel?: string;
  /** Pre-translated error message for undo failure. */
  undoFailedLabel?: string;
}

/**
 * Soft-delete an item and present a sonner undo toast.
 *
 * 1. Calls `softDelete` to mark the item as deleted.
 * 2. Shows a toast: "{itemName} removed -- Undo" for 5 seconds.
 * 3. If the user taps "Undo", calls `undoDelete` to restore the item.
 * 4. After 5 seconds the toast auto-dismisses; the Cloud Function
 *    `purgeDeletedItems` handles permanent deletion.
 */
export async function deleteWithUndo({
  itemName,
  softDelete,
  undoDelete,
  removedLabel,
  undoLabel,
  undoFailedLabel,
}: DeleteWithUndoParams): Promise<void> {
  await softDelete();

  toast(removedLabel ?? `${itemName} removed`, {
    duration: 5000,
    action: {
      label: undoLabel ?? "Undo",
      onClick: () => {
        undoDelete().catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : (undoFailedLabel ?? "Failed to undo delete.");
          toast.error(message);
        });
      },
    },
  });
}
