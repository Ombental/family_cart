# Sprint Plan — Household Hierarchy Restructure (HHR)

**Spec:** HHR-01 (Approved 2026-03-16)
**Status:** Approved

---

## Sprint Overview

| Sprint | Theme | Story Points | Stories |
|--------|-------|:---:|---------|
| **Sprint 5** | Foundation — Data model, hooks, wipe | **34 SP** | US-HHR-19, 20, 02 |
| **Sprint 6** | Flows — Home screen, create, join | **42 SP** | US-HHR-01, 03, 04, 05, 06 |
| **Sprint 7** | Household Mgmt — Switch, rename, delete, leave | **39 SP** | US-HHR-07, 08, 09, 10, 11 |
| **Sprint 8** | Adapt — Items, shopper, trips, security | **38 SP** | US-HHR-12, 13, 14, 15, 16, 17, 18, 21 |
| | **Total** | **153 SP** | |

---

## Sprint 5: Foundation (34 SP)

> Rebuild the data layer. Nothing renders yet — this sprint delivers the Firestore schema, core CRUD functions, and the new household context hook. Clean wipe of existing data.

| # | Story | Size | SP | Depends On |
|---|-------|------|----|------------|
| 5.1 | **US-HHR-19** — Firestore data model restructure | L | 8 | — |
| | Rewrite `firestore-groups.ts`: new households subcollection with `memberUserIds`, new `groupMemberships` subcollection on users. Wipe old schema. Update `firestore-items.ts` and `firestore-trips.ts` to use new paths. | | | |
| 5.2 | **US-HHR-20** — `useHouseholdContext(groupId)` hook | M | 5 | 5.1 |
| | Replace `useHousehold()` thin wrapper. Reads membership from `/users/{userId}/groupMemberships/{groupId}`. Returns `{ householdId, householdName, householdColor }`. Caches locally. | | | |
| 5.3 | **US-HHR-02** — User profile (adapt) | S | 2 | 5.1 |
| | Verify profile page works with new user doc schema. Display name edits update `/users/{userId}` only. | | | |
| 5.4 | Update existing hooks (`useGroup`, `useItems`, `useTrip`) to use new paths | M | 5 | 5.1, 5.2 |
| | Wire all hooks to the new subcollection paths. `useItems` uses `householdId` from context. `useGroup` subscribes to `/groups/{groupId}/households`. | | | |
| 5.5 | Rewrite unit tests for foundation layer | L | 8 | 5.1–5.4 |
| | Update all `firestore-*.test.ts` files. New tests for `useHouseholdContext`. Verify CRUD ops against new schema. | | | |
| 5.6 | Clean wipe — remove old data, deploy new Firestore indexes | S | 2 | 5.1 |
| | Delete all existing Firestore collections. Update `firestore.indexes.json` if needed. | | | |
| 5.7 | Color assignment utility update | S | 2 | 5.1 |
| | `pickHouseholdColor()` now counts existing households in group. Soft limit of 10 households per group enforced at creation. | | | |
| 5.8 | Delete-with-undo adapt | S | 2 | 5.2 |
| | `deleteWithUndo` uses householdId from context for ownership check. | | | |

**Exit criteria:** All Firestore CRUD functions work with new schema. Hooks compile and pass tests. No UI changes yet.

---

## Sprint 6: Flows (42 SP)

> User-facing flows: home screen, group creation, group join. This is where the app starts working again for end users.

| # | Story | Size | SP | Depends On |
|---|-------|------|----|------------|
| 6.1 | **US-HHR-01** — Post-login home screen | L | 8 | Sprint 5 |
| | Rebuild `HomePage.tsx`. Subscribe to `/users/{userId}/groupMemberships` via `onSnapshot`. Show group cards (name, household name, member count). Empty state with Create/Join buttons. | | | |
| 6.2 | **US-HHR-03** — Create group with household (2-step flow) | L | 8 | Sprint 5 |
| | Update `CreateGroupPage`. Step 1: group name. Step 2: household name. On submit: create group doc, household doc (with user as member), membership doc. Redirect to group page. | | | |
| 6.3 | **US-HHR-05** — Join group via invite code + household pick/create | XL | 13 | Sprint 5, 6.2 |
| | Rebuild `JoinGroupPage`. Step 1: enter code, validate. Step 2: show existing households list + "Create new" option. On join: add user to household's `memberUserIds`, create membership doc. Handle already-a-member case. | | | |
| 6.4 | **US-HHR-06** — Join flow validation edge cases | M | 3 | 6.3 |
| | Invalid code, expired code, already member, household name collision. All inline errors. | | | |
| 6.5 | **US-HHR-04** — View and share invite code | M | 3 | 6.2 |
| | Verify existing `InviteDisplay` / `HoldingState` work with new model. Regenerate button, share/copy, expiry indicator. | | | |
| 6.6 | Route updates + navigation guards | M | 3 | 6.1–6.3 |
| | Update `App.tsx` router. Home shows group list. Remove old single-group redirect logic. Guard: if no membership for groupId, redirect home. | | | |
| 6.7 | Tests for flow pages | M | 4 | 6.1–6.6 |
| | Update `group-flows.test.tsx`, `auth-flow.test.tsx`. New tests for multi-group home screen, 2-step create, household pick on join. | | | |

**Exit criteria:** A user can register, create a group (with household), share invite, and a second user can join (picking/creating a household). Home screen shows all groups.

---

## Sprint 7: Household Management (39 SP)

> Full household lifecycle: view members by household, switch, rename, delete, leave group.

| # | Story | Size | SP | Depends On |
|---|-------|------|----|------------|
| 7.1 | **US-HHR-07** — View household members | M | 5 | Sprint 6 |
| | Rebuild `GroupMembersPage`. Group users by household. Show household name, color badge, member display names. Highlight current user's household. Real-time updates. | | | |
| 7.2 | **US-HHR-08** — Switch household within group | L | 8 | 7.1 |
| | "Switch Household" action on members page. Show other households + create new option. On switch: remove from old `memberUserIds`, add to new, update membership doc. Confirmation dialog warns about item attribution. Auto-delete empty household. | | | |
| 7.3 | **US-HHR-09** — Rename household | M | 5 | 7.1 |
| | "Rename" on household detail. Updates household doc + denormalized `householdName` in all members' `groupMemberships`. Name uniqueness enforced per group. 1-50 chars. | | | |
| 7.4 | **US-HHR-10** — Delete household | L | 8 | 7.1 |
| | "Delete Household" with confirmation. Blocked during active trip. Deletes household doc, hard-deletes pending items, removes membership docs for all members. Auto-holding state if last household. | | | |
| 7.5 | **US-HHR-11** — Leave group (user-level) | M | 5 | 7.1 |
| | "Leave Group" action. Remove from household's `memberUserIds`, delete membership doc. Auto-delete empty household (reuse 7.4 logic). Redirect home. | | | |
| 7.6 | Firestore helper functions for household management | M | 4 | Sprint 5 |
| | `switchHousehold()`, `renameHousehold()`, `deleteHousehold()`, `leaveGroup()` in `firestore-groups.ts`. Batch writes where multi-doc updates needed. | | | |
| 7.7 | Tests for household management | M | 4 | 7.1–7.6 |
| | New test file `household-mgmt.test.tsx`. Cover switch, rename, delete flows. Edge cases: delete blocked during trip, empty household auto-delete. | | | |

**Exit criteria:** Full household lifecycle works. Members page shows household groupings. Switch/rename/delete all functional with proper guards.

---

## Sprint 8: Adapt Existing Features + Security (38 SP)

> Wire items, shopper mode, and trips to the new model. Lock down security rules.

| # | Story | Size | SP | Depends On |
|---|-------|------|----|------------|
| 8.1 | **US-HHR-12** — Items tagged to household | M | 5 | Sprint 5, Sprint 6 |
| | `addItem()` auto-sets `householdId` from `useHouseholdContext`. Grocery list shows household color bar (existing pattern) + household name. Colors resolved from group's households subcollection. | | | |
| 8.2 | **US-HHR-13** — Item ownership enforcement | M | 3 | 8.1 |
| | Edit/delete check user's householdId vs item's householdId. Error toast if mismatch. Toggle status remains open to all. Undo-delete restricted to owning household. | | | |
| 8.3 | **US-HHR-14** — Shopper mode group-scoped | M | 5 | 8.1 |
| | Verify shopper sees ALL pending items across households. Items color-coded by household. Trip's `startedByHouseholdId` from context. Conflict dialog shows household name. | | | |
| 8.4 | **US-HHR-15** — Check off items during trip | M | 3 | 8.3 |
| | Verify toggle works cross-household (no ownership check). Progress bar counts all items. Last-minute items use adder's household. Offline queue unchanged. | | | |
| 8.5 | **US-HHR-16** — Trip completion with per-household archival | M | 5 | 8.3, 8.4 |
| | `completeTrip()` archives bought items with `householdId` in `purchasedItems`. Hard-delete bought items. Pending items stay. | | | |
| 8.6 | **US-HHR-17** — Trip summary household breakdown | M | 3 | 8.5 |
| | Trip summary groups items by household. Uses denormalized data from trip doc. | | | |
| 8.7 | **US-HHR-18** — Trip history | S | 2 | 8.5 |
| | Verify trip history works with new model. List shows started-by household name. 30-day purge unchanged. | | | |
| 8.8 | **US-HHR-21** — Security rules | L | 8 | Sprint 5–7 |
| | User docs: owner only. Group data: members only (check `groupMemberships` exists). Household writes: member of that household. Item writes: householdId matches user's household. Trip creation: must belong to a household in group. Test with emulator. | | | |
| 8.9 | Integration tests for adapted features | M | 4 | 8.1–8.8 |
| | Update `list-items.test.tsx`, `shopper-mode.test.tsx`, `trip-summary.test.tsx` for new household context. New security rules tests. | | | |

**Exit criteria:** Full app works end-to-end with new model. Items attributed to households. Shopper/trips functional. Security rules locked down. All tests green.

---

## Dependency Graph

```
Sprint 5 (Foundation)
  ├── 5.1 Data model ──┬── 5.2 useHouseholdContext
  │                    ├── 5.3 Profile adapt
  │                    ├── 5.6 Clean wipe
  │                    └── 5.7 Color utility
  ├── 5.1 + 5.2 ──── 5.4 Hook updates
  ├── 5.2 ─────────── 5.8 Delete-with-undo
  └── 5.1–5.4 ────── 5.5 Tests

Sprint 6 (Flows) ← depends on Sprint 5
  ├── 6.1 Home screen
  ├── 6.2 Create group ──── 6.5 Invite display
  ├── 6.2 + Sprint 5 ──── 6.3 Join flow ──── 6.4 Edge cases
  ├── 6.1–6.3 ─────────── 6.6 Routes
  └── 6.1–6.6 ─────────── 6.7 Tests

Sprint 7 (Household Mgmt) ← depends on Sprint 6
  ├── Sprint 5 ────── 7.6 Firestore helpers
  ├── Sprint 6 ────── 7.1 View members
  ├── 7.1 ──── 7.2 Switch household
  ├── 7.1 ──── 7.3 Rename household
  ├── 7.1 ──── 7.4 Delete household
  ├── 7.1 ──── 7.5 Leave group
  └── 7.1–7.6 ── 7.7 Tests

Sprint 8 (Adapt + Security) ← depends on Sprint 5–7
  ├── 8.1 Item attribution ── 8.2 Ownership
  ├── 8.1 ── 8.3 Shopper ── 8.4 Check-off
  ├── 8.3–8.4 ── 8.5 Trip completion ── 8.6 Summary ── 8.7 History
  ├── Sprint 5–7 ── 8.8 Security rules
  └── 8.1–8.8 ── 8.9 Tests
```

---

## Risk Notes

- **Sprint 6 (Join flow)** is the most complex UI work (XL). The household picker during join is new UX with multiple states.
- **Sprint 8 (Security rules)** requires emulator testing — budget time for setup if not already configured.
- **Soft limit of 10 households/group** — enforced client-side in pilot. Server-side enforcement comes with security rules.
- **Denormalized names** — Rename operations must fan out to `groupMemberships`. Batch writes keep this atomic.
