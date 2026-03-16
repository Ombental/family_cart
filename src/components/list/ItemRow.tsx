import type { ReactNode } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Item } from "@/types/item";
import type { Household } from "@/types/group";

interface ItemRowProps {
  item: Item;
  household: Household | undefined;
  /** Optional tap handler for check-off (US-08). */
  onClick?: () => void;
  children?: ReactNode;
}

/**
 * Individual grocery-list item row.
 *
 * Displays a 4px left color bar matching the household color, the item name
 * at 15px bold, a meta line with quantity/unit and household name in 11px gray,
 * and a household attribution pill on the right. Accepts optional children for
 * action buttons (edit/delete -- wired in Task #27).
 *
 * Visual states:
 * - "pending"  -- normal styling
 * - "bought"   -- strikethrough + greyed out (prep for US-06)
 *
 * When an `onClick` handler is provided, the row becomes tappable with
 * cursor-pointer and active-state feedback for check-off UX.
 */
export function ItemRow({ item, household, onClick, children }: ItemRowProps) {
  const { t } = useLanguage();
  const isBought = item.status === "bought";

  const qtyLabel =
    item.qty > 0
      ? `${item.qty}${item.unit ? ` ${item.unit}` : ""}`
      : item.unit || null;

  // Build meta line segments: "Qty: 2 L", "Household Name"
  const metaParts: string[] = [];
  if (qtyLabel) {
    metaParts.push(t("items.qty", { label: qtyLabel }));
  }
  if (household) {
    metaParts.push(household.name);
  }

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`flex items-center gap-3 bg-white border-b border-[#eff1ef] px-4 py-3 ${
        isBought ? "opacity-50" : ""
      }${onClick ? " cursor-pointer select-none active:bg-muted/60 transition-colors" : ""}`}
      style={{
        borderInlineStartWidth: 4,
        borderInlineStartStyle: "solid",
        borderInlineStartColor: household?.color ?? "#e0e0e0",
      }}
    >
      {/* Item details */}
      <div className="min-w-0 flex-1">
        {/* Item name -- 15px bold */}
        <span
          className={`block text-[15px] font-bold leading-snug truncate ${
            isBought ? "line-through text-muted-foreground" : ""
          }`}
        >
          {item.name}
        </span>

        {/* Meta line -- 11px gray: "Qty: 2 L · Apt 3A" */}
        {metaParts.length > 0 && (
          <span className="block text-[11px] text-[#82827c] leading-tight mt-0.5 truncate">
            {metaParts.join(" \u00b7 ")}
          </span>
        )}

        {/* Notes on separate line if present */}
        {item.notes && (
          <p className="text-[11px] text-[#82827c] truncate mt-0.5">
            {item.notes}
          </p>
        )}
      </div>

      {/* Household attribution pill (US-05) */}
      {household && (
        <span
          className="inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border"
          style={{
            borderColor: household.color,
            color: household.color,
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: household.color }}
            aria-hidden="true"
          />
          {household.name}
        </span>
      )}

      {/* Action button slot (edit/delete -- Task #27) */}
      {children && <div className="flex items-center gap-1 shrink-0">{children}</div>}
    </div>
  );
}
