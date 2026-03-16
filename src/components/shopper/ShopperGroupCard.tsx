import type { ItemGroup } from "@/types/item-group";
import type { Household } from "@/types/group";
import { ShopperSubRow } from "./ShopperSubRow";

interface ShopperGroupCardProps {
  group: ItemGroup;
  householdMap: Map<string, Household>;
  activeTripId: string;
  onToggle: (itemId: string) => Promise<void>;
}

/**
 * Card that groups items sharing the same product name (US-13).
 *
 * Header shows the canonical product name + household count + partial progress.
 * Body lists one ShopperSubRow per household request.
 */
export function ShopperGroupCard({
  group,
  householdMap,
  activeTripId,
  onToggle,
}: ShopperGroupCardProps) {
  const showProgress = group.boughtCount > 0 && !group.allBought;

  return (
    <div className="rounded-lg border border-[#f0f0f0] overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#fafafa]">
        <span className="text-base font-semibold truncate">
          {group.canonicalName}
        </span>
        <div className="flex items-center gap-2 shrink-0 text-xs text-[#82827c]">
          {showProgress && (
            <span>{group.boughtCount} of {group.items.length} done</span>
          )}
          <span>
            {group.householdCount} household{group.householdCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Sub-rows */}
      <div className="divide-y divide-[#f0f0f0]">
        {group.items.map((item) => (
          <ShopperSubRow
            key={item.id}
            item={item}
            household={householdMap.get(item.householdId)}
            activeTripId={activeTripId}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}
