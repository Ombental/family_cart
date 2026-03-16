# Plan: 4 Minor Tweaks & Fixes

**Status:** Pending approval
**Date:** 2026-03-16

## Context

Four UX issues with the current FamilyCart app:
1. No way to rename a group after creation
2. No way to delete a group
3. Trip history/summary shows household name instead of the user's display name as purchaser
4. Items can be checked off (marked as purchased) from the regular list view — should only be possible in Shopper Mode

---

## Tweak 4: Disable Check-off in List View (trivial)

**Problem:** `GroupView.tsx:264` passes `onToggleStatus` to `GroceryList`, making items tappable for check-off outside Shopper Mode.

**Fix:** Remove the `onToggleStatus` prop from the `GroceryList` in `GroupView.tsx`. One line. `ItemRow` already handles missing `onClick` gracefully (no cursor-pointer, no tap behavior).

**Files:**
- `src/components/group/GroupView.tsx` — remove `onToggleStatus` prop (line 264), remove `toggleItemStatus` from `useItems` destructuring (line 57)

---

## Tweak 3: Show User Name as Trip Purchaser (small)

**Problem:** Trips store `startedByHouseholdName` but user wants to see who personally did the shopping. User's `displayName` is available from `useAuth()` but never passed to trip creation.

**Changes:**

| File | Change |
|---|---|
| `src/types/trip.ts` | Add `startedByUserName?: string` to `Trip` interface |
| `src/lib/firestore-trips.ts` | Add `startedByUserName` to `CreateTripParams`; include in `addDoc` payload; map it in `subscribeToActiveTrip` and `subscribeToCompletedTrips` |
| `src/hooks/useTrip.ts` | Add 4th param `userName: string`; pass as `startedByUserName` to `createTrip` |
| `src/components/group/GroupView.tsx` | Line 65: pass `user?.displayName ?? ""` as 4th arg to `useTrip` |
| `src/pages/ShopperModePage.tsx` | Line 36-39: import `useAuth`, pass `user?.displayName ?? ""` as 4th arg to `useTrip` |
| `src/pages/TripHistoryPage.tsx` | Line 153: use `trip.startedByUserName \|\| trip.startedByHouseholdName` |
| `src/pages/TripSummaryPage.tsx` | Line 148: use `trip.startedByUserName \|\| trip.startedByHouseholdName` |
| `src/__tests__/firestore-trips.test.ts` | Update `createTrip` test expectations to include `startedByUserName` |

**Backward compat:** Optional field + `||` fallback means existing trips still display household name.

---

## Tweak 1: Rename Group (small-medium)

**Problem:** No UI or function to rename a group. The settings dropdown only has "Leave Group".

**Changes:**

| File | Change |
|---|---|
| `src/lib/firestore-groups.ts` | Add `renameGroup({ groupId, newName })` — validates 1-50 chars, updates `groups/{groupId}.name`, fans out to ALL members' `groupMemberships/{groupId}.groupName` via batch. Pattern: query all households → collect all `memberUserIds` → dedupe → update each membership doc. |
| `src/components/group/GroupView.tsx` | Add "Rename Group" `DropdownMenuItem` with `Pencil` icon before "Leave Group". Add a `Dialog` with input field for the new name. State: `renameDialogOpen`, `newGroupName`, `renameSaving`. On save → call `renameGroup()`, close on success. |
| `src/i18n/translations.ts` | Add keys: `group.renameGroup`, `group.renameGroupTitle`, `group.renameFailed` (en + he) |

---

## Tweak 2: Delete Group — Creator Only (medium)

**Problem:** No group deletion. No creator tracking. Need a `createdByUserId` field.

**Changes:**

| File | Change |
|---|---|
| `src/types/group.ts` | Add `createdByUserId?: string` to `Group` interface |
| `src/lib/firestore-groups.ts` | 1) In `createGroup()` (line 73): add `createdByUserId: userId` to the group doc payload. 2) In `subscribeToGroup()` (line 381-385): add `createdByUserId: data.createdByUserId ?? undefined` to mapped object. 3) Add `deleteGroup({ groupId, userId })`: verify creator, block if active trip, batch-delete all items/trips/households/memberships, then delete group doc. |
| `src/components/group/GroupView.tsx` | Add "Delete Group" `DropdownMenuItem` with `Trash2` icon, **only visible when** `group.createdByUserId === user?.id`. Add confirmation `AlertDialog` (destructive styling, same pattern as `LeaveGroupDialog`). On confirm → `deleteGroup()` → `navigate("/", { replace: true })`. |
| `src/i18n/translations.ts` | Add keys: `group.deleteGroup`, `group.deleteGroupTitle`, `group.deleteGroupDesc`, `group.deleteFailed`, `group.deleting`, `group.activeTripBlock` (en + he) |

**Backward compat:** Existing groups without `createdByUserId` simply won't show the "Delete Group" option (undefined !== user.id). Acceptable for pilot.

---

## Execution Order

All 4 are independent. Recommended sequence (simplest first):

```
Tweak 4 (1 line)  →  Tweak 3 (plumbing)  →  Tweak 1 (rename)  →  Tweak 2 (delete)
```

`GroupView.tsx` is touched by all 4, so sequential execution avoids merge conflicts.

---

## Verification

1. `npm run lint` — zero errors
2. `npm run test` — all 128+ tests pass (update firestore-trips tests for new field)
3. `npm run build` — clean build
4. Manual checks:
   - List view: tapping an item row does NOT toggle status
   - Shopper mode: tapping still toggles normally
   - Start a trip → trip history shows user display name, not household name
   - Settings menu → "Rename Group" → rename works, home screen updates
   - Settings menu → "Delete Group" (only visible to creator) → deletes, redirects home
   - Existing trips without `startedByUserName` → falls back to household name
5. Update DEVELOPER_INSTRUCTIONS.md data model section if schema changed (add `createdByUserId`, `startedByUserName`)
