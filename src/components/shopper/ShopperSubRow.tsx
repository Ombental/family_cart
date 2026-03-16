import { useCallback } from "react";
import { Square, SquareCheckBig, Sparkles } from "lucide-react";
import type { Item } from "@/types/item";
import type { Household } from "@/types/group";
import { getShortCode } from "@/lib/utils";

interface ShopperSubRowProps {
  item: Item;
  household: Household | undefined;
  activeTripId: string;
  onToggle: (itemId: string) => Promise<void>;
}

/**
 * Individual item row within a ShopperGroupCard (US-13).
 *
 * Shows household info instead of item name (name is in the group header).
 * Layout: checkbox -> household pill -> household name -> "New" badge -> qty/unit
 * Notes line shown below when present.
 *
 * 56px min-height touch target, same as ShopperItemRow.
 */
export function ShopperSubRow({
  item,
  household,
  activeTripId,
  onToggle,
}: ShopperSubRowProps) {
  const isBought = item.status === "bought";
  const isNewDuringTrip = item.addedDuringTripId === activeTripId;

  const handleToggle = useCallback(() => {
    onToggle(item.id);
  }, [onToggle, item.id]);

  const qtyLabel =
    item.qty > 0
      ? `${item.qty}${item.unit ? ` ${item.unit}` : ""}`
      : item.unit || null;

  const householdName = household?.name ?? "Unknown";

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`flex w-full items-start gap-3 px-4 py-3 min-h-[56px] text-left transition-colors active:bg-muted/50 ${
        isBought ? "opacity-50" : "hover:bg-muted/30"
      }`}
      aria-label={`${isBought ? "Uncheck" : "Check off"} ${item.name} for ${householdName}`}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center w-8 h-8 shrink-0 mt-0.5">
        {isBought ? (
          <SquareCheckBig className="h-6 w-6 text-green-600" />
        ) : (
          <Square className="h-6 w-6 text-[#82827c]" />
        )}
      </div>

      {/* Household info + qty */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {/* Household pill */}
          {household && (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border shrink-0"
              style={{
                backgroundColor: `${household.color}15`,
                borderColor: household.color,
                color: household.color,
              }}
            >
              {getShortCode(household.name)}
            </span>
          )}

          {/* Household name */}
          <span
            className={`text-sm font-medium truncate ${
              isBought ? "line-through text-muted-foreground" : ""
            }`}
          >
            {householdName}
          </span>

          {/* New badge */}
          {isNewDuringTrip && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200 shrink-0">
              <Sparkles className="h-2.5 w-2.5" />
              New
            </span>
          )}

          {/* Qty/unit */}
          {qtyLabel && (
            <span
              className={`text-sm shrink-0 ${
                isBought ? "text-muted-foreground/60" : "text-muted-foreground"
              }`}
            >
              {qtyLabel}
            </span>
          )}
        </div>

        {/* Notes line */}
        {item.notes && (
          <p
            className={`text-xs mt-0.5 ${
              isBought ? "text-muted-foreground/60" : "text-muted-foreground"
            }`}
          >
            {item.notes}
          </p>
        )}
      </div>
    </button>
  );
}
