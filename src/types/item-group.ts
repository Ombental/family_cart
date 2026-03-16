import type { Item } from "./item";

/**
 * A group of items sharing the same product name (case-insensitive).
 *
 * Used in Shopper Mode (US-13) to collapse multiple household requests
 * for the same product into a single card with sub-rows per household.
 *
 * Pure client-side grouping — no Firestore changes.
 */
export interface ItemGroup {
  /** Normalized key: item.name.trim().toLowerCase() */
  key: string;
  /** Original casing from the earliest createdAt item */
  canonicalName: string;
  /** Items in this group, sorted by household name alphabetically */
  items: Item[];
  /** Number of distinct households requesting this product */
  householdCount: number;
  /** Department from the earliest item in the group (for department sorting) */
  department: string;
  /** Number of items with status "bought" */
  boughtCount: number;
  /** True when every item in the group is bought */
  allBought: boolean;
}
