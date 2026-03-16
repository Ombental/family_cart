# US-12a: Per-Household Item Breakdown in Trip Summary

| Field      | Value                                           |
|------------|-------------------------------------------------|
| ID         | US-12a                                          |
| Version    | 1.0                                             |
| Date       | 2026-02-23                                      |
| Status     | Draft                                           |
| Parent     | US-12 — View the trip summary after completion   |
| Author     | PM Agent                                        |

---

## 1. Problem Statement

After a shopping trip completes, the Trip Summary page currently displays per-household item **counts** (e.g., "Smith Family — 4 items") but does not reveal which specific items belong to each household. This creates a concrete usability gap during the physical distribution of groceries.

**The pain point:** A shopper arrives home with multiple bags of groceries and needs to sort items by household. They open the Trip Summary to recall what belongs to whom, but they only see "Smith Family — 4 items" and "Jones Family — 3 items." They cannot see that the Smiths ordered milk, eggs, butter, and bread while the Joneses ordered rice, chicken, and olive oil. The shopper is forced to guess, text family members, or dig through receipts.

This information already exists in the system. The `purchasedItems` array on each trip document contains every item with its name, quantity, unit, and household ID. The current UI simply does not expose it. This spec adds expandable per-household sections to the existing TripSummaryPage so that any group member can drill into the exact items each household ordered, directly supporting the physical handoff of groceries.

---

## 2. User Story

> **As** any group member viewing a completed trip summary,
> **I want to** expand each household's section to see the specific items they ordered,
> **so that** I can physically distribute the right items to each household.

---

## 3. Acceptance Criteria

| ID    | Criterion                                                                                           |
|-------|------------------------------------------------------------------------------------------------------|
| AC-1  | Each household row in the per-household breakdown is tappable/clickable to expand or collapse.       |
| AC-2  | When expanded, the section shows all purchased items for that household.                             |
| AC-3  | Each item row displays the item name (15px semibold) and a meta line showing quantity and unit (11px).|
| AC-4  | Each item row has a 4px left color bar matching the household's assigned color.                      |
| AC-5  | A chevron icon indicates state: pointing down when collapsed, pointing up when expanded. The rotation uses a 200ms ease-in-out CSS transition. |
| AC-6  | Multiple household sections can be open simultaneously (independent toggle).                         |
| AC-7  | All sections default to the collapsed state on page load.                                            |
| AC-8  | Expand/collapse state is local component state only; it is not persisted to Firestore, localStorage, or URL. |
| AC-9  | The item count badge (e.g., "4 items") remains visible in both collapsed and expanded states.        |
| AC-10 | Accessibility: each section uses `button` with `aria-expanded`, the item list panel uses `aria-controls` / `id` pairing, and the pattern follows the WAI-ARIA disclosure widget specification. |
| AC-11 | Expanding or collapsing a section triggers zero new Firestore reads. All data is already in memory.  |

---

## 4. UX Flow

1. User navigates to a completed trip via Trip History (`/group/:groupId/trip/:tripId`).
2. The Trip Summary page loads with the green hero ("Trip Complete!"), metadata, and the summary card.
3. Inside the summary card, the "Per Household" section displays one row per household. All rows are **collapsed** by default.
4. User taps a household row. The chevron rotates from down to up (200ms), and the item list slides open below the row.
5. User can see each purchased item with its name, quantity, unit, and a color bar matching the household.
6. User taps the same household row again. The chevron rotates back to down, and the item list collapses.
7. User can expand a second household without collapsing the first. Both remain open simultaneously.
8. User taps "Done" at the bottom to return to the group page.

### Wireframe 1: Collapsed State (Default)

```
+--------------------------------------------------+
|  Per Household                                    |
+--------------------------------------------------+
|  * Smith Family                    4 items   v    |
|  * Jones Family                    3 items   v    |
+--------------------------------------------------+

Legend:
  *   = household color dot (10x10 rounded)
  v   = ChevronDown icon (16x16)
  4 items = item count badge
```

### Wireframe 2: Expanded State (Smith Family Open)

```
+--------------------------------------------------+
|  Per Household                                    |
+--------------------------------------------------+
|  * Smith Family                    4 items   ^    |
+--------------------------------------------------+
|  |  Milk                                         |
|  |  Qty: 2 . gallons                             |
|  |------------------------------------------------|
|  |  Eggs                                         |
|  |  Qty: 12 . pcs                                |
|  |------------------------------------------------|
|  |  Butter                                       |
|  |  Qty: 1 . block                               |
|  |------------------------------------------------|
|  |  Bread                                        |
|  |  Qty: 3 . loaves                              |
+--------------------------------------------------+
|  * Jones Family                    3 items   v    |
+--------------------------------------------------+

Legend:
  ^   = ChevronUp icon (16x16)
  |   = 4px left color bar (household color)
  .   = middle dot separator (U+00B7)
```

---

## 5. Screen States

| ID  | State                          | Description                                                                                                    |
|-----|--------------------------------|----------------------------------------------------------------------------------------------------------------|
| S-1 | All sections collapsed         | Default state on page load. Every household row shows color dot, name, item count, and ChevronDown.            |
| S-2 | One section expanded           | One household's item list is visible below its row. All other rows remain collapsed.                           |
| S-3 | Multiple sections expanded     | Two or more household sections are open simultaneously. Each operates independently.                           |
| S-4 | Single household in trip       | Only one household contributed items to this trip. One collapsible row is rendered. Accordion still functional. |
| S-5 | Empty trip (no items)          | No purchased items exist. The existing empty state ("No items were purchased in this trip.") is unchanged.     |
| S-6 | Household with single item     | Expanded section shows exactly one item row. No bottom border on the single item (last-item rule).             |
| S-7 | Household with many items (10+)| All items render in a flat list. No virtualization, pagination, or "show more" is applied for the pilot.        |

---

## 6. Item Row Rendering Spec

Each item row inside an expanded household section follows this specification:

```
+--+------------------------------------------+
|  |  Item Name                               |
|CB|  Qty: {qty} . {unit}                     |
|  |                                          |
+--+------------------------------------------+

CB = 4px Color Bar (full height, household color)
```

| Property        | Value                                    | Tailwind / CSS                                      |
|-----------------|------------------------------------------|------------------------------------------------------|
| Color bar       | 4px wide, full row height                | `w-1 absolute left-0 top-0 bottom-0`                |
| Color bar color | Household's assigned color               | `style={{ backgroundColor: hg.householdColor }}`    |
| Item name       | 15px, font-semibold, #202020 (gray-12)   | `text-[15px] font-semibold text-[#202020]`           |
| Meta line       | "Qty: {qty} . {unit}" format             | Rendered as string with middle dot separator          |
| Meta font       | 11px, font-normal, #8e8c99 (mauve-9)    | `text-[11px] text-[#8e8c99]`                        |
| Min height      | 44px (touch target compliance)           | `min-h-[44px]`                                       |
| Padding left    | 12px (after color bar)                   | `pl-3` (applied to content container)                |
| Padding right   | 16px                                     | `pr-4`                                               |
| Padding vertical| 8px top and bottom                       | `py-2`                                               |
| Bottom border   | 1px solid #eff1ef (olive-3)              | `border-b border-[#eff1ef]`                          |
| Last item       | No bottom border                         | `last:border-b-0`                                    |
| Text overflow   | Single line, ellipsis                    | `truncate`                                           |
| Position        | Relative (for absolute color bar)        | `relative`                                           |

**Meta line rendering rules:**

- If `qty > 0` and `unit` is non-empty: display `"Qty: {qty} . {unit}"`
- If `qty > 0` and `unit` is empty: display `"Qty: {qty}"`
- If `qty === 0`: omit the meta line entirely (show name only)

---

## 7. Edge Cases

| ID  | Scenario                                 | Behavior                                                                                                                                  |
|-----|------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| E-1 | Household left group after trip          | The existing `householdMap.get(hId)` lookup returns `undefined`. The code already falls back to `"Unknown Household"` with gray color `#9ca3af`. No change needed. |
| E-2 | Item with `qty === 0`                    | Show item name only. Omit the meta line entirely. Do not render "Qty: 0".                                                                 |
| E-3 | Item with empty `unit` string            | Show `"Qty: {qty}"` without the middle dot or unit suffix.                                                                                |
| E-4 | Item with very long name                 | Truncate with CSS ellipsis (`truncate` class). Single line only. Full name is not shown on tap or hover for the pilot.                     |
| E-5 | Trip with 50+ items in one household     | Render all items in a flat list. No pagination, virtualization, or "show more" truncation. Acceptable for pilot scale (small groups).       |
| E-6 | Rapid expand/collapse tapping            | No debounce needed. React `useState` updates are synchronous within event handlers. State is always consistent.                            |
| E-7 | Offline viewing                          | Works without issue. Trip data is already loaded into component state from the Firestore cache. Expand/collapse is purely local state.      |
| E-8 | Deep link directly to trip summary       | All sections start collapsed on mount (AC-7). The `useState` initializer is an empty `Set`, so no section is pre-expanded.                 |
| E-9 | Screen reader navigation                 | Sections behave as disclosure widgets per WAI-ARIA Authoring Practices. Each household row is a `<button>` with `aria-expanded`. The item list panel has a matching `id` referenced by `aria-controls`. |

---

## 8. Out of Scope

| ID   | Item                                         | Rationale                                                                                      |
|------|----------------------------------------------|------------------------------------------------------------------------------------------------|
| OS-1 | Cost splitting or monetary breakdown         | FamilyCart is for physical item distribution, not financial splitting. Deferred to post-pilot.  |
| OS-2 | Per-item pricing                             | No price data exists in `PurchasedItemSnapshot`. Out of scope for MVP.                         |
| OS-3 | Export or share trip details                 | No export infrastructure exists. Not a pilot priority.                                         |
| OS-4 | Print-friendly layout                        | PWA print optimization is deferred. Users can screenshot if needed.                            |
| OS-5 | Drag-and-drop reordering of items            | Items are displayed in insertion order. Reordering adds complexity with no validated need.      |
| OS-6 | Search or filter within expanded sections    | Pilot groups are small (2-4 households, <20 items/trip). Search is unnecessary at this scale.   |
| OS-7 | Item photos or thumbnails                    | No image data exists in the schema. Deferred to post-pilot.                                    |
| OS-8 | Persistent expand/collapse state across visits | State resets on each visit. Persistence adds complexity without clear user value for pilot.   |
| OS-9 | "Select all" or batch operations on items    | Trip summary is read-only. No batch actions are applicable.                                    |

---

## 9. Dependencies

This feature is intentionally zero-dependency on backend changes:

| Dependency Area     | Status           | Detail                                                                                                    |
|---------------------|------------------|-----------------------------------------------------------------------------------------------------------|
| Schema changes      | **Zero**         | `PurchasedItemSnapshot` already contains `name`, `qty`, `unit`, and `householdId`. No fields to add.       |
| New Firestore reads | **Zero**         | `householdGroups` is already computed in an existing `useMemo` inside `TripSummaryPage.tsx` (lines 74-94). Expand/collapse is purely local state. |
| New npm dependencies| **Zero**         | `ChevronDown` and `ChevronUp` are available from `lucide-react`, which is already installed and used throughout the project. |
| Files to modify     | **One**          | `src/pages/TripSummaryPage.tsx` — add expand/collapse state, chevron icons, and item list rendering.       |
| Test files          | **One**          | `src/__tests__/trip-summary.test.tsx` — add test cases for the new expand/collapse behavior.               |

---

## 10. Design Token Reference Table

| Element              | Token / Value                  | Source                          |
|----------------------|--------------------------------|---------------------------------|
| Color bar width      | 4px (`w-1`)                    | DESIGN_SYSTEM.md 4.3 Item Row  |
| Color bar color      | `hg.householdColor` (dynamic)  | Per-household assignment         |
| Item name font size  | 15px (`text-[15px]`)           | Typography 2.2 — Body           |
| Item name weight     | 600 / semibold (`font-semibold`)| Typography 2.3                  |
| Item name color      | #202020 (`text-[#202020]`)     | Neutral 1.5 — gray-12           |
| Meta line font size  | 11px (`text-[11px]`)           | Typography 2.2 — Overline       |
| Meta line color      | #8e8c99 (`text-[#8e8c99]`)     | Neutral 1.5 — mauve-9           |
| Chevron icon size    | 16x16 (`h-4 w-4`)             | Consistent with existing icons  |
| Chevron color        | #82827c (`text-[#82827c]`)     | Neutral 1.5 — sand-10           |
| Row min height       | 44px (`min-h-[44px]`)         | Interactions 5.1 — tap target   |
| Row padding left     | 12px (`pl-3`) after color bar  | Spacing 3.1 — md                |
| Row padding right    | 16px (`pr-4`)                  | Spacing 3.2 — base              |
| Row padding vertical | 8px (`py-2`)                   | Spacing 3.1 — sm                |
| Row bottom border    | 1px #eff1ef (`border-[#eff1ef]`)| Neutral 1.5 — olive-3          |
| Transition duration  | 200ms                          | Interactions 5.3                 |
| Transition easing    | ease-in-out                    | Interactions 5.3                 |
| Household dot size   | 10x10 (`h-2.5 w-2.5`)         | Existing TripSummaryPage L198   |
| Card border          | 1px #f0f0f0 (`border-[#f0f0f0]`)| Existing TripSummaryPage L169  |
| Fallback HH color    | #9ca3af                        | Existing code L90 — gray        |

---

## 11. Rollout Plan and Risks

### Rollout Plan

Ship directly, no feature flag. Rationale:

- The change is purely additive UI on a read-only page.
- No data writes are involved; expand/collapse is local state only.
- No schema migration, no new API calls, no backend deployment.
- Rollback is a single-file revert of `TripSummaryPage.tsx`.

### Risks

| #  | Risk                                              | Likelihood | Impact | Mitigation                                                                                              |
|----|---------------------------------------------------|------------|--------|---------------------------------------------------------------------------------------------------------|
| R-1| Large item lists in a single household cause scroll jank | Low        | Low    | Pilot groups are small (2-4 households, <20 items per trip). No virtualization needed. Monitor if groups scale beyond pilot. |
| R-2| Accessibility compliance for accordion pattern     | Medium     | Medium | Follow the WAI-ARIA disclosure widget pattern exactly: `<button aria-expanded>` + `<div id>` with `aria-controls`. Test with VoiceOver and TalkBack before release. |
| R-3| Design drift from wireframes during implementation | Low        | Low    | All visual values reference existing design tokens from DESIGN_SYSTEM.md. No new colors, fonts, or spacings are introduced. |

---

## Appendix A: Data Flow Diagram

```
+---------------------------+
|  Firestore                |
|  /groups/{gId}/trips/{tId}|
|  {                        |
|    purchasedItems: [      |
|      { name, qty, unit,   |
|        householdId }      |
|    ]                      |
|  }                        |
+-----------+---------------+
            |
            | onSnapshot (real-time)
            v
+-----------+---------------+
|  useTripHistory hook      |
|  (src/hooks/useTripHistory)|
|  Returns: Trip[]          |
+-----------+---------------+
            |
            | trips.find(t => t.id === tripId)
            v
+-----------+---------------+
|  TripSummaryPage          |
|  trip.purchasedItems      |
+-----------+---------------+
            |
            | useMemo grouping
            v
+-----------+---------------+
|  householdGroups[]        |
|  [{                       |
|    householdId,           |
|    householdName,         |
|    householdColor,        |
|    items: [...]           |  <-- DATA ALREADY HERE
|  }]                       |
+-----------+---------------+
            |
            | Existing: count-only rows (lines 186-216)
            | NEW: expandable item list (local state toggle)
            v
+-----------+---------------+
|  UI Render                |
|                           |
|  [Household Row]     <-- existing, now clickable
|    v/^ chevron       <-- NEW
|  [Item List]         <-- NEW (conditionally rendered)
|    [Item Row]        <-- NEW
|    [Item Row]        <-- NEW
|    ...                    |
+---------------------------+

No new Firestore reads.
No new hooks.
No new data fetching.
```

---

## Appendix B: Test Coverage Plan

All tests are added to the existing test file `src/__tests__/trip-summary.test.tsx` under a new `describe` block: `"US-12a: Per-Household Item Breakdown"`.

| #  | Test Scenario                                     | Asserts                                                                                     |
|----|---------------------------------------------------|---------------------------------------------------------------------------------------------|
| T-1| Renders all sections collapsed by default          | All ChevronDown icons present. No item names visible. Item counts visible.                  |
| T-2| Expands section on click, shows items              | Click household row. ChevronUp appears. Item names from that household are rendered.         |
| T-3| Collapses section on second click                  | Click expanded row again. ChevronDown returns. Item names disappear from DOM.                |
| T-4| Multiple sections can be open simultaneously       | Click two different household rows. Both item lists are visible in the DOM.                   |
| T-5| Shows correct item count in both states             | Item count badge (e.g., "4 items") is present whether section is collapsed or expanded.      |
| T-6| Displays item name and meta line correctly         | Expanded section shows item name in expected format. Meta line shows "Qty: {n} . {unit}".    |
| T-7| Shows color bar with household color               | Item row container has a child element with `backgroundColor` matching `hg.householdColor`.  |
| T-8| Handles unknown household gracefully               | Trip with a `householdId` not in the households list renders "Unknown Household" with #9ca3af.|
| T-9| Shows chevron rotation                             | Collapsed row has ChevronDown icon. Expanded row has ChevronUp icon (or rotated ChevronDown).|
| T-10| Aria attributes are correct                       | Household button has `aria-expanded="false"` when collapsed, `"true"` when expanded. Panel has matching `id` and `aria-controls`. |

---

*FamilyCart -- US-12a Per-Household Item Breakdown -- PRD v1.0*
*Date: 2026-02-23*
