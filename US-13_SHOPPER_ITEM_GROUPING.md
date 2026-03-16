# US-13 — Shopper Item Grouping by Product Name

> **Scope:** Shopper Mode Enhancement · Client-Side UI Only
> **Status:** Draft
> **Author:** Product Manager (Claude)
> **Date:** February 23, 2026
> **Depends on:** US-07, US-08, US-09, US-10 (all complete)
> **Estimated effort:** 8 story points

---

## 1. Overview & Problem Statement

### Current behaviour

In Shopper Mode (`ShopperModePage.tsx`), every item document from Firestore is rendered as an independent row in a flat scrollable list. Items are split into two sections -- "Still needed" and "In basket" -- with a progress bar tracking `boughtItems / totalItems`.

### The problem

When multiple households request the same product (e.g. Smith Family: Milk 2L, Jones Family: Milk 1L, Apt 3B: Milk 500ml), the shopper sees three separate "Milk" rows scattered throughout the list. The shopper must scroll and hunt for all instances of the same product before moving to the next aisle. This is slow, error-prone, and frustrating in a physical store setting where products are co-located by aisle.

### The opportunity

By grouping items with the same product name into a single expandable card, the shopper can:

1. See at a glance how many households need a given product.
2. Pick up all variants of that product in one stop at the shelf.
3. Check off each household's specific request independently.
4. Reduce scroll distance and cognitive load.

### Why now

All four sprints are complete. This is the highest-value UX improvement surfaced during internal testing before the Design Partner pilot begins.

---

## 2. User Story

**As a** Shopper in Shopper Mode,
**I want to** see items grouped by product name so that all households requesting the same product appear in a single card,
**so that** I can pick up everything I need from one shelf spot before moving on, reducing missed items and backtracking in the store.

---

## 3. Acceptance Criteria

| # | Criterion | Testable Condition |
|---|---|---|
| AC-01 | Items with the same normalized name are grouped into a single visual card | Given three items named "Milk", "milk", and " Milk ", all three appear as sub-rows within one "Milk" group card |
| AC-02 | Normalization is case-insensitive trimmed exact match | `item.name.trim().toLowerCase()` is used as the grouping key; no fuzzy matching, no stemming |
| AC-03 | Each group card displays the product name as a header and a count label (e.g. "3 households") | Given a group with items from 3 different households, the header reads the canonical product name and "3 households" |
| AC-04 | Each sub-row within a group shows: household color pill, household name, qty/unit, notes (if any), and an independent checkbox | All five data points are visible per sub-row without expanding or tapping |
| AC-05 | Check-off remains per-item: tapping a sub-row toggles only that household's item between `pending` and `bought` | Given a group of 3 sub-rows, checking one does not affect the other two |
| AC-06 | A group where ALL sub-items have `status === "bought"` moves to the "In basket" section | Given a "Milk" group with 2 sub-rows, checking both causes the entire group card to move to "In basket" |
| AC-07 | A group where SOME (but not all) sub-items are bought remains in the "Still needed" section with a partial visual indicator | Given a "Milk" group with 3 sub-rows where 1 is bought, the group stays in "Still needed" and shows "1 of 3" progress |
| AC-08 | A group with exactly one item renders identically to a group card (not a special flat row) for visual consistency | A solo-item group still shows the group card structure with one sub-row |
| AC-09 | Groups in "Still needed" are sorted alphabetically (A-Z) by canonical product name | "Apples" appears before "Bread" which appears before "Milk" |
| AC-10 | Groups in "In basket" are sorted alphabetically (A-Z) by canonical product name | Same alphabetical order within the bought section |
| AC-11 | The progress bar counts individual items, not groups | Given 10 total items across 6 groups, the denominator is 10 and the numerator is the count of items with `status === "bought"` |
| AC-12 | The "New" badge (sparkle icon + "New" text) is shown on the sub-row level for items where `addedDuringTripId === activeTripId` | A newly added milk item shows the badge on its sub-row; other sub-rows in the same group do not show it |
| AC-13 | Items added during the trip are grouped normally by product name | A last-minute "Milk" item joins the existing "Milk" group rather than appearing separately |
| AC-14 | Empty state, loading state, and offline banner are unchanged | No visual or behavioral regression in these states |
| AC-15 | The "Complete Trip" button and its helper text remain unchanged | Button still reads "Complete Trip", helper still shows remaining count of individual items |
| AC-16 | Sub-rows within a group are ordered by household name alphabetically | Within a "Milk" group, "Apt 3B" appears before "Jones Family" which appears before "Smith Family" |
| AC-17 | The section headers show group counts, not item counts | "Still needed" header shows "(4 groups)" if there are 4 groups pending, not "(7 items)"; the individual item count is shown only in the progress bar area |
| AC-18 | No Firestore data model changes are required | Grouping is a pure client-side transformation of the existing `Item[]` array; no new fields, collections, or indexes |

---

## 4. UI Specification

### 4.1 Section Headers

Each section header ("Still needed", "In basket") continues to use the existing uppercase, small-caps style (`text-xs font-semibold text-[#82827c] uppercase tracking-wide`). The count in parentheses changes from item count to group count (e.g. "Still needed (4 groups)").

### 4.2 Group Card

Each group is rendered as a card-like container with the following structure:

**Group Header Row** -- a non-tappable row spanning the full width of the card:

- **Left:** Product name in `text-base font-semibold`. The canonical name is the original-cased version from the first item encountered (by `createdAt` ascending) to preserve the requester's intended casing.
- **Right:** A muted label showing the household count -- e.g. "3 households" in `text-xs text-[#82827c]`. For a single-item group, this reads "1 household".
- **Partial progress indicator:** When the group is in "Still needed" and has some bought sub-items, a small inline label appears next to the household count: "1 of 3 done" in `text-xs text-[#82827c]`. When no sub-items are bought, this label is hidden.

**Background:** The group card has a subtle rounded container (`rounded-lg`) with a `1px` border in `border-[#f0f0f0]` and no fill (transparent background). This visually separates groups from each other.

**Spacing:** Groups are separated by `8px` vertical gap (`space-y-2` on the parent container). The group header has `px-4 py-2` padding. Sub-rows have `px-4 py-3` padding with a `min-h-[56px]` for touch targets.

### 4.3 Sub-Row (Per-Household Item)

Each sub-row within a group card is a tappable row (the entire row toggles that item's status). The layout is:

1. **Checkbox** (left, 32x32px touch area): Square checkbox icon. Pending state: `Square` icon in `text-[#82827c]`. Bought state: `SquareCheckBig` icon in `text-green-600`.

2. **Household pill** (after checkbox): A colored pill showing the household short code, using the existing `getShortCode()` logic and the household's assigned color. Style matches the current `ShopperItemRow` pill: `rounded-full px-2 py-0.5 text-[11px] font-medium border` with `backgroundColor: ${household.color}15`, `borderColor: household.color`, `color: household.color`.

3. **Household name** (after pill): The full household name in `text-sm font-medium`. Truncated with ellipsis if too long.

4. **Qty/Unit label** (after household name, on the same line or wrapped below on narrow screens): e.g. "2 litres" in `text-sm text-muted-foreground`.

5. **Notes** (below the household name line, only if non-empty): Item notes in `text-xs text-muted-foreground italic`, single line, truncated.

6. **"New" badge** (inline after household name, before qty): The existing sparkle badge (`Sparkles` icon + "New" in amber pill) appears only on sub-rows where `item.addedDuringTripId === activeTripId`.

**Bought state styling:** When a sub-row's item has `status === "bought"`, the entire sub-row gets `opacity-50` and the household name + qty text get `line-through`.

**Dividers:** Sub-rows within a group are separated by a thin `1px` divider in `divide-[#f0f0f0]`. There is no divider above the first sub-row or below the last.

### 4.4 Progress Bar

Unchanged. Counts individual items: `{checkedCount} of {totalItems} items checked`.

### 4.5 FAB and Bottom Bar

Unchanged. The add-item FAB and "Complete Trip" bottom bar remain as-is.

---

## 5. Component Model

### 5.1 New Components

| Component | File Path | Responsibility |
|---|---|---|
| `ShopperGroupCard` | `src/components/shopper/ShopperGroupCard.tsx` | Renders a single product group: header row + list of sub-rows. Accepts a `GroupedItem` object and callbacks. |
| `ShopperSubRow` | `src/components/shopper/ShopperSubRow.tsx` | Renders a single household's item within a group. Replaces the role of `ShopperItemRow` for the grouped context. Accepts an `Item`, `Household`, `activeTripId`, and `onToggle`. |

### 5.2 Modified Components

| Component | Change |
|---|---|
| `ShopperModePage.tsx` | Replace flat item rendering with grouped rendering. Add `useGroupedItems` hook call. Replace `pendingItems.map(...)` and `boughtItems.map(...)` with `pendingGroups.map(...)` and `boughtGroups.map(...)`. Section header counts change to group counts. |

### 5.3 New Hook

| Hook | File Path | Responsibility |
|---|---|---|
| `useGroupedItems` | `src/hooks/useGroupedItems.ts` | Pure transformation hook. Takes `Item[]` and returns `{ pendingGroups: ItemGroup[], boughtGroups: ItemGroup[] }`. Contains all grouping, sorting, and section-assignment logic. Memoized with `useMemo`. |

### 5.4 New Type

```typescript
// src/types/item-group.ts

export interface ItemGroup {
  /** Grouping key: item.name.trim().toLowerCase() */
  key: string;

  /** Display name: original casing from the earliest item (by createdAt) */
  canonicalName: string;

  /** All items in this group, sorted by household name alphabetically */
  items: Item[];

  /** Distinct household count */
  householdCount: number;

  /** Number of items with status === "bought" */
  boughtCount: number;

  /** True when every item in the group has status === "bought" */
  allBought: boolean;
}
```

### 5.5 Deprecated

| Component | Action |
|---|---|
| `ShopperItemRow` | No longer imported by `ShopperModePage`. Retained in codebase for potential reuse elsewhere, but effectively replaced by `ShopperSubRow` in Shopper Mode. |

---

## 6. Grouping Logic

### 6.1 Algorithm (step-by-step)

The following logic is implemented inside the `useGroupedItems` hook, wrapped in `useMemo` with `[items]` as the dependency.

**Step 1 -- Build a map of groups:**

```
groupMap = new Map<string, Item[]>()

for each item in items:
    key = item.name.trim().toLowerCase()
    if groupMap has key:
        groupMap.get(key).push(item)
    else:
        groupMap.set(key, [item])
```

**Step 2 -- Transform map entries into `ItemGroup` objects:**

```
for each [key, groupItems] of groupMap:
    sort groupItems by household name alphabetically (using householdMap lookup)

    canonicalName = groupItems
        .slice()
        .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())
        [0].name.trim()

    boughtCount = groupItems.filter(i => i.status === "bought").length
    allBought = boughtCount === groupItems.length

    create ItemGroup { key, canonicalName, items: groupItems, householdCount: uniqueHouseholdIds.size, boughtCount, allBought }
```

**Step 3 -- Split into pending and bought groups:**

```
pendingGroups = groups where allBought === false
boughtGroups = groups where allBought === true
```

**Step 4 -- Sort each section alphabetically by canonicalName:**

```
pendingGroups.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
boughtGroups.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
```

**Step 5 -- Return:**

```
return { pendingGroups, boughtGroups }
```

### 6.2 Performance Note

The grouping runs on every `items` change (Firestore snapshot). For the pilot scale (fewer than 100 items per group), this is negligible. No debouncing or virtualization is needed.

---

## 7. States & Edge Cases

| # | Scenario | Expected Behaviour |
|---|---|---|
| E-01 | Single item for a product (no grouping peers) | Rendered as a group card with one sub-row. Group header shows "1 household". |
| E-02 | Two items from the SAME household with the same name (e.g. household added "Milk" twice) | Both appear as sub-rows in the same group. The household count still shows "1 household" (distinct count). Both sub-rows show the same household pill. |
| E-03 | Item name is empty string or whitespace only | Grouped under key `""`. Canonical name displays as empty. This is a data quality issue upstream; no special handling in this feature. |
| E-04 | Item added mid-trip joins an existing group | Real-time Firestore snapshot fires, `useGroupedItems` recomputes, new item appears as a sub-row in the matching group with the "New" badge. |
| E-05 | Last sub-row in a group is checked off (group becomes fully bought) | The entire group card animates (or instantly moves) from "Still needed" to "In basket". |
| E-06 | A bought sub-row is unchecked (group was fully bought, now partially pending) | The group card moves from "In basket" back to "Still needed" with a partial progress indicator. |
| E-07 | All items are bought (100% progress) | "Still needed" section is hidden. "In basket" shows all groups. Progress bar shows full. |
| E-08 | Zero items on the list | Existing empty state is shown (shopping cart icon + "No items on the list"). No group cards rendered. |
| E-09 | Offline mode | Offline banner appears. Check-offs queue locally per existing IndexedDB persistence. Groups recompute from local cache. |
| E-10 | Item deleted by a requester while shopper is viewing | Firestore snapshot removes the item. If the group had multiple items, it re-renders with one fewer sub-row. If it was the last item, the group disappears. |
| E-11 | Names differ only by whitespace or casing ("Milk", " milk ", "MILK") | All grouped together under key "milk". Canonical name taken from the earliest-created item's trimmed name. |
| E-12 | Unicode / accented characters ("Creme Brulee" vs "Creme brulee") | Grouped together since `toLowerCase()` handles standard unicode folding. Exact locale-sensitive collation is out of scope for pilot. |

---

## 8. Out of Scope / Deferred

| Item | Reason | Potential Future Story |
|---|---|---|
| "Check all" button on a group card | Adds complexity; per-item check-off is sufficient for pilot | US-14 (TBD) |
| Fuzzy / phonetic matching (e.g. "Milk" vs "Mlk") | Requires NLP or edit-distance logic; exact match is good enough for pilot families who coordinate naming | Post-pilot enhancement |
| Aisle / category grouping | Requires category taxonomy or store map data not available in pilot | Post-pilot feature |
| Collapsible / expandable group cards | All sub-rows are always visible; collapsing adds tap cost for the shopper | Evaluate after pilot feedback |
| Drag-to-reorder groups | Alphabetical is deterministic and sufficient | Post-pilot if requested |
| Group-level notes or annotations | No use case identified yet | Post-pilot |
| Animated transitions when groups move between sections | Nice-to-have polish; not required for MVP | Sprint 6 polish |
| Server-side grouping or denormalized group field | Violates "no data model changes" constraint; unnecessary for pilot scale | Post-pilot if performance requires |

---

## 9. Success Metrics

### 9.1 Leading Indicators (measurable within 1 week of deployment)

| Metric | Measurement | Target |
|---|---|---|
| Trip completion rate | % of started trips that reach "Complete Trip" | Maintain or improve current baseline (no regression) |
| Average trip duration | Time from Shopper Mode activation to trip completion | Reduce by 10-15% vs. pre-grouping baseline |
| Items checked per minute | `boughtCount / tripDurationMinutes` | Increase by 15%+ indicating faster in-store workflow |

### 9.2 Lagging Indicators (measurable after 2-4 weeks)

| Metric | Measurement | Target |
|---|---|---|
| Missed item rate | % of items left unchecked at trip completion | Reduce by 20%+ (grouping reduces oversight of scattered duplicates) |
| Design Partner satisfaction (qualitative) | Direct feedback from pilot families on Shopper Mode UX | Positive sentiment on "finding items" and "knowing what to grab" |
| Shopper Mode adoption | % of trips using Shopper Mode (NFR-02 event) | Maintain >= 70% target from NFR-02 |

### 9.3 Instrumentation Required

No new analytics events are needed. Existing trip start/completion events (NFR-02) plus timestamp deltas provide all quantitative metrics. Qualitative feedback is collected via the Design Partner feedback channel already established.

---

## Story Summary

| Field | Value |
|---|---|
| **ID** | US-13 |
| **Title** | Shopper Item Grouping by Product Name |
| **Section** | Shopper Mode |
| **Role** | Shopper |
| **Priority** | High (pre-pilot UX improvement) |
| **Estimate** | 8 SP |
| **Dependencies** | US-07, US-08, US-09, US-10 (all complete) |
| **Data model changes** | None |
| **Dev-Ready** | Yes |

---

*FamilyCart -- US-13 Shopper Item Grouping -- Product Specification -- February 23, 2026*
