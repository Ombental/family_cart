import { useMemo } from "react";
import type { Item } from "@/types/item";

/**
 * Extracts unique non-empty department strings from items, sorted alphabetically.
 *
 * Department suggestions grow organically from usage (US-DC-04).
 */
export function useDepartmentCatalog(items: Item[]): string[] {
  return useMemo(() => {
    const departments = new Set<string>();
    for (const item of items) {
      if (item.department) {
        departments.add(item.department);
      }
    }
    return Array.from(departments).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [items]);
}
