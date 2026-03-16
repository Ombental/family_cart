/**
 * ItemActions -- ownership-gated edit/delete action buttons for a list item.
 *
 * Only renders controls when the item belongs to the current household.
 * Designed to sit right-aligned inside an item row.
 */

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ItemActionsProps {
  /** The householdId that owns the item. */
  itemHouseholdId: string;
  /** The current user's householdId. */
  currentHouseholdId: string;
  /** Called when the user taps the edit (pencil) button. */
  onEdit: () => void;
  /** Called when the user taps the delete (trash) button. */
  onDelete: () => void;
}

export function ItemActions({
  itemHouseholdId,
  currentHouseholdId,
  onEdit,
  onDelete,
}: ItemActionsProps) {
  // Ownership gate: hide controls for items from other households
  if (itemHouseholdId !== currentHouseholdId) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onEdit}
        aria-label="Edit item"
      >
        <Pencil className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onDelete}
        aria-label="Delete item"
      >
        <Trash2 className="size-3.5 text-destructive" />
      </Button>
    </div>
  );
}
