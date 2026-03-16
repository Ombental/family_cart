import { useEffect, useState } from "react";
import { subscribeToCompletedTrips } from "@/lib/firestore-trips";
import type { Item } from "@/types/item";
import type { Trip } from "@/types/trip";

export interface ItemSuggestion {
  name: string;
  qty: number;
  unit: string;
  notes: string;
  department: string;
  frequency: number;
}

interface CatalogEntry {
  name: string;
  qty: number;
  unit: string;
  notes: string;
  department: string;
  frequency: number;
  fromCurrentItems: boolean;
}

function buildCatalog(
  currentItems: Item[],
  trips: Trip[]
): ItemSuggestion[] {
  const map = new Map<string, CatalogEntry>();

  // Process current items first — they take priority for qty/unit/notes
  for (const item of currentItems) {
    const key = item.name.trim().toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.frequency += 1;
      // Current items always win for field values
      existing.qty = item.qty;
      existing.unit = item.unit;
      existing.notes = item.notes;
      existing.department = item.department;
      existing.name = item.name;
      existing.fromCurrentItems = true;
    } else {
      map.set(key, {
        name: item.name,
        qty: item.qty,
        unit: item.unit,
        notes: item.notes,
        department: item.department,
        frequency: 1,
        fromCurrentItems: true,
      });
    }
  }

  // Process trip history
  for (const trip of trips) {
    for (const pi of trip.purchasedItems) {
      const key = pi.name.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.frequency += 1;
        // Only update qty/unit if entry did NOT come from currentItems
        if (!existing.fromCurrentItems) {
          existing.qty = pi.qty;
          existing.unit = pi.unit;
          existing.department = pi.department ?? "";
          existing.name = pi.name;
        }
      } else {
        map.set(key, {
          name: pi.name,
          qty: pi.qty,
          unit: pi.unit,
          notes: "",
          department: pi.department ?? "",
          frequency: 1,
          fromCurrentItems: false,
        });
      }
    }
  }

  // Sort: frequency desc, then name asc (case-insensitive)
  const suggestions: ItemSuggestion[] = Array.from(map.values()).map(
    ({ name, qty, unit, notes, department, frequency }) => ({ name, qty, unit, notes, department, frequency })
  );

  suggestions.sort((a, b) => {
    if (b.frequency !== a.frequency) return b.frequency - a.frequency;
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });

  return suggestions;
}

export function useItemCatalog(
  groupId: string | undefined,
  currentItems: Item[]
): { suggestions: ItemSuggestion[] } {
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    if (!groupId) {
      setTrips([]); // eslint-disable-line react-hooks/set-state-in-effect -- guard for missing groupId
      return;
    }

    const unsubscribe = subscribeToCompletedTrips(groupId, setTrips);
    return unsubscribe;
  }, [groupId]);

  if (!groupId) {
    return { suggestions: [] };
  }

  const suggestions = buildCatalog(currentItems, trips);
  return { suggestions };
}
