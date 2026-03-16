# FamilyCart -- Sunny Path E2E Test Requirements

**Version:** 1.0
**Date:** February 24, 2026
**Audience:** QA Engineers implementing automated E2E tests (Playwright)
**Scope:** Full happy-path user journey from landing page through trip completion and summary review

---

## 1. Overview

This document specifies the sunny-path (happy path) end-to-end test for FamilyCart. The test exercises the full user journey across two browser contexts simulating two separate households that share a single grocery group. It covers:

1. **Household setup** -- both households identify themselves on the landing page
2. **Group creation** -- Household A creates a group and lands on the holding state
3. **Group join** -- Household B joins via invite code; group activates
4. **Adding items** -- both households add items to the shared list
5. **Attribution** -- items display their originating household
6. **Item edit and delete with undo** -- Household A edits and deletes its own items
7. **Shopper Mode activation** -- Household A starts a shopping trip
8. **Check-off** -- Household A checks off items during the trip
9. **Last-minute item** -- Household B adds an item mid-trip; it appears flagged in Shopper Mode
10. **Trip completion** -- Household A completes the trip and is redirected to the summary
11. **Trip summary review** -- both households view the trip summary with per-household grouping
12. **Unchecked item persistence** -- items not checked off remain on the list after trip completion

The test uses two independent browser contexts (separate localStorage, separate Firestore identity) to simulate the multi-household scenario without needing separate devices.

---

## 2. Pre-conditions / Test Setup

### 2.1 Environment

| Requirement | Detail |
|---|---|
| Firebase backend | Running against Firebase emulator suite **or** a dedicated test project. Firestore, Cloud Functions deployed. |
| App server | Vite dev server or preview build accessible at `BASE_URL` (e.g., `http://localhost:5173`) |
| Browser | Chromium (Playwright default). Two isolated `BrowserContext` instances: **ctxA** (Household A) and **ctxB** (Household B). |
| Env vars | Not required in E2E -- the app generates household identity via `crypto.randomUUID()` on first use and stores in localStorage. |

### 2.2 Seed Data

None required. The test starts from a clean state. If running against an emulator, clear Firestore before the test run.

### 2.3 Browser State

| Context | localStorage (before test) | IndexedDB |
|---|---|---|
| **ctxA** | Empty (no `familycart_household_id`, no `familycart_household_name`) | Empty |
| **ctxB** | Empty | Empty |

### 2.4 Test Constants

```typescript
const HOUSEHOLD_A_NAME = "Smith Family";
const HOUSEHOLD_B_NAME = "Johnson Family";
const GROUP_NAME       = "Sunday Shoppers";

const ITEMS_A = [
  { name: "Whole Milk",     qty: 2, unit: "litres" },
  { name: "Sourdough Bread", qty: 1, unit: "loaf"   },
  { name: "Free Range Eggs", qty: 1, unit: "dozen"  },
];

const ITEMS_B = [
  { name: "Olive Oil",  qty: 1, unit: "bottle" },
  { name: "Pasta",      qty: 2, unit: "packs"  },
];

const LAST_MINUTE_ITEM = { name: "Avocados", qty: 3, unit: "pieces" };
```

---

## 3. Test Steps

Each step specifies the **Actor** (which browser context), the **Action** to perform, the **Expected Result** visible in the UI, and any **Firestore Side-Effect** to assert if direct DB verification is desired.

### Phase 1 -- Household Setup

| # | Actor | Action | Expected Result | Firestore Side-Effect |
|---|---|---|---|---|
| 1.1 | ctxA | Navigate to `BASE_URL` (`/`) | Landing page renders. Heading: "Welcome to FamilyCart". Input field: "What's your household name?" is visible. "Create Group" and "Join Group" buttons are **not** visible yet. | None |
| 1.2 | ctxA | Type `HOUSEHOLD_A_NAME` into the household name input and submit (click arrow button or press Enter) | Loading spinner appears briefly. Then: "Create Group" and "Join Group" cards are visible. Heading still reads "Welcome to FamilyCart". | None (identity stored in localStorage only) |
| 1.3 | ctxB | Navigate to `BASE_URL` (`/`) | Same landing page as step 1.1. | None |
| 1.4 | ctxB | Type `HOUSEHOLD_B_NAME` into the household name input and submit | Same result as step 1.2 -- "Create Group" and "Join Group" options visible. | None |

### Phase 2 -- Group Creation (Household A)

| # | Actor | Action | Expected Result | Firestore Side-Effect |
|---|---|---|---|---|
| 2.1 | ctxA | Click "Create Group" button | Navigates to `/create`. Group creation form visible with a "Group name" input. | None |
| 2.2 | ctxA | Type `GROUP_NAME` into the group name input and submit | Navigates to `/group/{groupId}`. **Holding state** screen renders: amber banner with "Waiting for another household to join...", an invite code displayed prominently, and a locked list indicator ("Grocery list is locked"). | `/groups/{groupId}` document created with `name: GROUP_NAME`, `inviteCode` (6-char alphanumeric), `inviteExpiresAt` (now + 48h). `/groups/{groupId}/households/{householdAId}` created with `name: HOUSEHOLD_A_NAME`, `color` assigned. |
| 2.3 | ctxA | Copy the displayed invite code (read its text content into a test variable `INVITE_CODE`) | Invite code is a 6-character uppercase alphanumeric string. | None |

### Phase 3 -- Group Join (Household B)

| # | Actor | Action | Expected Result | Firestore Side-Effect |
|---|---|---|---|---|
| 3.1 | ctxB | Click "Join Group" button on the home page | Navigates to `/join`. Join form visible with an invite code input. | None |
| 3.2 | ctxB | Type `INVITE_CODE` into the invite code input and submit | Navigates to `/group/{groupId}`. **Active group view** renders (not holding state). Group name `GROUP_NAME` visible. "2 households" label visible. Grocery list card is visible (empty). "Start Shopping" button is visible. | `/groups/{groupId}/households/{householdBId}` created with `name: HOUSEHOLD_B_NAME`, `color` assigned (different from Household A). |
| 3.3 | ctxA | Observe the holding state page (no action needed -- real-time update via onSnapshot) | Holding state **automatically transitions** to active group view. Group name `GROUP_NAME` visible. "2 households" label. "Start Shopping" button appears. Grocery list card visible (empty). | None (reactive UI update) |

### Phase 4 -- Adding Items

| # | Actor | Action | Expected Result | Firestore Side-Effect |
|---|---|---|---|---|
| 4.1 | ctxA | Click the FAB (+) button to open the add item form | Bottom sheet / inline form appears with fields: name, quantity, unit. | None |
| 4.2 | ctxA | Add `ITEMS_A[0]` ("Whole Milk", qty 2, unit "litres") and submit | Item "Whole Milk" appears in the grocery list. Household label `HOUSEHOLD_A_NAME` visible on the item row (with color bar). Form remains open for multi-item entry. | `/groups/{groupId}/items/{itemId}` created: `name: "Whole Milk"`, `qty: 2`, `unit: "litres"`, `householdId: householdAId`, `status: "pending"`, `deleted: false`, `deletedAt: null`, `addedDuringTripId: null`, `createdAt` set. |
| 4.3 | ctxA | Add `ITEMS_A[1]` ("Sourdough Bread") and `ITEMS_A[2]` ("Free Range Eggs") in sequence | Both items appear in the list. List now shows 3 items total. | Two more item documents created with same structure. |
| 4.4 | ctxB | Observe the group page (real-time) | All 3 items from Household A are visible in Household B's list view. Each item shows `HOUSEHOLD_A_NAME` as the household label. | None |
| 4.5 | ctxB | Click the FAB (+) and add `ITEMS_B[0]` ("Olive Oil") and `ITEMS_B[1]` ("Pasta") | Both items appear in the list, tagged with `HOUSEHOLD_B_NAME`. Total items on list: 5. | Two item documents created with `householdId: householdBId`. |
| 4.6 | ctxA | Observe the group page (real-time) | Household B's 2 items appear in Household A's list view, tagged with `HOUSEHOLD_B_NAME`. Total: 5 items visible. | None |

### Phase 5 -- Attribution Verification (US-05)

| # | Actor | Action | Expected Result | Firestore Side-Effect |
|---|---|---|---|---|
| 5.1 | ctxA | Inspect each item row in the grocery list | Every item displays its household name inline (visible without tap/expand). Items from Household A show `HOUSEHOLD_A_NAME` with Household A's color. Items from Household B show `HOUSEHOLD_B_NAME` with Household B's color. The two colors are visually distinct. | None |
| 5.2 | ctxB | Same inspection | Same result -- all 5 items attributed correctly. | None |

### Phase 6 -- Edit and Delete with Undo (US-04)

| # | Actor | Action | Expected Result | Firestore Side-Effect |
|---|---|---|---|---|
| 6.1 | ctxA | Locate "Sourdough Bread" item. Open its action menu (three-dot or swipe). Click "Edit". | Inline edit form appears for "Sourdough Bread" with current values pre-filled. | None |
| 6.2 | ctxA | Change the name to "Rye Bread" and save | Item updates to show "Rye Bread" in both ctxA and ctxB (real-time). | Item document updated: `name: "Rye Bread"`. |
| 6.3 | ctxA | Locate "Free Range Eggs". Open its action menu. Click "Delete". | Item disappears from the list immediately. An undo toast appears: "Free Range Eggs removed" with an "Undo" button. Toast persists for 5 seconds. List now shows 4 items. | Item document updated: `deleted: true`, `deletedAt: <timestamp>`. |
| 6.4 | ctxB | Observe list (real-time) | "Free Range Eggs" disappears from Household B's view as well. 4 items visible. | None |
| 6.5 | ctxA | Click "Undo" on the toast within 5 seconds | "Free Range Eggs" reappears in the list. List back to 5 items. Toast dismisses. | Item document updated: `deleted: false`, `deletedAt: null`. |
| 6.6 | ctxB | Observe list (real-time) | "Free Range Eggs" reappears. 5 items visible. | None |
| 6.7 | ctxB | Attempt to open action menu on "Whole Milk" (owned by Household A) | Edit and Delete actions are **not available** (ownership enforcement). Only items owned by Household B show edit/delete controls. | None |

### Phase 7 -- Shopper Mode Activation (US-07)

| # | Actor | Action | Expected Result | Firestore Side-Effect |
|---|---|---|---|---|
| 7.1 | ctxA | Click "Start Shopping" button on the group page | Navigates to `/group/{groupId}/shopper`. **Shopper Mode** UI renders: blue header with "Shopper Mode" title, progress bar ("0 of 5 items checked"), all 5 items in "Still needed" section, "Complete Trip" button at the bottom. | `/groups/{groupId}/trips/{tripId}` created: `status: "active"`, `startedByHouseholdId: householdAId`, `startedByHouseholdName: HOUSEHOLD_A_NAME`, `startedAt: <timestamp>`, `completedAt: null`, `purchasedItems: []`. |
| 7.2 | ctxB | Observe the group page | Group page shows "Shopping in progress by Smith Family" status text. "Start Shopping" button still present (changes label contextually or remains). | None |

### Phase 8 -- Check Off Items (US-08)

| # | Actor | Action | Expected Result | Firestore Side-Effect |
|---|---|---|---|---|
| 8.1 | ctxA (Shopper Mode) | Tap on "Whole Milk" to check it off | "Whole Milk" moves to the "In basket" section. Progress bar updates to "1 of 5 items checked". Checkbox shows checked state. | Item document updated: `status: "bought"`. |
| 8.2 | ctxA (Shopper Mode) | Tap on "Olive Oil" to check it off | "Olive Oil" moves to "In basket". Progress: "2 of 5 items checked". | Item updated: `status: "bought"`. |
| 8.3 | ctxA (Shopper Mode) | Tap on "Rye Bread" to check it off | "Rye Bread" moves to "In basket". Progress: "3 of 5 items checked". | Item updated: `status: "bought"`. |
| 8.4 | ctxB | Observe the group page list | "Whole Milk", "Olive Oil", and "Rye Bread" appear with purchased styling (strikethrough/grey). Remaining: "Pasta" and "Free Range Eggs" shown as pending. | None |
| 8.5 | ctxA (Shopper Mode) | Tap on "Rye Bread" again to uncheck it | "Rye Bread" moves back to "Still needed" section. Progress: "2 of 5 items checked". | Item updated: `status: "pending"`. |
| 8.6 | ctxA (Shopper Mode) | Tap on "Rye Bread" again to re-check it | "Rye Bread" returns to "In basket". Progress: "3 of 5 items checked". | Item updated: `status: "bought"`. |

### Phase 9 -- Last-Minute Item During Active Trip (US-09, US-10)

| # | Actor | Action | Expected Result | Firestore Side-Effect |
|---|---|---|---|---|
| 9.1 | ctxB | On the group page, click FAB (+) and add `LAST_MINUTE_ITEM` ("Avocados", qty 3, unit "pieces") | "Avocados" appears in Household B's list view, tagged with `HOUSEHOLD_B_NAME`. Total items on list now 6. | Item created with `addedDuringTripId: <active tripId>`, `householdId: householdBId`, `status: "pending"`. |
| 9.2 | ctxA (Shopper Mode) | Observe the Shopper Mode view (real-time via onSnapshot) | "Avocados" appears in the "Still needed" section. It is visually flagged as **newly added** (since `addedDuringTripId === activeTripId`). Total items now 6. Progress: "3 of 6 items checked". | None |
| 9.3 | ctxA (Shopper Mode) | Tap the FAB (+) in Shopper Mode. Add an item: "Bananas", qty 1, unit "bunch" | "Bananas" appears in "Still needed", attributed to `HOUSEHOLD_A_NAME`, flagged as newly added. Progress: "3 of 7 items checked". | Item created with `addedDuringTripId: <active tripId>`, `householdId: householdAId`. |
| 9.4 | ctxA (Shopper Mode) | Check off "Avocados" and "Bananas" | Both move to "In basket". Progress: "5 of 7 items checked". | Both items updated: `status: "bought"`. |

### Phase 10 -- Trip Completion (US-11)

| # | Actor | Action | Expected Result | Firestore Side-Effect |
|---|---|---|---|---|
| 10.1 | ctxA (Shopper Mode) | Click "Complete Trip" button | Brief loading state ("Finishing..."). Then redirects to `/group/{groupId}/trip/{tripId}` -- the **Trip Summary** page. | Trip document updated: `status: "complete"`, `completedAt: <timestamp>`, `purchasedItems: [5 items -- Whole Milk, Olive Oil, Rye Bread, Avocados, Bananas]`. All 5 bought item documents are **hard-deleted** from the items subcollection. |
| 10.2 | ctxB | Navigate to or observe the group page | Group returns to standard list view. "Start Shopping" button is available again (no active trip). The list shows only the 2 **unchecked** items: "Pasta" and "Free Range Eggs". Purchased items are gone from the list. | Confirm: only 2 item documents remain in `/groups/{groupId}/items/` with `status: "pending"`. |

### Phase 11 -- Trip Summary (US-12)

| # | Actor | Action | Expected Result | Firestore Side-Effect |
|---|---|---|---|---|
| 11.1 | ctxA | On the Trip Summary page (redirected after completion) | Green header: "Trip Summary". Hero section: "Trip Complete!" with date and "by Smith Family". Summary card shows "Items purchased: 5". **Per Household** breakdown visible: `HOUSEHOLD_A_NAME` with item count, `HOUSEHOLD_B_NAME` with item count. | None |
| 11.2 | ctxA | Expand `HOUSEHOLD_A_NAME` in the per-household breakdown | Items listed: "Whole Milk" (qty 2, litres), "Rye Bread" (qty 1, loaf), "Bananas" (qty 1, bunch). Count: 3 items. | None |
| 11.3 | ctxA | Expand `HOUSEHOLD_B_NAME` in the per-household breakdown | Items listed: "Olive Oil" (qty 1, bottle), "Avocados" (qty 3, pieces). Count: 2 items. | None |
| 11.4 | ctxA | Click "Done" button | Navigates back to `/group/{groupId}` (active group view). | None |
| 11.5 | ctxB | Navigate to Trip History: click "Trip History" button on group page | Navigates to `/group/{groupId}/trips`. Completed trip entry is visible with date and item count. | None |
| 11.6 | ctxB | Click on the completed trip entry | Navigates to `/group/{groupId}/trip/{tripId}`. Same Trip Summary content as ctxA saw -- all group members can view it. Per-household grouping and counts match. | None |
| 11.7 | ctxB | Click "Done" or navigate back | Returns to group page. List shows 2 remaining items: "Pasta" and "Free Range Eggs". | None |

---

## 4. Assertions Checklist

### Milestone 1: Household Identity Setup

- [ ] `localStorage` contains `familycart_household_id` (UUID format) for each context
- [ ] `localStorage` contains `familycart_household_name` matching the entered name
- [ ] Landing page shows "Create Group" and "Join Group" only after name is submitted

### Milestone 2: Group Created, Holding State

- [ ] URL matches `/group/{groupId}`
- [ ] Amber "Waiting for another household to join..." banner is visible
- [ ] Invite code is displayed (6 uppercase alphanumeric characters)
- [ ] "Grocery list is locked" indicator is visible
- [ ] No add-item FAB or form is accessible

### Milestone 3: Group Activated (2 Households)

- [ ] Holding state automatically transitions to active view (no page reload)
- [ ] "2 households" label visible in both contexts
- [ ] "Start Shopping" button visible in both contexts
- [ ] Empty grocery list card visible
- [ ] Members button and Trip History button visible

### Milestone 4: Items on the List

- [ ] 5 total items visible in both contexts
- [ ] Each item displays household name inline (no tap required)
- [ ] Each item shows a colored left border matching its household's assigned color
- [ ] Household A and Household B have distinct colors
- [ ] "Current Shopping List" summary card shows per-household breakdown with correct counts

### Milestone 5: Edit / Delete / Undo

- [ ] Edited item name updates in real-time across both contexts
- [ ] Deleted item disappears immediately in both contexts
- [ ] Undo toast appears with correct item name and "Undo" action
- [ ] Undo restores item in both contexts within the 5-second window
- [ ] Ownership enforcement: Household B cannot see edit/delete actions on Household A's items

### Milestone 6: Shopper Mode Active

- [ ] Shopper Mode page at `/group/{groupId}/shopper`
- [ ] Blue header with "Shopper Mode" text
- [ ] Progress bar: "0 of 5 items checked" initially
- [ ] All 5 items in "Still needed" section
- [ ] "Complete Trip" button visible at bottom
- [ ] FAB (+) for adding items is visible
- [ ] Group page (ctxB) shows "Shopping in progress by Smith Family"

### Milestone 7: Items Checked Off

- [ ] Checked items move from "Still needed" to "In basket"
- [ ] Progress bar updates correctly with each check/uncheck
- [ ] Uncheck moves item back to "Still needed"
- [ ] Group page (ctxB) reflects purchased styling in real-time

### Milestone 8: Last-Minute Item

- [ ] Item added during trip has `addedDuringTripId` equal to active trip ID
- [ ] Item appears in Shopper Mode with "newly added" visual flag
- [ ] Progress denominator increases (e.g., "3 of 6 items checked")
- [ ] Item added from within Shopper Mode also appears flagged

### Milestone 9: Trip Completed

- [ ] Redirect to Trip Summary page (`/group/{groupId}/trip/{tripId}`)
- [ ] "Trip Complete!" hero visible
- [ ] "Items purchased: 5" (the 5 that were checked off)
- [ ] Per-household grouping: Household A = 3 items, Household B = 2 items
- [ ] Expandable household sections show correct item details (name, qty, unit)
- [ ] No active trip remains (group page shows "Start Shopping", not "Continue Shopping")

### Milestone 10: Unchecked Items Persist

- [ ] Group page list shows exactly 2 items: "Pasta" and "Free Range Eggs"
- [ ] Both items have `status: "pending"`
- [ ] No "bought" items remain in the list
- [ ] Items are attributed to their correct households

---

## 5. Post-conditions

After the full test completes, the application state must satisfy all of the following:

### UI State

| Context | Current Page | Key Observations |
|---|---|---|
| ctxA | `/group/{groupId}` (active group view) | 2 items on list. "Start Shopping" available. No active trip banner. |
| ctxB | `/group/{groupId}` (active group view) | Same 2 items. Trip history shows 1 completed trip. |

### Firestore State

| Collection / Path | Expected Documents |
|---|---|
| `/groups/{groupId}` | 1 document: `name: GROUP_NAME`, valid `inviteCode`, `inviteExpiresAt` in the future |
| `/groups/{groupId}/households/` | 2 documents: Household A (`HOUSEHOLD_A_NAME`) and Household B (`HOUSEHOLD_B_NAME`), each with distinct `color` |
| `/groups/{groupId}/items/` | 2 documents: "Pasta" (`householdId: B`, `status: "pending"`, `deleted: false`) and "Free Range Eggs" (`householdId: A`, `status: "pending"`, `deleted: false`) |
| `/groups/{groupId}/trips/` | 1 document: `status: "complete"`, `completedAt` set, `purchasedItems` array of length 5, `startedByHouseholdId: householdAId`, `startedByHouseholdName: HOUSEHOLD_A_NAME` |

### localStorage State

| Context | Key | Value |
|---|---|---|
| ctxA | `familycart_household_id` | UUID of Household A |
| ctxA | `familycart_household_name` | `HOUSEHOLD_A_NAME` |
| ctxA | `familycart_group_{householdAId}` | `{groupId}` |
| ctxB | `familycart_household_id` | UUID of Household B |
| ctxB | `familycart_household_name` | `HOUSEHOLD_B_NAME` |
| ctxB | `familycart_group_{householdBId}` | `{groupId}` |

---

## 6. Implementation Notes for QA

### Two-Context Pattern

```typescript
// Playwright setup
const browserA = await browser.newContext();
const browserB = await browser.newContext();
const pageA = await browserA.newPage();
const pageB = await browserB.newPage();
```

Each context has isolated localStorage and cookies. This simulates two separate households on two separate devices.

### Waiting for Real-Time Updates

The app uses Firestore `onSnapshot` for real-time sync. When asserting cross-context visibility (e.g., "Household B sees Household A's items"), use Playwright's `expect(locator).toBeVisible()` with a reasonable timeout (5-10 seconds) rather than fixed waits. Firestore propagation to a second listener is typically under 1 second but can vary under emulator load.

### Invite Code Extraction

The invite code is rendered in the HoldingState screen inside an `InviteDisplay` component. Extract its text content:

```typescript
const inviteCode = await pageA.locator('[data-testid="invite-code"]').textContent();
// or locate by visible text pattern: 6 uppercase alphanumeric chars
```

If `data-testid` attributes are not yet present, the team should add them as part of E2E test infrastructure setup.

### Undo Toast Timing

The undo toast auto-dismisses after 5 seconds. The test must click "Undo" within that window. Use `page.getByRole('button', { name: 'Undo' })` immediately after the delete action. Do not add artificial delays before clicking.

### Firestore Direct Assertions (Optional)

For stronger guarantees, the test can query Firestore directly via the Admin SDK (connected to the emulator) to verify document state. This is recommended for:

- Confirming `deleted`/`deletedAt` flags after soft-delete and undo
- Confirming `purchasedItems` array contents after trip completion
- Confirming hard-deletion of bought items after trip completion
- Confirming `addedDuringTripId` is set correctly on mid-trip items

### Test Data Cleanup

If running against a persistent Firestore instance (not emulator), implement `afterAll` cleanup that deletes the test group and all subcollections. Against the emulator, use `firebase emulators:exec` or clear the emulator between runs.

---

*FamilyCart -- Sunny Path E2E Test Requirements -- v1.0 -- February 24, 2026*
