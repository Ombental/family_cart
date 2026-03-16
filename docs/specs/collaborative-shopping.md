# Collaborative Shopping — User Stories & Spec

## Overview
Multiple users within the same group can shop together on a single trip. One user starts the trip; others request to join. The trip starter (or any active shopper) can approve/reject requests. All active shoppers see the live list and can mark items as bought. Any active shopper can complete the trip.

---

## User Stories

### US-1: Request to Join an Active Trip
**As a** group member,
**I want to** request to join an active shopping trip,
**so that** I can help shop for the family.

**Acceptance Criteria:**
- [ ] When a trip is active in my group, I see a "Request to Join" button instead of / alongside "Start Shopping"
- [ ] Tapping the button sends a join request (Firestore document)
- [ ] I see a pending state ("Request sent, waiting for approval...")
- [ ] Only members of the same group can request to join
- [ ] If I already have a pending or approved request, the button is disabled/hidden

### US-2: Approve or Reject Join Requests
**As an** active shopper,
**I want to** see and approve or reject join requests,
**so that** I control who shops with me.

**Acceptance Criteria:**
- [ ] A notification badge appears in Shopper Mode when pending requests exist
- [ ] Tapping the badge opens a list of pending requests (requester name + household)
- [ ] Each request has Approve and Reject actions
- [ ] Approving adds the requester as an active shopper on the trip
- [ ] Rejecting removes the request; requester sees they were declined
- [ ] Any active shopper (not just the trip starter) can approve/reject

### US-3: Collaborative Real-Time Shopping
**As an** approved shopper,
**I want to** see the grocery list and mark items as bought in real-time,
**so that** we don't duplicate effort while shopping together.

**Acceptance Criteria:**
- [ ] Approved shoppers enter the same Shopper Mode view
- [ ] Item check-offs sync in real-time across all active shoppers (existing onSnapshot)
- [ ] All active shoppers see the same item list (filtered by group)
- [ ] No individual "leave trip" option — shoppers stay until trip is completed

### US-4: Trip Completion by Any Shopper
**As an** active shopper,
**I want to** be able to complete the trip,
**so that** the shopping session can end regardless of who started it.

**Acceptance Criteria:**
- [ ] The "Complete Trip" button is available to all active shoppers
- [ ] Completing the trip ends it for everyone (existing completeTrip flow)
- [ ] Trip summary records all shoppers who participated
- [ ] All active shoppers are returned to the normal list view after completion

### US-5: Request Status Feedback
**As a** group member who requested to join,
**I want to** see the status of my request,
**so that** I know whether to wait or move on.

**Acceptance Criteria:**
- [ ] Pending: "Waiting for approval..." indicator
- [ ] Approved: automatically navigate into Shopper Mode
- [ ] Rejected: message shown ("Your request was declined"), state resets so they can request again if desired

---

## Sprint Plan — Sprint 11: Collaborative Shopping (Est. 47 SP)

### Phase 1: Data Model & Backend (16 SP)

| # | Task | Story | Size | SP | Depends On |
|---|------|-------|------|----|------------|
| 1.1 | Extend Trip type with `activeShoppers` array field | US-3, US-4 | M | 3 | — |
| 1.2 | Add JoinRequest type (`userId`, `userName`, `householdId`, `householdName`, `status: pending/approved/rejected`, `requestedAt`) | US-1 | S | 2 | — |
| 1.3 | Create `firestore-join-requests.ts` — `requestToJoin()`, `approveJoinRequest()`, `rejectJoinRequest()`, `subscribeToJoinRequests()` | US-1, US-2 | L | 8 | 1.1, 1.2 |
| 1.4 | Extend `createTrip()` to auto-add trip starter as first active shopper | US-3 | S | 1 | 1.1 |
| 1.5 | Extend `completeTrip()` to record all active shoppers in trip summary | US-4 | S | 2 | 1.1 |

### Phase 2: Hooks (10 SP)

| # | Task | Story | Size | SP | Depends On |
|---|------|-------|------|----|------------|
| 2.1 | Create `useJoinRequests(groupId, tripId)` hook — subscribe to pending requests, expose approve/reject/request functions | US-1, US-2 | M | 5 | 1.3 |
| 2.2 | Extend `useTrip` hook — add `isActiveShopper` computed flag, `activeShoppers` list | US-3 | M | 3 | 1.1, 1.4 |
| 2.3 | Create `useJoinRequestStatus(groupId, tripId, userId)` hook — real-time status for the requesting user | US-5 | S | 2 | 1.3 |

### Phase 3: UI — Request Flow (11 SP)

| # | Task | Story | Size | SP | Depends On |
|---|------|-------|------|----|------------|
| 3.1 | Update GroupView — show "Request to Join" button when trip is active and user is not an active shopper | US-1 | M | 3 | 2.1, 2.2 |
| 3.2 | Add pending request state UI in GroupView — "Waiting for approval..." with spinner | US-5 | S | 2 | 2.3 |
| 3.3 | Add rejected state UI — toast/inline message, reset to allow re-request | US-5 | S | 2 | 2.3 |
| 3.4 | Auto-navigate to Shopper Mode on approval | US-5 | S | 2 | 2.3 |
| 3.5 | Update ConflictDialog — replace "Got it" dead-end with "Request to Join" option | US-1 | S | 2 | 3.1 |

### Phase 4: UI — Shopper Mode Updates (10 SP)

| # | Task | Story | Size | SP | Depends On |
|---|------|-------|------|----|------------|
| 4.1 | Add notification badge + pending requests drawer/sheet in ShopperModePage | US-2 | M | 5 | 2.1 |
| 4.2 | Approve/Reject actions in requests drawer — with real-time updates | US-2 | M | 3 | 4.1 |
| 4.3 | Ensure "Complete Trip" available to all active shoppers (update `isCurrentHouseholdShopping` logic) | US-4 | S | 2 | 2.2 |

---

## Execution Order (Critical Path)

```
Phase 1 (types + Firestore)
  ├─ 1.1 + 1.2 (parallel)
  │   ├─ 1.3 (blocked by 1.1 + 1.2)
  │   ├─ 1.4 (blocked by 1.1)
  │   └─ 1.5 (blocked by 1.1)
  │
Phase 2 (hooks)
  ├─ 2.1 (blocked by 1.3)
  ├─ 2.2 (blocked by 1.1 + 1.4)
  └─ 2.3 (blocked by 1.3)
  │
Phase 3 (request flow UI)
  ├─ 3.1 (blocked by 2.1 + 2.2)
  ├─ 3.2 + 3.3 + 3.4 (blocked by 2.3, parallel)
  └─ 3.5 (blocked by 3.1)
  │
Phase 4 (shopper mode UI)
  ├─ 4.1 (blocked by 2.1)
  ├─ 4.2 (blocked by 4.1)
  └─ 4.3 (blocked by 2.2)
```

## Data Model Changes

### New: JoinRequest (subcollection on trip)
**Path:** `/groups/{groupId}/trips/{tripId}/joinRequests/{requestId}`
```
{
  userId: string
  userName: string
  householdId: string
  householdName: string
  status: "pending" | "approved" | "rejected"
  requestedAt: Timestamp
  respondedAt: Timestamp | null
}
```

### Extended: Trip document
```
+ activeShoppers: Array<{
    userId: string
    userName: string
    householdId: string
    householdName: string
    joinedAt: Timestamp
  }>
```
