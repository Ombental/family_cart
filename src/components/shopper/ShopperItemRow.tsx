import { useCallback } from "react";
import { Square, SquareCheckBig, Sparkles } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Item } from "@/types/item";
import type { Household } from "@/types/group";
import { getShortCode } from "@/lib/utils";

interface ShopperItemRowProps {
  item: Item;
  household: Household | undefined;
  activeTripId: string;
  onToggle: (itemId: string) => Promise<void>;
}

/**
 * Large-touch-target item row for Shopper Mode.
 *
 * The entire row is tappable to toggle the item between "pending" and "bought".
 * Min height of 56px ensures comfortable one-handed tapping on mobile.
 *
 * Visual states:
 * - Pending: empty square outline, normal text
 * - Bought: green filled square with check, strikethrough + reduced opacity
 * - "New" badge shown for items added during the current trip
 * - Household short code in colored pill
 */
export function ShopperItemRow({
  item,
  household,
  activeTripId,
  onToggle,
}: ShopperItemRowProps) {
  const { t } = useLanguage();
  const isBought = item.status === "bought";
  const isNewDuringTrip = item.addedDuringTripId === activeTripId;

  const handleToggle = useCallback(() => {
    onToggle(item.id);
  }, [onToggle, item.id]);

  const translatedUnit = item.unit ? t("units." + item.unit) : "";
  const qtyLabel =
    item.qty > 0
      ? `${item.qty}${translatedUnit ? ` ${translatedUnit}` : ""}`
      : translatedUnit || null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`flex w-full items-center gap-3 px-4 py-3 min-h-[56px] text-start transition-colors active:bg-muted/50 ${
        isBought ? "opacity-50" : "hover:bg-muted/30"
      }`}
      aria-label={isBought ? t("shopper.uncheck", { name: item.name }) : t("shopper.checkOff", { name: item.name })}
    >
      {/* Checkbox area -- square style */}
      <div className="flex items-center justify-center w-8 h-8 shrink-0">
        {isBought ? (
          <SquareCheckBig className="h-6 w-6 text-green-600" />
        ) : (
          <Square className="h-6 w-6 text-[#82827c]" />
        )}
      </div>

      {/* Item details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`text-base font-medium truncate ${
              isBought ? "line-through text-muted-foreground" : ""
            }`}
          >
            {item.name}
          </span>

          {isNewDuringTrip && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-200 shrink-0">
              <Sparkles className="h-2.5 w-2.5" />
              {t("shopper.new")}
            </span>
          )}
        </div>

        {qtyLabel && (
          <span
            className={`text-sm ${
              isBought ? "text-muted-foreground/60" : "text-muted-foreground"
            }`}
          >
            {qtyLabel}
          </span>
        )}
      </div>

      {/* Household short code pill */}
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
    </button>
  );
}
