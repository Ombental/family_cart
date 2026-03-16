# Household Hierarchy Restructure

**Spec ID:** HHR-01
**Date:** 2026-03-16
**Status:** Approved

---

## Overview

FamilyCart currently uses a flat identity model where `userId === householdId`. Every user IS a household, and each user can only belong to one group. This spec restructures the data model to introduce **Households as first-class entities scoped to groups**, enabling:

- A user to belong to multiple groups
- Multiple users to share a single household within a group
- Proper attribution of shopping list items to households (not individual users)

This is a clean-wipe rebuild. No data migration is needed.

### Why Now

The flat model blocks multi-group support and multi-user households -- both are table-stakes for a family grocery app. Early pilot users have confirmed they need to participate in more than one shopping circle (e.g., immediate family + extended family for holiday planning). Restructuring now, before a wider rollout, avoids a painful migration later.

---

## New Data Model (Reference)

```
/users/{userId}
  phoneNumber, displayName, createdAt, updatedAt

/groups/{groupId}
  name, inviteCode, inviteExpiresAt

/groups/{groupId}/households/{householdId}
  name, color, memberUserIds: string[]   <-- array of userId references

/groups/{groupId}/items/{itemId}
  name, qty, unit, notes
  householdId                             <-- which household added this
  status, createdAt, addedDuringTripId
  deleted, deletedAt

/groups/{groupId}/trips/{tripId}
  startedAt, completedAt, status
  startedByHouseholdId, startedByHouseholdName
  purchasedItems: [{name, qty, unit, householdId}]

/users/{userId}/groupMemberships/{groupId}
  householdId                             <-- which household in this group
  householdName                           <-- denormalized for fast display
  groupName                               <-- denormalized for home screen
  joinedAt
```

Key changes from current model:
- Households gain a `memberUserIds` array tracking which users belong to them
- A new `groupMemberships` subcollection on users replaces the old localStorage-based group lookup
- Users and households are fully decoupled (userId !== householdId)

---

## User Stories

### Theme 1: User Identity & Multi-Group Home Screen

#### US-HHR-01: Post-Login Home Screen

> As a **logged-in user**, I want to see a list of all groups I belong to after login, so that I can quickly navigate to any group's shopping list.

**Acceptance Criteria:**

- [ ] After login, the home screen (`/`) displays a list of the user's groups
- [ ] Each group card shows: group name, household name within that group, member count
- [ ] If the user belongs to zero groups, show empty state with "Create a Group" and "Join a Group" buttons
- [ ] If the user belongs to exactly one group, still show the home screen (do not auto-redirect)
- [ ] Groups are loaded from `/users/{userId}/groupMemberships` subcollection
- [ ] The list updates in real-time (onSnapshot) when the user joins or leaves a group

#### US-HHR-02: User Profile

> As a **logged-in user**, I want to view and edit my display name from a profile screen, so that other household members can identify me.

**Acceptance Criteria:**

- [ ] Profile screen (`/profile`) shows phone number (read-only) and display name (editable)
- [ ] Saving a new display name updates `/users/{userId}/displayName`
- [ ] Display name changes do NOT retroactively update household names (they are independent)
- [ ] Logout button ends the session and redirects to `/login`

---

### Theme 2: Group Creation Flow

#### US-HHR-03: Create a Group with Household

> As a **user without a group**, I want to create a new group and name my household in a single flow, so that I can start building a shopping list immediately.

**Acceptance Criteria:**

Given the user navigates to `/create`:
- [ ] Step 1: User enters a group name (required, 1-50 chars)
- [ ] Step 2: User enters a household name (required, 1-50 chars)
- [ ] On submit, the system creates:
  - A group document at `/groups/{groupId}` with name, inviteCode, inviteExpiresAt
  - A household document at `/groups/{groupId}/households/{householdId}` with name, color, and `memberUserIds: [currentUserId]`
  - A membership document at `/users/{userId}/groupMemberships/{groupId}` with householdId, householdName, groupName, joinedAt
- [ ] User is redirected to `/group/{groupId}` on success
- [ ] A 6-char invite code is generated with 48h expiry (existing behavior)
- [ ] The creator's household is assigned the first color from the palette

#### US-HHR-04: View and Share Invite Code

> As a **group member**, I want to view and share the group's invite code, so that I can invite others to join.

**Acceptance Criteria:**

- [ ] Group page shows the current invite code prominently
- [ ] "Regenerate" button creates a new code with fresh 48h expiry
- [ ] Expired codes are marked as such with a visual indicator
- [ ] Share button uses `navigator.share` (if available) or copies to clipboard

---

### Theme 3: Group Join Flow

#### US-HHR-05: Join a Group via Invite Code

> As a **user with an invite code**, I want to join an existing group and either pick an existing household or create a new one, so that my items appear under the correct household.

**Acceptance Criteria:**

Given the user navigates to `/join`:
- [ ] Step 1: User enters the 6-char invite code
- [ ] System validates the code exists and is not expired
- [ ] Step 2: User sees a choice screen:
  - **"Join existing household"** -- shows a list of households already in the group (name + member count)
  - **"Create new household"** -- text field for a new household name
- [ ] If joining an existing household:
  - The user's ID is appended to that household's `memberUserIds` array
  - A membership doc is created at `/users/{userId}/groupMemberships/{groupId}`
- [ ] If creating a new household:
  - A new household document is created with the user as sole member
  - Color is auto-assigned based on existing household count
  - A membership doc is created at `/users/{userId}/groupMemberships/{groupId}`
- [ ] If the user already belongs to a household in this group, show "already a member" error
- [ ] On success, redirect to `/group/{groupId}`

#### US-HHR-06: Join Flow -- Validation Edge Cases

> As the **system**, I want to guard against invalid join attempts, so that data integrity is preserved.

**Acceptance Criteria:**

- [ ] Invalid code: "This invite code doesn't match any group."
- [ ] Expired code: "This invite code has expired. Ask for a new one."
- [ ] Already a member: "You're already in this group."
- [ ] Household name collision: If user tries to create a household with a name that already exists in the group, show "A household with this name already exists. Join it instead?"
- [ ] All error messages appear inline (not alerts)

---

### Theme 4: Household Management

#### US-HHR-07: View Household Members

> As a **group member**, I want to see which users belong to each household in my group, so that I know who I'm sharing lists with.

**Acceptance Criteria:**

- [ ] Members page (`/group/:groupId/members`) shows households grouped by name
- [ ] Each household shows: name, color badge, list of member display names
- [ ] The current user's household is visually highlighted
- [ ] Member list updates in real-time as users join or leave

#### US-HHR-08: Switch Household Within a Group

> As a **user**, I want to switch to a different household within the same group, so that I can correct a mistake or reorganize.

**Acceptance Criteria:**

Given the user is on the members page or a household management screen:
- [ ] A "Switch Household" action is available
- [ ] User sees a list of other households in the group to pick from, or can create a new one
- [ ] On switch:
  - User's ID is removed from the old household's `memberUserIds`
  - User's ID is added to the new household's `memberUserIds`
  - The `/users/{userId}/groupMemberships/{groupId}` doc is updated with the new householdId and householdName
- [ ] If the old household has zero members after the switch, it is automatically deleted along with its pending items
- [ ] Items previously added by the old household retain their original householdId (no re-attribution)
- [ ] A confirmation dialog warns: "Items you added will stay under [old household]. Continue?"

#### US-HHR-09: Rename Household

> As a **household member**, I want to rename my household, so that we can fix typos or update the name over time.

**Acceptance Criteria:**

- [ ] "Rename" option is available on the household's detail view
- [ ] Any member of the household can rename it (not restricted to creator)
- [ ] The name updates in `/groups/{groupId}/households/{householdId}`
- [ ] The denormalized `householdName` in `/users/{userId}/groupMemberships/{groupId}` is updated for all members of that household
- [ ] Existing items and completed trips retain the old name (no retroactive rename)
- [ ] Name is required, 1-50 chars, no duplicate household names within the same group

#### US-HHR-10: Delete Household

> As a **household member**, I want to delete my household from a group, so that I can leave cleanly.

**Acceptance Criteria:**

- [ ] "Delete Household" option is available on the household's detail view
- [ ] If there is an active trip in the group, the delete action is disabled with message: "Cannot delete a household while a trip is active."
- [ ] Confirmation dialog: "This will remove [household] from [group] and delete all pending items. This cannot be undone."
- [ ] On confirm:
  - The household document is deleted
  - All pending items with that householdId are hard-deleted
  - The `groupMemberships/{groupId}` doc is deleted for every user in that household
- [ ] If this was the last household in the group, the group enters "holding" state
- [ ] All affected users are removed from the group on their next home screen load

#### US-HHR-11: Leave Group (User-Level)

> As a **user**, I want to leave a group entirely, so that it no longer appears on my home screen.

**Acceptance Criteria:**

- [ ] "Leave Group" action is available from the group page or profile
- [ ] On leave:
  - User's ID is removed from their household's `memberUserIds`
  - The `/users/{userId}/groupMemberships/{groupId}` doc is deleted
  - If the household has zero remaining members, the household is auto-deleted (same as US-HHR-10)
- [ ] User is redirected to the home screen
- [ ] The group and its data remain intact for other members

---

### Theme 5: Item Attribution

#### US-HHR-12: Items Tagged to Household

> As a **household member**, I want items I add to the shopping list to be attributed to my household, so that everyone knows who requested what.

**Acceptance Criteria:**

- [ ] When adding an item, the system automatically sets `householdId` to the user's household in that group
- [ ] No manual household selection is needed (it is derived from the user's membership)
- [ ] The grocery list UI shows each item's household via a colored left-border bar (existing pattern)
- [ ] The household color and name are resolved from the group's households subcollection

#### US-HHR-13: Item Ownership Enforcement

> As the **system**, I want to enforce that only members of the household that added an item can edit or delete it, so that households cannot modify each other's requests.

**Acceptance Criteria:**

- [ ] Edit and delete operations check that the current user's householdId (within this group) matches the item's `householdId`
- [ ] If the check fails, show: "You can only edit items added by your household."
- [ ] Toggle status (pending/bought) remains open to all households (no ownership check) -- shoppers need to check off any item
- [ ] Undo-delete is restricted to the household that deleted the item (existing behavior)

---

### Theme 6: Shopper Mode Adaptation

#### US-HHR-14: Shopper Mode Remains Group-Scoped

> As a **shopper**, I want to activate shopper mode for the entire group's list, so that I can shop for everyone in one trip.

**Acceptance Criteria:**

- [ ] Shopper mode is accessible from `/group/:groupId/shopper`
- [ ] The shopper sees ALL pending items across all households in the group
- [ ] Items are visually grouped or color-coded by household
- [ ] The trip's `startedByHouseholdId` is set to the shopper's household in that group
- [ ] Conflict detection works as before: only one active trip per group at a time
- [ ] The conflict dialog shows "A trip is already in progress by [household name]"

#### US-HHR-15: Check Off Items During Trip

> As a **shopper**, I want to check off items from any household during a trip, so that I can complete the full shopping run.

**Acceptance Criteria:**

- [ ] Tapping an item toggles its status between "pending" and "bought" (no ownership check)
- [ ] The UI shows a progress bar: bought count / total pending count
- [ ] Items added during the trip (last-minute items) appear in the list with an "added during trip" indicator
- [ ] Last-minute items use the adding user's household attribution
- [ ] Offline mode: check-offs are queued in IndexedDB and synced on reconnect

---

### Theme 7: Trip Completion & History

#### US-HHR-16: Complete Trip with Per-Household Archival

> As a **shopper**, I want to complete a trip and see a summary broken down by household, so that each family knows what was bought for them.

**Acceptance Criteria:**

- [ ] "Complete Trip" button archives all bought items into the trip document's `purchasedItems` array
- [ ] Each archived item includes `householdId` for attribution
- [ ] Bought items are hard-deleted from the items collection after archival
- [ ] Pending items remain in the list for the next trip
- [ ] User is redirected to the trip summary page

#### US-HHR-17: Trip Summary with Household Breakdown

> As a **group member**, I want to view a completed trip's summary grouped by household, so that I can see what was purchased for each family.

**Acceptance Criteria:**

- [ ] Trip summary page (`/group/:groupId/trip/:tripId`) shows:
  - Trip date and duration
  - Which household started the trip
  - Total items purchased
  - Items grouped by household (household name + color as section headers)
- [ ] Household names are resolved from the trip's denormalized data (not live lookups, since households may have been renamed or deleted)

#### US-HHR-18: Trip History

> As a **group member**, I want to browse past trips, so that I can reference what was bought previously.

**Acceptance Criteria:**

- [ ] Trip history page (`/group/:groupId/trips`) lists completed trips ordered by `completedAt` descending
- [ ] Each entry shows: date, started-by household, item count
- [ ] Trips older than 30 days are purged (existing behavior via Cloud Function or client-side)
- [ ] Tapping a trip navigates to the trip summary page

---

### Theme 8: Data Model & Infrastructure

#### US-HHR-19: Firestore Data Model Restructure

> As the **development team**, I want a clean Firestore data model that supports the user-household-group hierarchy, so that all features can be built on a solid foundation.

**Acceptance Criteria:**

- [ ] `/users/{userId}` stores: phoneNumber, displayName, createdAt, updatedAt
- [ ] `/users/{userId}/groupMemberships/{groupId}` stores: householdId, householdName, groupName, joinedAt
- [ ] `/groups/{groupId}` stores: name, inviteCode, inviteExpiresAt
- [ ] `/groups/{groupId}/households/{householdId}` stores: name, color, memberUserIds (string array)
- [ ] `/groups/{groupId}/items/{itemId}` stores: name, qty, unit, notes, householdId, status, createdAt, addedDuringTripId, deleted, deletedAt
- [ ] `/groups/{groupId}/trips/{tripId}` stores: startedAt, completedAt, status, startedByHouseholdId, startedByHouseholdName, purchasedItems
- [ ] Firestore security rules enforce: users can only read/write their own user doc; group data is accessible to members only
- [ ] IndexedDB persistence is enabled for offline support (existing pattern)

#### US-HHR-20: Resolve Household Context from User Session

> As the **system**, I want to derive the user's household context from their group membership, so that all operations use the correct householdId without manual selection.

**Acceptance Criteria:**

- [ ] A new `useHouseholdContext(groupId)` hook replaces the current `useHousehold()`
- [ ] It reads the user's membership from `/users/{userId}/groupMemberships/{groupId}` to get the householdId
- [ ] All item operations (add, edit, delete, undo) use this derived householdId
- [ ] If the user has no membership for the given group, redirect to home screen
- [ ] The hook caches the membership locally to avoid redundant reads

#### US-HHR-21: Security Rules Update

> As the **development team**, I want Firestore security rules that enforce the new hierarchy, so that users cannot access or modify data outside their groups.

**Acceptance Criteria:**

- [ ] Users can only read/write their own `/users/{userId}` document
- [ ] Users can only read `/groups/{groupId}` data if they have a corresponding `groupMemberships/{groupId}` document
- [ ] Household writes validate that the requesting user is in the household's `memberUserIds`
- [ ] Item writes validate that the item's `householdId` matches the user's household in that group
- [ ] Trip creation validates the user belongs to a household in the group
- [ ] Rules are tested with the Firebase emulator before deploy

---

## Routes (Updated)

| Route | Page | Change |
|---|---|---|
| `/login` | LoginPage | No change |
| `/register` | RegisterPage | No change |
| `/` | HomePage | **Rebuilt**: shows group list instead of single-group redirect |
| `/create` | CreateGroupPage | **Updated**: 2-step flow (group name + household name) |
| `/join` | JoinGroupPage | **Updated**: code entry + household pick/create |
| `/profile` | ProfilePage | No change |
| `/group/:groupId` | GroupPage | Minor updates for household context |
| `/group/:groupId/members` | GroupMembersPage | **Rebuilt**: shows households with user lists |
| `/group/:groupId/shopper` | ShopperModePage | Household context update only |
| `/group/:groupId/trips` | TripHistoryPage | No change |
| `/group/:groupId/trip/:tripId` | TripSummaryPage | No change |

---

## Out of Scope

- **Household-to-household chat or messaging** -- not in pilot
- **Per-item assignment to specific households by the shopper** -- shopper buys everything
- **Cost splitting or payment tracking** -- future feature
- **Notifications (push or in-app)** -- future feature
- **Admin roles within households or groups** -- all members are equal in pilot
- **Migration tooling** -- this is a clean wipe

---

## Resolved Questions

1. **Household size limit?** No cap for pilot.
2. **Group size limit?** Soft limit of 10 households per group.
3. **Household delete during active trip?** Blocked — cannot delete a household while a trip is active in the group.
4. **Household name uniqueness?** Enforced per-group with a helpful nudge to join instead.
