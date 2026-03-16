# FamilyCart — MVP User Stories

> **Scope:** Design Partner Pilot · MVP Features Only
> **Features covered:** Shared Multi-Household List · Shopper Mode
> **Roles:** Shopper (The Family Runner) · Requester (The Household Manager) · Any Member (actions available to all)
> **Version:** 2.0 — Updated per Requirements Coverage Report (February 22, 2026)

---

## Changelog — v1.0 → v2.0

| Change | Type | Source |
|---|---|---|
| Added US-00a: Create an account | New story | GAP-01 |
| Added US-00b: Sign in on a new device | New story | GAP-01 |
| Added US-00c: Join an existing household | New story | GAP-03 |
| Added US-00d: Leave a group | New story | GAP-02 |
| Added NFR section (notifications, analytics, data retention) | New section | CONCERN-01, Minor Issues |
| US-01: Added single-household holding state ACs | AC addition | CONCERN-03 |
| US-03: Added stale sync failure AC | AC addition | CONCERN-02 |
| US-04: Resolved deletion UX ambiguity — undo toast specified | AC update | Minor Issues |
| US-07: Added concurrent Shopper Mode activation conflict AC | AC addition | CONCERN-02 |
| US-08: Added connectivity loss AC | AC addition | CONCERN-02 |
| US-09: Added attribution note for on-behalf-of edge case | Note addition | Minor Issues |

---

## Section 0: Account & Household Setup

*These stories must be completed before a user can access any list or group functionality. They represent the foundational authenticated context assumed by all subsequent stories.*

---

### US-00a — Create an account

**As a** new user,
**I want to** create an account using my phone number,
**so that** I am uniquely identified in the system and can create or join a family group.

**Acceptance Criteria**
- [ ] A new user can sign up by entering their mobile phone number
- [ ] The system sends a one-time passcode (OTP) via SMS to verify the number
- [ ] The user must enter the correct OTP within a 5-minute window to complete sign-up
- [ ] After verification, the user is prompted to set a display name and a household name (e.g., "Mum's flat")
- [ ] An account is not created until OTP verification is successful
- [ ] If the OTP expires, the user can request a new one without restarting the entire flow
- [ ] A phone number already registered to an existing account cannot be used to create a second account — the user is redirected to sign-in instead

---

### US-00b — Sign in on a new device

**As a** returning user,
**I want to** sign in to my existing account on a new or replacement device,
**so that** I can access my group and list without losing my history or household identity.

**Acceptance Criteria**
- [ ] A returning user can sign in by entering their registered phone number and receiving a new OTP
- [ ] Upon successful OTP verification, the user's account, household, and group membership are fully restored
- [ ] The user does not need to re-join their group or re-enter their household name
- [ ] Signing in on a new device does not invalidate sessions on other active devices

---

### US-00c — Join an existing household

**As a** family member,
**I want to** join a household that another member of my home has already created,
**so that** multiple people in my apartment can contribute to the shared list under the same household identity.

**Acceptance Criteria**
- [ ] An existing household member can generate a household invite link or code from within the app
- [ ] A new user who follows the invite link is prompted to create an account (US-00a) if they don't have one, then is automatically added to the household
- [ ] An existing app user who follows the invite link is added to the household without needing to re-register
- [ ] All members of the same household share the same household label on items they add
- [ ] A household can have multiple members; there is no enforced cap for MVP
- [ ] Household members share the same permissions — any member can add, edit, or remove items belonging to their household
- [ ] Joining a household is distinct from joining a group — a household joins a group as a unit, not as individuals

---

### US-00d — Leave a group

**As a** household member,
**I want to** leave a family group my household no longer participates in,
**so that** we are removed from the shared list and no longer receive notifications from that group.

**Acceptance Criteria**
- [ ] Any member of a household can initiate a "leave group" action from the group settings
- [ ] Before leaving, the user is shown a warning that all pending items added by their household will be removed from the shared list
- [ ] Upon confirmation, all pending (unpurchased) items added by the leaving household are removed from the active list
- [ ] All other group members are notified in-app that the household has left
- [ ] The leaving household loses access to the group list immediately after confirming
- [ ] If the group creator's household leaves and only one other household remains, the remaining household is notified and the group enters a single-household holding state (see US-01)
- [ ] If the group creator's household leaves and two or more other households remain, group functionality continues uninterrupted; no automatic transfer of "creator" role is required for MVP

---

## Section 1: Shared Multi-Household List

---

### US-01 — Create a family group

**As a** family member,
**I want to** create a new family group and invite other households to join,
**so that** we have a shared space where everyone can contribute to a single shopping list.

**Acceptance Criteria**
- [ ] A member can create a group by providing a group name
- [ ] The system generates a unique invite link or code that can be shared with other households
- [ ] Each invited household joins under their existing household label (set during account creation in US-00a)
- [ ] The group creator can see all joined households in a group members view
- [ ] **Holding state:** Until a second household has joined, the list is locked — items cannot be added
- [ ] **Holding state UI:** The creator sees a clear prompt explaining that the list will activate once another household joins, with a prominent CTA to share the invite link
- [ ] **Holding state UI:** The invite link is displayed persistently and is easy to copy or share directly from the holding state screen
- [ ] Once a second household joins, the list activates automatically and both households are notified in-app

---

### US-02 — Add an item to the shared list

**As a** Requester,
**I want to** add an item to the shared list from my household,
**so that** the Shopper knows what to buy for us on the next trip.

**Acceptance Criteria**
- [ ] A Requester can add an item by typing a name and optionally specifying quantity and unit (e.g., "Milk — 2 litres")
- [ ] The item is immediately visible to all group members in real time
- [ ] Each item is automatically tagged with the adding household's name
- [ ] A Requester can add multiple items in a single session without leaving the list view
- [ ] An item can be added at any time, not only when a trip is in progress

---

### US-03 — View the full consolidated list

**As a** Shopper,
**I want to** see all items requested by every household in one list,
**so that** I have a single source of truth before and during a shopping trip.

**Acceptance Criteria**
- [ ] The list displays all pending items from all households
- [ ] Each item clearly shows which household requested it
- [ ] Items can be sorted or grouped by household
- [ ] The list updates in real time as other members add or remove items
- [ ] The Shopper can view the list without any editing actions being triggered accidentally
- [ ] **Sync failure:** If real-time sync is unavailable, the app displays a visible banner ("List may not be up to date — reconnecting…") and disables item addition until sync is restored; stale data is never silently presented as current

---

### US-04 — Edit or remove my own item

**As a** Requester,
**I want to** edit or delete an item I previously added,
**so that** I can correct a mistake or remove something we no longer need.

**Acceptance Criteria**
- [ ] A Requester can edit the name, quantity, or unit of any item they added
- [ ] A Requester can delete an item they added at any time before it is marked as purchased
- [ ] Changes are reflected in real time for all group members
- [ ] A Requester cannot edit or delete items added by other households
- [ ] **Deletion UX:** Deleting an item requires a single action and is immediately followed by an undo toast notification ("Item removed — Undo") that persists for 5 seconds; tapping Undo restores the item in full; after 5 seconds the deletion is permanent

---

### US-05 — See who added what

**As any** group member,
**I want to** see which household added each item,
**so that** there is full transparency and no disputes about what was requested.

**Acceptance Criteria**
- [ ] Every item on the list displays the household label of the member who added it
- [ ] The household label is visible without needing to tap or expand the item
- [ ] If a household has multiple members, the item shows the household name (not the individual's name)

---

### US-06 — View items already purchased

**As a** Requester,
**I want to** see which of my items have already been bought during an active trip,
**so that** I have real-time visibility into the shopping progress.

**Acceptance Criteria**
- [ ] Items checked off by the Shopper are visually distinguished from pending items (e.g., greyed out, strikethrough)
- [ ] Purchased items remain visible on the list until the trip is marked complete
- [ ] Requesters can see the update in real time without refreshing
- [ ] The count of remaining vs. purchased items is shown (e.g., "7 of 12 done")

---

## Section 2: Shopper Mode

---

### US-07 — Activate Shopper Mode

**As a** Shopper,
**I want to** activate a dedicated Shopper Mode when I am about to go shopping,
**so that** I have a focused, distraction-free view optimised for in-store use.

**Acceptance Criteria**
- [ ] Any group member can activate Shopper Mode for a trip
- [ ] Only one Shopper Mode session can be active per group at a time
- [ ] All group members are notified in-app when a Shopper Mode session has started (e.g., "Dan has started a shopping trip")
- [ ] Shopper Mode presents all pending items in a clean, large-touch-target layout suitable for one-handed in-store use
- [ ] Activating Shopper Mode does not lock other members from adding items to the list
- [ ] **Concurrent activation conflict:** If a second member attempts to activate Shopper Mode while a session is already active, they see a clear blocking message identifying who is currently shopping (e.g., "Dan is already on a trip — only one active trip is allowed at a time") and the activation is prevented

---

### US-08 — Check off items while shopping

**As a** Shopper,
**I want to** check off items as I place them in the basket,
**so that** I don't lose track of what I've already picked up and the rest of the family can follow along.

**Acceptance Criteria**
- [ ] The Shopper can check off any item with a single tap
- [ ] Checked items are visually marked as done and move to a "purchased" section or are visually deprioritised
- [ ] The check-off action is reflected in real time for all group members
- [ ] The Shopper can uncheck an item if they checked it by mistake
- [ ] The interface shows a clear count of remaining items at all times
- [ ] **Connectivity loss:** If the Shopper loses internet connectivity mid-trip, the app enters an offline mode — check-off actions are queued locally and synced automatically when connectivity is restored; the Shopper sees a persistent banner ("You're offline — changes will sync when reconnected") and can continue checking off items uninterrupted; other group members do not see updates until sync is restored

---

### US-09 — Add a last-minute item while shopping

**As a** Shopper,
**I want to** add an item to the list while I am in Shopper Mode,
**so that** I can capture something I spotted in the store that the family would want.

**Acceptance Criteria**
- [ ] The Shopper can add a new item from within Shopper Mode without exiting the view
- [ ] The item is added to the list and tagged to the Shopper's household by default
- [ ] The new item appears in the active shopping list immediately
- [ ] Other group members can see the new item in real time

> **MVP Note — Attribution:** For MVP, all items added by the Shopper in Shopper Mode are attributed to the Shopper's household, regardless of intended recipient. The on-behalf-of use case (e.g., Shopper spots something for grandmother's household) is acknowledged but deferred to a post-pilot story. Requesters should be informed of this limitation during Design Partner onboarding.

---

### US-10 — Receive a new item request during an active trip

**As a** Shopper,
**I want to** be notified when a Requester adds a new item while I am already shopping,
**so that** I don't miss last-minute requests.

**Acceptance Criteria**
- [ ] The Shopper receives an in-app notification when a new item is added during an active Shopper Mode session
- [ ] The new item appears at the top of the pending list or is visually flagged as newly added
- [ ] The notification does not interrupt or disrupt the current Shopper Mode view

---

### US-11 — Mark the trip as complete

**As a** Shopper,
**I want to** mark the shopping trip as complete when I am done,
**so that** the family knows the trip is over and the list resets for the next one.

**Acceptance Criteria**
- [ ] The Shopper can end the trip with a single "Complete Trip" action
- [ ] All group members are notified in-app that the trip has been completed
- [ ] Checked-off items are archived and the active list is cleared of purchased items
- [ ] Any items that were not checked off during the trip remain on the list as pending
- [ ] The group returns to the standard list view after the trip is marked complete

---

### US-12 — View the trip summary after completion

**As any** group member,
**I want to** see a summary of what was purchased in the last trip,
**so that** I can confirm my items were bought and have a record of the shop.

**Acceptance Criteria**
- [ ] After a trip is completed, a summary is accessible showing all items purchased in that trip
- [ ] The summary groups items by household
- [ ] The summary shows total item count per household
- [ ] The summary is accessible to all group members, not just the Shopper
- [ ] The summary persists for the duration defined in NFR-03 (see Non-Functional Requirements)

---

## Non-Functional Requirements

*These requirements are not user-facing stories but constrain implementation decisions across multiple stories. They must be read and acknowledged by the development team before sprint planning.*

---

### NFR-01 — Notification Delivery Mechanism

**Scope:** Applies to US-01, US-07, US-08, US-10, US-11, US-00d

For MVP, all notifications referenced in user stories are **in-app notifications only**. This means:

- Notifications are delivered as in-app banners or alerts visible only while the app is open or foregrounded
- No push notification infrastructure (APNs / FCM) is required for MVP
- No SMS fallback is required for MVP
- No device permission prompts for notifications are required for MVP

This constraint is intentional to reduce build complexity during the Design Partner pilot. Push notifications are deferred to post-pilot based on evidence of whether real-time awareness is a meaningful pain point for users.

---

### NFR-02 — Analytics Instrumentation for Pilot Metrics

**Scope:** All stories

The Design Partner pilot success metrics (defined in the Product Characterization) require the following events to be instrumented and logged from day one of the pilot build. Analytics must not be bolted on post-build.

| Metric | Required Event |
|---|---|
| Shopper Mode Usage ≥ 70% of trips | Log every trip start (Shopper Mode activated) and trip completion |
| Trips Logged ≥ 3 per group within 4 weeks | Log trip completion event with group ID and timestamp |
| List Activation Rate ≥ 80% within first week | Log first item added per household with timestamp relative to account creation |
| Weekly Retention ≥ 70% at week 4 | Log any group-level activity per calendar week |

Instrumentation does not need a user-facing analytics dashboard for MVP — backend logging accessible to the product team is sufficient.

---

### NFR-03 — Trip Summary Data Retention

**Scope:** US-12

Completed trip summaries must be retained and accessible to all group members for a minimum of **30 days** from the trip completion date. After 30 days, summaries may be archived or purged.

> *Note: The original user story (US-12 v1.0) specified 7 days — this has been updated to 30 days to align with a monthly family shopping cycle and to support the Design Partner feedback process.*

---

## Story Summary

| ID | Story Title | Section | Role | Dev-Ready |
|---|---|---|---|---|
| US-00a | Create an account | Account Setup | Any Member | ✅ Yes |
| US-00b | Sign in on a new device | Account Setup | Any Member | ✅ Yes |
| US-00c | Join an existing household | Account Setup | Any Member | ✅ Yes |
| US-00d | Leave a group | Account Setup | Any Member | ✅ Yes |
| US-01 | Create a family group | Shared List | Any Member | ✅ Yes |
| US-02 | Add an item to the shared list | Shared List | Requester | ✅ Yes |
| US-03 | View the full consolidated list | Shared List | Shopper | ✅ Yes |
| US-04 | Edit or remove my own item | Shared List | Requester | ✅ Yes |
| US-05 | See who added what | Shared List | Any Member | ✅ Yes |
| US-06 | View items already purchased | Shared List | Requester | ✅ Yes |
| US-07 | Activate Shopper Mode | Shopper Mode | Shopper | ✅ Yes |
| US-08 | Check off items while shopping | Shopper Mode | Shopper | ✅ Yes |
| US-09 | Add a last-minute item while shopping | Shopper Mode | Shopper | ✅ Yes |
| US-10 | Receive a new item request during a trip | Shopper Mode | Shopper | ✅ Yes |
| US-11 | Mark the trip as complete | Shopper Mode | Shopper | ✅ Yes |
| US-12 | View the trip summary after completion | Shopper Mode | Any Member | ✅ Yes |
| NFR-01 | Notification delivery mechanism | NFR | — | ✅ Yes |
| NFR-02 | Analytics instrumentation | NFR | — | ✅ Yes |
| NFR-03 | Trip summary data retention | NFR | — | ✅ Yes |

---

*FamilyCart · MVP User Stories · Design Partner Pilot · v2.0*
*Updated per Requirements Coverage Report — February 22, 2026*
