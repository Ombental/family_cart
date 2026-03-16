import { useMemo } from "react";
import type { Item } from "@/types/item";
import type { Household } from "@/types/group";
import type { ItemGroup } from "@/types/item-group";

/**
 * Groups items by normalized product name for Shopper Mode (US-13).
 *
 * Pure client-side transformation — no Firestore changes.
 *
 * Algorithm:
 * 1. Build Map<normalizedName, Item[]> via item.name.trim().toLowerCase()
 * 2. Per group: sort items by household name, pick canonicalName from earliest createdAt,
 *    compute boughtCount/allBought/householdCount (distinct Set)
 * 3. Split: pendingGroups = !allBought, boughtGroups = allBought
 * 4. Sort each array alphabetically by canonicalName
 */
export function useGroupedItems(
  items: Item[],
  householdMap: Map<string, Household>
): { pendingGroups: ItemGroup[]; boughtGroups: ItemGroup[] } {
  return useMemo(() => {
    // 1. Group by normalized name
    const groupMap = new Map<string, Item[]>();
    for (const item of items) {
      const key = item.name.trim().toLowerCase();
      const existing = groupMap.get(key);
      if (existing) {
        existing.push(item);
      } else {
        groupMap.set(key, [item]);
      }
    }

    // 2. Build ItemGroup for each normalized key
    const allGroups: ItemGroup[] = [];
    for (const [key, groupItems] of groupMap) {
      // Sort items by household name alphabetically
      const sorted = [...groupItems].sort((a, b) => {
        const nameA = householdMap.get(a.householdId)?.name ?? "";
        const nameB = householdMap.get(b.householdId)?.name ?? "";
        return nameA.localeCompare(nameB);
      });

      // Canonical name from earliest createdAt
      let earliest = sorted[0];
      for (const item of sorted) {
        if (item.createdAt.toMillis() < earliest.createdAt.toMillis()) {
          earliest = item;
        }
      }

      const boughtCount = sorted.filter((i) => i.status === "bought").length;
      const householdIds = new Set(sorted.map((i) => i.householdId));

      allGroups.push({
        key,
        canonicalName: earliest.name,
        items: sorted,
        householdCount: householdIds.size,
        boughtCount,
        allBought: boughtCount === sorted.length,
      });
    }

    // 3. Split into pending and bought
    const pendingGroups: ItemGroup[] = [];
    const boughtGroups: ItemGroup[] = [];
    for (const group of allGroups) {
      if (group.allBought) {
        boughtGroups.push(group);
      } else {
        pendingGroups.push(group);
      }
    }

    // 4. Sort alphabetically by canonicalName
    pendingGroups.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
    boughtGroups.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));

    return { pendingGroups, boughtGroups };
  }, [items, householdMap]);
}
