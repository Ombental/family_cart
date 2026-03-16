# Department Categorization

## Context
Items in FamilyCart have no organizational grouping beyond household attribution. Users want to categorize items by grocery store department so that during shopping, the list can be sorted by department (matching the store's physical layout). Departments are user-defined (not a fixed list), scoped per group, with combobox autocomplete from previously-used values.

---

## User Stories

### US-DC-01: Add department when creating an item
**As a** household member,
**I want** to assign a department to an item when adding it to the list,
**so that** items can later be organized by store section during shopping.

**Acceptance Criteria:**
- [ ] AddItemForm shows a "Department" combobox field between the Qty/Unit row and Notes
- [ ] The combobox suggests previously-used departments from the current group's items
- [ ] User can type a new department name (free text) or pick from suggestions
- [ ] Department is optional — submitting without one stores `""` (uncategorized)
- [ ] When selecting an item from the item name suggestions, department auto-fills from that item's history
- [ ] Department value is persisted to Firestore on the item document

### US-DC-02: Edit department on an existing item
**As a** household member,
**I want** to change the department of an existing item,
**so that** I can correct or add a department after the fact.

**Acceptance Criteria:**
- [ ] EditItemForm includes a department combobox pre-filled with the item's current department
- [ ] Same autocomplete behavior as AddItemForm
- [ ] Updated department is saved to Firestore

### US-DC-03: Sort shopper list by department
**As a** shopper,
**I want** to toggle between alphabetical and department-based sorting in Shopper Mode,
**so that** I can walk the store aisle-by-aisle efficiently.

**Acceptance Criteria:**
- [ ] ShopperModePage shows a sort toggle (A-Z vs By Department)
- [ ] "A-Z" mode: current behavior (alphabetical by product name)
- [ ] "By Department" mode: groups sorted by department name alphabetically, then by product name within each department
- [ ] Department section headers appear between groups of different departments
- [ ] Uncategorized items (empty department) appear at the end under an "Uncategorized" header
- [ ] Sort preference persists in localStorage across sessions
- [ ] Both "Still Needed" and "In Basket" sections respect the selected sort order

### US-DC-04: Department catalog grows organically
**As a** group member,
**I want** the department suggestions to grow from actual usage,
**so that** I don't have to configure departments upfront and the list reflects my group's vocabulary.

**Acceptance Criteria:**
- [ ] New groups start with zero department suggestions
- [ ] Each unique department string used on any item in the group appears as a suggestion
- [ ] Suggestions are sorted alphabetically
- [ ] Department auto-fills when selecting a known item from the item catalog

### US-DC-05: Backward compatibility
**As a** user with existing items,
**I want** existing items to work seamlessly without a department,
**so that** nothing breaks when this feature rolls out.

**Acceptance Criteria:**
- [ ] Existing Firestore items without a `department` field read as `""` (uncategorized)
- [ ] No data migration required
- [ ] Uncategorized items display normally in all views
- [ ] Trip completion snapshots include department (defaulting to `""`)

---

## Sprint Plan

### Sprint 9: Department Categorization (est. 34 SP)

| # | Story | Task Summary | SP | Depends On |
|---|-------|-------------|-----|------------|
| 1 | US-DC-05 | Types: add `department` to Item, ItemGroup, PurchasedItemSnapshot | 2 | — |
| 2 | US-DC-05 | i18n: add all department-related translation keys (EN + HE) | 2 | — |
| 3 | US-DC-05 | Firestore items: add department to addItem, updateItem, subscribeToItems | 3 | #1 |
| 4 | US-DC-05 | Firestore trips: add department to completeTrip snapshot | 2 | #1 |
| 5 | US-DC-04 | Hook: create `useDepartmentCatalog` (extracts unique departments from items) | 3 | #1 |
| 6 | US-DC-04 | Hook: update `useItemCatalog` to include department in suggestions | 3 | #1 |
| 7 | US-DC-01 | Component: create `DepartmentCombobox` (same pattern as ItemCombobox) | 5 | #2 |
| 8 | US-DC-01 | AddItemForm: integrate DepartmentCombobox + auto-fill from item suggestions | 5 | #3, #5, #6, #7 |
| 9 | US-DC-02 | EditItemForm: integrate DepartmentCombobox + wire to updateItem | 3 | #3, #5, #7 |
| 10 | US-DC-03 | Hook: update `useGroupedItems` with sortBy parameter + department sorting | 3 | #1 |
| 11 | US-DC-03 | ShopperModePage: sort toggle UI + department section headers | 5 | #2, #10 |
| 12 | ALL | Tests: update factories, add new tests, update existing | 5 | #1–#11 |
| 13 | ALL | Verify: lint + test + build pass | — | #12 |

**Parallel lanes:**
- Lane A: #1 + #2 (no deps, in parallel)
- Lane B: #3 + #4 + #5 + #6 + #10 (all depend only on #1, parallel after #1)
- Lane C: #7 (depends only on #2)
- Lane D: #8 + #9 + #11 (depend on B+C, parallel with each other)
- Lane E: #12 → #13 (sequential, after all)

---

## Tasks

### Task 1: Types — Add `department` field (2 SP) `[no deps]`
**Files:** `src/types/item.ts`, `src/types/item-group.ts`, `src/types/trip.ts`
- Add `department: string` to `Item` interface
- Add `department: string` to `ItemGroup` interface
- Add `department: string` to `PurchasedItemSnapshot` (if it exists in trip types)

### Task 2: i18n — Add translation keys (2 SP) `[no deps]`
**File:** `src/i18n/translations.ts`
- EN: `items.department`, `items.departmentPlaceholder`, `items.uncategorized`, `items.createDepartment`, `shopper.sortAlphabetical`, `shopper.sortDepartment`
- HE: Hebrew equivalents for all keys

### Task 3: Firestore items — department in CRUD (3 SP) `[blocks: #8, #9] [depends: #1]`
**File:** `src/lib/firestore-items.ts`
- Add `department: string` to `AddItemParams` (default `""`)
- Write `department` in `addDoc` call
- Add optional `department?: string` to update params, include in update payload
- Map `department: data.department ?? ""` in `subscribeToItems`

### Task 4: Firestore trips — department in snapshots (2 SP) `[depends: #1]`
**File:** `src/lib/firestore-trips.ts`
- Include `department: item.department ?? ""` in purchased item snapshots during `completeTrip`

### Task 5: Hook — `useDepartmentCatalog` (3 SP) `[blocks: #8, #9] [depends: #1]`
**File:** `src/hooks/useDepartmentCatalog.ts` (new)
- Input: items array from `useItems`
- Extract unique non-empty `department` strings
- Return sorted `string[]` (alphabetical)
- Memoized with `useMemo`

### Task 6: Hook — Update `useItemCatalog` (3 SP) `[blocks: #8] [depends: #1]`
**File:** `src/hooks/useItemCatalog.ts`
- Add `department: string` to `ItemSuggestion` interface
- Extract department from items when building catalog entries
- Return department in mapped suggestions

### Task 7: Component — `DepartmentCombobox` (5 SP) `[blocks: #8, #9] [depends: #2]`
**File:** `src/components/list/DepartmentCombobox.tsx` (new)
- Props: `suggestions: string[]`, `value: string`, `onChange: (v: string) => void`, `placeholder?`, `disabled?`, `className?`, `id?`
- Same Radix Popover pattern as `ItemCombobox`
- Filter suggestions by typed text
- Show "Create" row for new departments (Plus icon)
- Keyboard navigation (arrow keys, enter, escape)

### Task 8: AddItemForm — Department field (5 SP) `[depends: #3, #5, #6, #7]`
**File:** `src/components/list/AddItemForm.tsx`
- Add `department` state (default `""`)
- Place `DepartmentCombobox` between Qty/Unit row and Notes
- Wire `useDepartmentCatalog` for suggestions
- On item suggestion select: auto-fill `department` from `suggestion.department`
- On submit: pass `department` to addItem
- Reset department after submit
- Update `onAdd` callback signature to include `department`

### Task 9: EditItemForm — Department field (3 SP) `[depends: #3, #5, #7]`
**Files:** `src/components/list/EditItemForm.tsx`, `src/components/list/GroceryList.tsx`
- Add `department` prop and include in `onSave` output
- Add `DepartmentCombobox` to the form layout
- Wire department catalog suggestions
- Update GroceryList callers to pass `item.department` and handle it in save

### Task 10: Hook — `useGroupedItems` department sorting (3 SP) `[blocks: #11] [depends: #1]`
**File:** `src/hooks/useGroupedItems.ts`
- Add `sortBy: "alphabetical" | "department"` parameter (default `"alphabetical"`)
- Derive `department` for each ItemGroup from earliest item
- When `sortBy === "department"`: sort by department alpha (empty last), then canonicalName within department

### Task 11: ShopperModePage — Sort toggle + headers (5 SP) `[depends: #2, #10]`
**File:** `src/pages/ShopperModePage.tsx`
- Add `sortBy` state persisted in `localStorage("shopper-sort")`
- Render segmented toggle: "A-Z" / "By Department"
- Pass `sortBy` to `useGroupedItems`
- When department sort active: insert section headers via flatMap detecting department transitions
- Uncategorized items grouped under `t("items.uncategorized")` header, rendered last

### Task 12: Tests (5 SP) `[depends: #1–#11]`
**Files:** all test files
- Update `buildItem` factories: add `department: ""`
- Test `useDepartmentCatalog`: unique extraction, alphabetical sort, handles empty
- Test `useGroupedItems` with `sortBy: "department"`: correct ordering, empty-last
- Test AddItemForm: department combobox renders, auto-fill works, value in onAdd
- Test EditItemForm: pre-filled department, included in onSave
- Update existing shopper-mode tests: add department to mock items

### Task 13: Verify `[depends: #12]`
- `npm run lint` — zero errors
- `npm test` — all pass
- `npm run build` — clean

---

## Critical Files Reference
| File | Change |
|------|--------|
| `src/types/item.ts` | Add `department: string` |
| `src/types/item-group.ts` | Add `department: string` |
| `src/lib/firestore-items.ts` | CRUD + subscribe mapping |
| `src/lib/firestore-trips.ts` | Snapshot department |
| `src/hooks/useDepartmentCatalog.ts` | New hook |
| `src/hooks/useItemCatalog.ts` | Add department to suggestions |
| `src/hooks/useGroupedItems.ts` | sortBy param + department sort |
| `src/components/list/DepartmentCombobox.tsx` | New component |
| `src/components/list/AddItemForm.tsx` | Department combobox + auto-fill |
| `src/components/list/EditItemForm.tsx` | Department combobox |
| `src/components/list/GroceryList.tsx` | Pass department to edit form |
| `src/pages/ShopperModePage.tsx` | Sort toggle + section headers |
| `src/i18n/translations.ts` | New keys (EN + HE) |
| `src/components/list/ItemCombobox.tsx` | Reference pattern (no changes) |

## Migration
Zero-migration: existing docs without `department` read as `""`. No backfill needed.
