import { useMemo, useState, type ReactNode } from "react";
import { ShoppingCart, CheckCircle2 } from "lucide-react";
import { ItemRow } from "@/components/list/ItemRow";
import { EditItemForm } from "@/components/list/EditItemForm";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Item } from "@/types/item";
import type { Household } from "@/types/group";
import type { ItemSuggestion } from "@/hooks/useItemCatalog";

interface GroceryListProps {
  items: Item[];
  households: Household[];
  /** Optional render prop to inject action buttons per item (edit/delete). */
  editControls?: (item: Item) => ReactNode;
  /** ID of the item currently being edited (renders EditItemForm inline). */
  editingItemId?: string | null;
  /** Called when the user saves an inline edit. */
  onEditSave?: (item: Item, fields: { name: string; qty: number; unit: string; notes: string }) => Promise<void>;
  /** Called when the user cancels an inline edit. */
  onEditCancel?: () => void;
  /** Optional tap-to-toggle handler for check-off (US-08). */
  onToggleStatus?: (item: Item) => void;
  /** Catalog suggestions for the inline edit combobox. */
  suggestions?: ItemSuggestion[];
}

/**
 * Consolidated shared grocery list.
 *
 * Shows all pending items from every household with attribution badges.
 * Horizontal filter pills allow filtering by household. Items are sorted
 * by createdAt (oldest first).
 *
 * Read-only touch safety: no edit/delete controls are rendered by default.
 * Pass an `editControls` render prop to inject per-item action buttons.
 */
export function GroceryList({
  items,
  households,
  editControls,
  editingItemId,
  onEditSave,
  onEditCancel,
  onToggleStatus,
  suggestions,
}: GroceryListProps) {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<string | null>(null); // null = "All"

  const householdMap = new Map(households.map((h) => [h.id, h]));

  // Determine which households actually have items (for filter tabs)
  const householdsWithItems = useMemo(() => {
    const idsWithItems = new Set(items.map((i) => i.householdId));
    return households.filter((h) => idsWithItems.has(h.id));
  }, [items, households]);

  // Filter items by active household filter
  const filteredItems = useMemo(() => {
    if (!activeFilter) return items;
    return items.filter((i) => i.householdId === activeFilter);
  }, [items, activeFilter]);

  // Split filtered items into pending and purchased sections (US-06)
  const { pendingItems, purchasedItems, boughtCount } = useMemo(() => {
    const pending: Item[] = [];
    const purchased: Item[] = [];
    for (const item of filteredItems) {
      if (item.status === "bought") {
        purchased.push(item);
      } else {
        pending.push(item);
      }
    }
    return { pendingItems: pending, purchasedItems: purchased, boughtCount: purchased.length };
  }, [filteredItems]);

  if (items.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <ShoppingCart className="h-8 w-8 mx-auto mb-3 opacity-50" />
        <p className="text-sm">{t("items.noItems")}</p>
        <p className="text-xs mt-1">{t("items.addToGetStarted")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* "All" tab */}
        <button
          type="button"
          onClick={() => setActiveFilter(null)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
            activeFilter === null
              ? "bg-[#202020] text-white"
              : "bg-white border border-[#e0e0e0] text-[#82827c]"
          }`}
        >
          {t("items.all")}
        </button>

        {/* Per-household tabs */}
        {householdsWithItems.map((hh) => {
          const isActive = activeFilter === hh.id;
          return (
            <button
              key={hh.id}
              type="button"
              onClick={() => setActiveFilter(isActive ? null : hh.id)}
              className="shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors border"
              style={
                isActive
                  ? { backgroundColor: hh.color, borderColor: hh.color, color: "#ffffff" }
                  : { backgroundColor: "white", borderColor: hh.color, color: hh.color }
              }
            >
              {hh.name}
            </button>
          );
        })}
      </div>

      {/* Item count */}
      <p className="text-xs text-muted-foreground">
        {boughtCount > 0
          ? t("items.done", { bought: boughtCount, total: filteredItems.length })
          : filteredItems.length !== 1 ? t("common.itemsPlural", { count: filteredItems.length }) : t("common.items", { count: filteredItems.length })}
      </p>

      {/* Pending items */}
      {pendingItems.length > 0 && (
        <FlatView
          items={pendingItems}
          householdMap={householdMap}
          editControls={editControls}
          editingItemId={editingItemId}
          onEditSave={onEditSave}
          onEditCancel={onEditCancel}
          onToggleStatus={onToggleStatus}
          suggestions={suggestions}
        />
      )}

      {/* Purchased section separator (US-06) */}
      {purchasedItems.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {t("items.purchased", { count: purchasedItems.length })}
            </span>
            <div className="flex-1 border-t border-muted" />
          </div>
          <FlatView
            items={purchasedItems}
            householdMap={householdMap}
            editControls={editControls}
            editingItemId={editingItemId}
            onEditSave={onEditSave}
            onEditCancel={onEditCancel}
            onToggleStatus={onToggleStatus}
          />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Flat view                                                          */
/* ------------------------------------------------------------------ */

function FlatView({
  items,
  householdMap,
  editControls,
  editingItemId,
  onEditSave,
  onEditCancel,
  onToggleStatus,
  suggestions,
}: {
  items: Item[];
  householdMap: Map<string, Household>;
  editControls?: (item: Item) => ReactNode;
  editingItemId?: string | null;
  onEditSave?: (item: Item, fields: { name: string; qty: number; unit: string; notes: string }) => Promise<void>;
  onEditCancel?: () => void;
  onToggleStatus?: (item: Item) => void;
  suggestions?: ItemSuggestion[];
}) {
  return (
    <div>
      {items.map((item) =>
        editingItemId === item.id && onEditSave && onEditCancel ? (
          <EditItemForm
            key={item.id}
            name={item.name}
            qty={item.qty}
            unit={item.unit}
            notes={item.notes}
            suggestions={suggestions}
            onSave={(fields) => onEditSave(item, fields)}
            onCancel={onEditCancel}
          />
        ) : (
          <ItemRow
            key={item.id}
            item={item}
            household={householdMap.get(item.householdId)}
            onClick={onToggleStatus ? () => onToggleStatus(item) : undefined}
          >
            {editControls?.(item)}
          </ItemRow>
        )
      )}
    </div>
  );
}
