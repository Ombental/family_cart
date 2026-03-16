# Trip Completion Metadata — User Stories

> **Feature:** Store selection & payment amount on trip completion
> **Status:** Stage 4 — Tasks (ready for build)

---

## US-1: Complete Trip with Store & Amount

**As a** shopper completing a trip,
**I want to** select which store I shopped at and enter the total amount paid,
**so that** my household can track where groceries were bought and how much was spent.

### Acceptance Criteria

- [ ] When the user taps "Complete Trip", a form appears **before** the trip is finalized
- [ ] Form contains a store selector (dropdown/combobox) and a numeric amount input
- [ ] Both fields are **required** — the trip cannot be completed without them
- [ ] The store selector shows previously saved stores for this group
- [ ] The user can add a new store name inline (type a name not in the list → option to save it)
- [ ] New stores are persisted to the group's store list for future use
- [ ] On submit, `storeName`, `totalAmount`, and `completedByUserId` are saved to the trip document
- [ ] After successful submission, the user is navigated to the trip summary page as before

---

## US-2: Saved Store List per Group

**As a** group member,
**I want** the app to remember stores I've shopped at before,
**so that** I can quickly select them on future trips without retyping.

### Acceptance Criteria

- [ ] Stores are stored as a subcollection or field on the group document
- [ ] Each store has at minimum: `id`, `name`, `createdAt`
- [ ] Stores are scoped per group (not global, not per user)
- [ ] Duplicate store names within a group are prevented
- [ ] The store list is ordered alphabetically in the selector

---

## US-3: Display Store & Amount in Trip History List

**As a** group member viewing trip history,
**I want to** see the store name and total amount for each trip,
**so that** I can quickly scan spending history without opening each trip.

### Acceptance Criteria

- [ ] Each trip card in the history list shows the store name (e.g. "Rami Levy")
- [ ] Each trip card shows the total amount (e.g. "₪ 342.50" or just "342.50")
- [ ] If a trip was completed before this feature (no store/amount data), it displays gracefully without errors
- [ ] Layout remains clean and scannable with the additional info

---

## US-4: Display Store & Amount in Trip Summary

**As a** group member viewing a completed trip's details,
**I want to** see the store name and total amount prominently,
**so that** I have full context about that shopping trip.

### Acceptance Criteria

- [ ] Trip summary page shows the store name near the date/shopper info
- [ ] Trip summary page shows the total amount paid
- [ ] Information is displayed in the summary card area, visually consistent with existing design

---

## US-5: Edit Trip Store & Amount (Owner Only)

**As the** user who completed a trip,
**I want to** edit the store name and total amount after completion,
**so that** I can correct mistakes without redoing the trip.

### Acceptance Criteria

- [ ] An edit button/icon is visible on the trip summary page **only** to the user who completed the trip
- [ ] Tapping edit opens the same form (store selector + amount input), pre-filled with current values
- [ ] On save, the trip document is updated with the new values
- [ ] Other users see the updated values in real-time but cannot access the edit action
- [ ] The `completedByUserId` field is used to gate edit permission (client-side for pilot)

---

# Sprint Plan

> **Sprint 9: Trip Completion Metadata** — 27 SP

## Phase 1: Data Layer (8 SP)

| # | Task | Story | Size | Depends On | SP |
|---|------|-------|------|------------|----|
| T1 | Add `storeName`, `totalAmount`, `completedByUserId` to `Trip` type | US-1 | S | — | 1 |
| T2 | Create `Store` type (`id`, `name`, `createdAt`) | US-2 | S | — | 1 |
| T3 | Implement store CRUD in `firestore-stores.ts`: `addStore`, `subscribeToStores` with duplicate prevention | US-2 | M | T2 | 3 |
| T4 | Update `completeTrip()` to accept & persist `storeName`, `totalAmount`, `completedByUserId` | US-1 | S | T1 | 2 |
| T5 | Add `updateTripMetadata()` function for editing store/amount post-completion | US-5 | S | T1 | 1 |

## Phase 2: Completion Form UI (8 SP)

| # | Task | Story | Size | Depends On | SP |
|---|------|-------|------|------------|----|
| T6 | Create `useStores(groupId)` hook wrapping `subscribeToStores` | US-2 | S | T3 | 1 |
| T7 | Build `TripCompletionForm` component: store combobox (select existing / add new) + amount input, both required | US-1, US-2 | M | T4, T6 | 5 |
| T8 | Integrate `TripCompletionForm` into `ShopperModePage` — show form on "Complete Trip" tap, submit calls updated `completeTrip()` | US-1 | S | T7 | 2 |

## Phase 3: Display (6 SP)

| # | Task | Story | Size | Depends On | SP |
|---|------|-------|------|------------|----|
| T9 | Update `TripHistoryPage` cards to show store name + total amount (graceful fallback for old trips) | US-3 | M | T1 | 3 |
| T10 | Update `TripSummaryPage` to display store name + total amount in the summary header area | US-4 | M | T1 | 3 |

## Phase 4: Edit Capability (5 SP)

| # | Task | Story | Size | Depends On | SP |
|---|------|-------|------|------------|----|
| T11 | Add edit button to `TripSummaryPage` (visible only when `currentUserId === completedByUserId`) | US-5 | S | T5, T10 | 2 |
| T12 | Wire edit button to `TripCompletionForm` in edit mode (pre-filled values), call `updateTripMetadata()` on save | US-5 | M | T7, T11 | 3 |

## Dependency Graph

```
T1 ──┬── T4 ──┬── T7 ── T8
     │        │    ↑
     │        │    │
     ├── T5 ──│────│── T11 ── T12
     │        │    │          ↑
     ├── T9   │    │          │
     │        │    │          │
     └── T10 ─│────│──────────┘
              │    │
T2 ── T3 ── T6 ───┘
```

## Execution Order (parallelism)

| Wave | Tasks | Notes |
|------|-------|-------|
| 1 | T1, T2 | Types only, no dependencies |
| 2 | T3, T4, T5 | All depend on types from wave 1 |
| 3 | T6, T9, T10 | Hook + both display updates in parallel |
| 4 | T7 | Completion form (needs T4 + T6) |
| 5 | T8, T11 | Integration + edit button in parallel |
| 6 | T12 | Edit mode wiring (needs T7 + T11) |

## Verification Gate

All tasks must pass before marking the sprint complete:
- `npm run lint` — zero errors
- `npm test` — all existing tests pass, new tests for store CRUD + completion flow
- `npm run build` — clean production build

---

# Task Breakdown

## T1: Add new fields to `Trip` type (1 SP)

**File:** `src/types/trip.ts`

Add three optional fields to the `Trip` interface (optional for backward-compat with pre-existing trip docs):

```ts
storeName?: string;
totalAmount?: number;
completedByUserId?: string;
```

**Done when:** Type compiles, no existing code breaks.

---

## T2: Create `Store` type (1 SP)

**File:** `src/types/store.ts` (new)

```ts
export interface Store {
  id: string;
  name: string;
  createdAt: Timestamp;
}
```

**Done when:** Type file exists and is importable.

---

## T3: Implement store CRUD in `firestore-stores.ts` (3 SP)

**File:** `src/lib/firestore-stores.ts` (new)

**Firestore path:** `/groups/{groupId}/stores/{storeId}`

**Functions:**

1. `addStore(groupId: string, name: string): Promise<string>`
   - Trim + normalize name
   - Query existing stores for case-insensitive duplicate check (query all, compare `.toLowerCase()` client-side — store count is small)
   - If duplicate found, return existing store's ID (no error)
   - Otherwise `addDoc` with `{ name, createdAt: serverTimestamp() }`
   - Return new doc ID

2. `subscribeToStores(groupId: string, onChange: (stores: Store[]) => void): Unsubscribe`
   - Real-time listener on `/groups/{groupId}/stores`
   - `orderBy("name", "asc")` for alphabetical order
   - Map docs to `Store[]` and call `onChange`

**Known limitation (offline):** The duplicate-check in `addStore` queries Firestore and won't work reliably offline. If the user adds a store while offline, IndexedDB persistence will queue the write, but a duplicate may be created if the same name was added on another device. This is acceptable at pilot scale — duplicates are harmless and can be cleaned up later.

**Done when:** Both functions work, duplicate names return existing ID.

---

## T4: Update `completeTrip()` to accept metadata (2 SP)

**Files:** `src/lib/firestore-trips.ts`, `src/hooks/useTrip.ts`, `src/__tests__/firestore-trips.test.ts`

**Changes:**

### Step 1 — `src/lib/firestore-trips.ts`

1. Extend `CompleteTripParams`:
   ```ts
   export interface CompleteTripParams {
     groupId: string;
     tripId: string;
     storeName: string;
     totalAmount: number;
     completedByUserId: string;
   }
   ```

2. In `completeTrip()`, add the three new fields to the `batch.update` call (line ~183):
   ```ts
   batch.update(tripRef, {
     status: "complete",
     completedAt: serverTimestamp(),
     purchasedItems,
     storeName,
     totalAmount,
     completedByUserId,
   });
   ```

3. Update all snapshot deserializers (`subscribeToActiveTrip`, `subscribeToCompletedTrips`, `createTrip` conflict path) to read the three new fields from Firestore docs:
   ```ts
   storeName: data.storeName ?? undefined,
   totalAmount: data.totalAmount ?? undefined,
   completedByUserId: data.completedByUserId ?? undefined,
   ```

### Step 2 — `src/hooks/useTrip.ts`

4. The `completeTrip` callback must now accept `{ storeName, totalAmount, completedByUserId }` and pass them through to `firestoreCompleteTrip`. Update `UseTripResult.completeTrip` signature:
   ```ts
   completeTrip: (metadata: { storeName: string; totalAmount: number; completedByUserId: string }) => Promise<void>;
   ```

### Step 3 — `src/__tests__/firestore-trips.test.ts`

5. Update all 3 existing `completeTrip()` call sites in the test file to include the new required params:
   ```ts
   await completeTrip({
     groupId: "group-abc",
     tripId: "trip-123",
     storeName: "Test Store",
     totalAmount: 100,
     completedByUserId: "user-1",
   });
   ```

6. Add assertion that the new fields are written to the trip doc in the batch update.

**Done when:** `completeTrip` persists all three fields. Hook signature updated. All existing tests pass with updated call sites.

---

## T5: Add `updateTripMetadata()` function (1 SP)

**File:** `src/lib/firestore-trips.ts`

**New function:**

```ts
export interface UpdateTripMetadataParams {
  groupId: string;
  tripId: string;
  storeName: string;
  totalAmount: number;
}

export async function updateTripMetadata(params: UpdateTripMetadataParams): Promise<void> {
  const { groupId, tripId, storeName, totalAmount } = params;
  const tripRef = doc(db, "groups", groupId, "trips", tripId);
  await updateDoc(tripRef, { storeName, totalAmount });
}
```

Add `updateDoc` to the Firestore imports.

**Done when:** Function exists, compiles, updates only `storeName` and `totalAmount` (not `completedByUserId`).

---

## T6: Create `useStores(groupId)` hook (1 SP)

**File:** `src/hooks/useStores.ts` (new)

**Pattern:** Follow `useTripHistory` hook pattern.

```ts
export interface UseStoresResult {
  stores: Store[];
  loading: boolean;
  addStore: (name: string) => Promise<string>;
}
```

- Subscribe via `subscribeToStores` on mount
- Expose `addStore` callback wrapping `firestoreAddStore`
- Cleanup on unmount

**Done when:** Hook returns real-time store list + addStore function.

---

## T7: Build `TripCompletionForm` component (5 SP)

**File:** `src/components/shopper/TripCompletionForm.tsx` (new)

**Props:**

```ts
interface TripCompletionFormProps {
  stores: Store[];
  onAddStore: (name: string) => Promise<string>;
  initialStoreName?: string;
  initialAmount?: number;
  onSubmit: (data: { storeName: string; totalAmount: number }) => void;
  onCancel: () => void;
  submitting?: boolean;
  mode?: "complete" | "edit"; // defaults to "complete"
}
```

**UI (dialog/bottom-sheet style):**

1. **Store combobox:**
   - Text input with dropdown of existing stores (alphabetical, from `stores` prop)
   - Typing filters the list
   - If typed value doesn't match any store, show "Add [typed name]" option
   - Selecting "Add" calls `onAddStore(name)` and selects it
   - Required — validation error if empty on submit

2. **Amount input:**
   - `<input type="number" inputMode="decimal" min="0" step="0.01">`
   - Required — validation error if empty or ≤ 0
   - Placeholder: "0.00"

3. **Buttons:**
   - Primary button (brown `#3e332e`) — label depends on `mode`: "Complete" when `mode === "complete"`, "Save" when `mode === "edit"`
   - "Cancel" (ghost) — calls `onCancel`
   - Primary button shows spinner when `submitting` is true

**Reuse:** This component is used for initial completion (T8, `mode="complete"`) and for editing (T12, `mode="edit"` with `initialStoreName` / `initialAmount` pre-filled).

**i18n file:** `src/i18n/translations.ts`

Add these keys under both `en` and `he`:
```ts
// en
"completion.store": "Store",
"completion.totalAmount": "Total amount",
"completion.addStore": "Add \"{{name}}\"",
"completion.complete": "Complete",
"completion.save": "Save",
"completion.cancel": "Cancel",
"completion.storeRequired": "Please select a store",
"completion.amountRequired": "Please enter the total amount",

// he
"completion.store": "חנות",
"completion.totalAmount": "סכום כולל",
"completion.addStore": "הוסף \"{{name}}\"",
"completion.complete": "סיום",
"completion.save": "שמירה",
"completion.cancel": "ביטול",
"completion.storeRequired": "נא לבחור חנות",
"completion.amountRequired": "נא להזין סכום",
```

**Done when:** Component renders, validates, calls onSubmit with valid data, calls onAddStore for new stores.

---

## T8: Integrate `TripCompletionForm` into `ShopperModePage` (2 SP)

**File:** `src/pages/ShopperModePage.tsx`

**Changes:**

1. Add state: `const [showCompletionForm, setShowCompletionForm] = useState(false);`
2. Use `useStores(groupId)` hook to get `stores`, `addStore`
3. Change "Complete Trip" button `onClick` from `handleCompleteTrip` to `() => setShowCompletionForm(true)`
4. When `showCompletionForm` is true, render `TripCompletionForm` as a dialog/overlay
5. `TripCompletionForm.onSubmit` calls the updated `completeTrip({ storeName, totalAmount, completedByUserId: user.id })` then navigates to trip summary
6. `TripCompletionForm.onCancel` sets `showCompletionForm` back to false

**Flow:** Tap "Complete Trip" → form appears → fill store + amount → tap "Complete" → trip completes → navigate to summary.

**Done when:** Full completion flow works end-to-end with store + amount required before trip finalizes.

---

## T9: Update `TripHistoryPage` to show store & amount (3 SP)

**File:** `src/pages/TripHistoryPage.tsx`

**Changes to `TripCard` component:**

1. Show store name (if present) as a primary label on the card, replacing or supplementing the date as the most prominent info:
   ```tsx
   {trip.storeName && (
     <span className="text-sm font-semibold text-[#1a1a1a]">{trip.storeName}</span>
   )}
   ```

2. Show total amount (if present) on the right side of the card:
   ```tsx
   {trip.totalAmount != null && (
     <span className="text-base font-bold text-[#1a1a1a]">{trip.totalAmount.toFixed(2)}</span>
   )}
   ```

3. Graceful fallback: old trips without `storeName`/`totalAmount` render exactly as before (no blank spots, no errors).

**i18n file:** `src/i18n/translations.ts` — no new keys needed (store name and amount are data, not labels).

**Done when:** Cards show store + amount for new trips, old trips unchanged, layout clean.

---

## T10: Update `TripSummaryPage` to show store & amount (3 SP)

**File:** `src/pages/TripSummaryPage.tsx`

**Changes:**

1. In the hero section (after date + shopper line ~177-179), add store name:
   ```tsx
   {trip.storeName && (
     <p className="text-sm font-medium text-[#1a1a1a]">{trip.storeName}</p>
   )}
   ```

2. In the summary card, add a row for total amount (between the "Items Purchased" count and the per-household breakdown):
   ```tsx
   {trip.totalAmount != null && (
     <div className="flex items-center justify-between">
       <span className="text-sm text-[#82827c]">{t("trips.totalAmount")}</span>
       <span className="text-lg font-bold text-[#1a1a1a]">{trip.totalAmount.toFixed(2)}</span>
     </div>
   )}
   ```

3. **i18n file:** `src/i18n/translations.ts` — add keys:
   ```ts
   // en
   "trips.totalAmount": "Total amount",
   "trips.storeName": "Store",

   // he
   "trips.totalAmount": "סכום כולל",
   "trips.storeName": "חנות",
   ```

4. Graceful fallback for old trips without these fields.

**Done when:** Summary page shows store + amount, old trips unaffected.

---

## T11: Add edit button to `TripSummaryPage` (owner only) (2 SP)

**File:** `src/pages/TripSummaryPage.tsx`

**Changes:**

1. Import `useAuth` and get `user` from it
2. Add an edit icon button (pencil icon from lucide) next to the store/amount info, visible only when:
   ```ts
   trip.completedByUserId && user?.id === trip.completedByUserId
   ```
3. Add state: `const [editing, setEditing] = useState(false);`
4. Edit button sets `editing` to `true`

**Done when:** Edit button visible only to trip completer, hidden for others and old trips. Clicking sets edit state.

---

## T12: Wire edit mode with `TripCompletionForm` (3 SP)

**File:** `src/pages/TripSummaryPage.tsx`

**Changes:**

1. Import `useStores`, `TripCompletionForm`, `updateTripMetadata`
2. Use `useStores(groupId)` to get stores + addStore
3. When `editing === true`, render `TripCompletionForm` as a dialog with:
   - `initialStoreName={trip.storeName}`
   - `initialAmount={trip.totalAmount}`
   - `onSubmit` calls `updateTripMetadata({ groupId, tripId, storeName, totalAmount })` then sets `editing` to false
   - `onCancel` sets `editing` to false
4. Add submitting state for loading indicator during save

**Done when:** Owner can edit store + amount, changes persist and display in real-time.
