# FamilyCart — MVP Task Breakdown (Pilot Slim)

> **Project:** FamilyCart · Design Partner Pilot
> **Source Document:** MVP User Stories v2.0 · Full Task Breakdown v1.0
> **Version:** Slim v1.1 — Auth, Analytics & Notifications excluded
> **Date:** February 22, 2026
> **Scope note:** US-00a, US-00b (Auth), NFR-01 (Notifications), and NFR-02 (Analytics) are out of scope for this cut. Assumes users are pre-authenticated and identified. All in-app notification tasks are dropped. Analytics instrumentation deferred.

> **v1.1 changes (Tech Lead):**
> - US-05 moved from Sprint 2 → Sprint 1 (low-effort, no new dependencies)
> - US-06 moved from Sprint 3 → Sprint 2 (rebalances Sprint 2 down, Sprint 3 is now lighter)
> - US-08-T04 reclassified from BE to FE; SP reduced 5 → 2; rationale: Firestore IndexedDB persistence handles the offline queue natively — a custom BE queue would conflict with it
> - New task US-08-T04a added: configure and validate Firestore offline persistence (FE, P0, 2 SP)
> - Sprint totals updated throughout

---

## Dependency Map

```
US-00c (Join Household) ← assumes auth exists externally
  └── US-00d (Leave Group)
  └── US-01 (Create Group)
      └── US-02 (Add Item)
          └── US-03 (View List)
          └── US-04 (Edit/Remove Item)
          └── US-05 (Attribution)
      └── US-06 (View Purchased Items)
      └── US-07 (Activate Shopper Mode)
          └── US-08 (Check Off Items)
          └── US-09 (Add Last-Minute Item)
          └── US-10 (New Item Notification — UI only, no push)
          └── US-11 (Complete Trip)
              └── US-12 (Trip Summary)
NFR-03 (Data Retention) — constrains US-12
```

---

## Section 0 — Household Setup

### US-00c — Join an Existing Household

| Task ID | Description | Type | Priority | SP | Dependencies |
|---|---|---|---|---|---|
| US-00c-T01 | Design invite link generation screen and joining flow | DESIGN | P1 | 2 | — |
| US-00c-T02 | Implement invite code/link generation endpoint; set `inviteExpiresAt` to now + 48h | BE | P1 | 3 | — |
| US-00c-T03 | Implement join-household endpoint: validate invite not expired, add user to household | BE | P1 | 2 | US-00c-T02 |
| US-00c-T04 | Build invite generation UI: display link/code, copy and native share | FE | P1 | 3 | US-00c-T01, US-00c-T02 |
| US-00c-T05 | Build join flow UI: link handling → household membership confirmation | FE | P1 | 2 | US-00c-T03 |
| US-00c-T06 | Write integration tests: join flow for new and existing users; expired invite rejection | QA | P1 | 2 | US-00c-T05 |

**Story Subtotal: 14 SP**

---

### US-00d — Leave a Group

| Task ID | Description | Type | Priority | SP | Dependencies |
|---|---|---|---|---|---|
| US-00d-T01 | Design leave group flow: settings entry, warning modal, confirmation | DESIGN | P1 | 2 | US-00c-T01 |
| US-00d-T02 | Implement leave group endpoint: remove household, delete their pending items | BE | P1 | 3 | US-00c-T03 |
| US-00d-T03 | Implement single-household holding state trigger when group drops to one | BE | P1 | 2 | US-00d-T02 |
| US-00d-T04 | Build leave group UI: warning modal with item-loss description, confirmation | FE | P1 | 3 | US-00d-T01, US-00d-T02 |
| US-00d-T05 | Build post-leave state: revoke group list access immediately | FE | P1 | 1 | US-00d-T04 |
| US-00d-T06 | Write integration tests: happy path, creator leaves with varying remaining household counts | QA | P1 | 2 | US-00d-T04 |

**Story Subtotal: 13 SP**

---

## Section 1 — Shared Multi-Household List

### US-01 — Create a Family Group

| Task ID | Description | Type | Priority | SP | Dependencies |
|---|---|---|---|---|---|
| US-01-T01 | Design group creation flow: name entry, invite sharing, holding state screen | DESIGN | P0 | 3 | — |
| US-01-T02 | Design holding state UI: explanatory copy, persistent invite CTA, locked list | DESIGN | P0 | 2 | US-01-T01 |
| US-01-T03 | Implement create group endpoint: persist group name, creator household, generate invite | BE | P0 | 3 | — |
| US-01-T04 | Implement group membership and holding state: lock list until 2nd household joins | BE | P0 | 3 | US-01-T03 |
| US-01-T05 | Implement list auto-activation when 2nd household joins | BE | P0 | 2 | US-01-T04 |
| US-01-T06 | Build group creation UI flow | FE | P0 | 3 | US-01-T01, US-01-T03 |
| US-01-T07 | Build holding state screen: invite link, copy/share, locked state prompt | FE | P0 | 3 | US-01-T02, US-01-T04 |
| US-01-T08 | Build group members view | FE | P1 | 2 | US-01-T06 |
| US-01-T09 | Write integration tests: creation, holding state, activation on 2nd household join | QA | P0 | 3 | US-01-T07 |

**Story Subtotal: 24 SP**

---

### US-05 — See Who Added What ⟵ [TL] moved to Sprint 1

> Moved forward from Sprint 2. This story is almost entirely a design review plus a one-field payload confirmation — it has no new backend dependencies and adds 4 SP to Sprint 1 without blocking anything.

| Task ID | Description | Type | Priority | SP | Dependencies |
|---|---|---|---|---|---|
| US-05-T01 | Confirm household label visible on all items without tap (design review) | DESIGN | P1 | 1 | US-03-T01 |
| US-05-T02 | Ensure household name (not individual) is returned in item payload | BE | P1 | 1 | US-02-T02 |
| US-05-T03 | Render household label inline on each list item — visible at rest | FE | P1 | 1 | US-03-T04, US-05-T02 |
| US-05-T04 | Write UI tests: label visibility across multiple household items | QA | P1 | 1 | US-05-T03 |

**Story Subtotal: 4 SP**

---

### US-02 — Add an Item to the Shared List

| Task ID | Description | Type | Priority | SP | Dependencies |
|---|---|---|---|---|---|
| US-02-T01 | Design add item UI: name, quantity, unit input; inline submission | DESIGN | P1 | 2 | US-01-T01 |
| US-02-T02 | Implement add item endpoint: persist item with name, quantity, unit, householdId, `createdAt` | BE | P1 | 3 | US-01-T04 |
| US-02-T03 | Implement real-time broadcast of new items to all group members | BE | P0 | 5 | US-02-T02 |
| US-02-T04 | Build add item UI: inline form, multi-item session (stay in list view) | FE | P1 | 3 | US-02-T01, US-02-T02 |
| US-02-T05 | Bind real-time listener: render new items immediately on receipt; filter `deleted: true` items | FE | P0 | 3 | US-02-T03 |
| US-02-T06 | Write integration tests: item creation, household tagging, real-time appearance | QA | P1 | 3 | US-02-T05 |

**Story Subtotal: 19 SP**

---

### US-03 — View the Full Consolidated List

| Task ID | Description | Type | Priority | SP | Dependencies |
|---|---|---|---|---|---|
| US-03-T01 | Design list view: household grouping, label per item, sync failure banner | DESIGN | P0 | 3 | US-02-T01 |
| US-03-T02 | Implement list fetch endpoint: return all pending items with household metadata | BE | P0 | 2 | US-02-T02 |
| US-03-T03 | Implement sync failure detection: expose connectivity state; disable item addition on failure | BE | P0 | 3 | US-02-T03 |
| US-03-T04 | Build list view UI: household labels, sort/group control, read-only touch safety | FE | P0 | 5 | US-03-T01, US-03-T02 |
| US-03-T05 | Build sync failure banner: "List may not be up to date — reconnecting…", disable add | FE | P0 | 2 | US-03-T03 |
| US-03-T06 | Write integration tests: list load, grouping, real-time updates, sync failure banner | QA | P0 | 3 | US-03-T04 |

**Story Subtotal: 18 SP**

---

### US-04 — Edit or Remove My Own Item

| Task ID | Description | Type | Priority | SP | Dependencies |
|---|---|---|---|---|---|
| US-04-T01 | Design edit/delete interactions: inline edit, undo toast (5-second timer) | DESIGN | P1 | 2 | US-03-T01 |
| US-04-T02 | Implement edit item endpoint: update fields; enforce household ownership | BE | P1 | 3 | US-02-T02 |
| US-04-T03 | Implement soft-delete: set `deleted: true` + `deletedAt` timestamp; Cloud Function purges after expiry window | BE | P1 | 3 | US-04-T02 |
| US-04-T04 | Implement undo: clear `deleted` and `deletedAt` within 5s window | BE | P1 | 2 | US-04-T03 |
| US-04-T05 | Deploy `purgeDeletedItems` Cloud Function (scheduled, every 1 min, 10s grace buffer) | BE | P1 | 2 | US-04-T03 |
| US-04-T06 | Broadcast edit/delete/undo events to all members in real time | BE | P1 | 2 | US-04-T02, US-02-T03 |
| US-04-T07 | Build inline edit UI and ownership-gated controls | FE | P1 | 3 | US-04-T01, US-04-T02 |
| US-04-T08 | Build undo toast: 5-second display, tap-to-undo, auto-dismiss | FE | P1 | 2 | US-04-T03, US-04-T04 |
| US-04-T09 | Write integration tests: edit, delete, undo in/out of window, cross-household permission block | QA | P1 | 3 | US-04-T08 |

**Story Subtotal: 22 SP** *(+2 SP from original: Cloud Function deploy task added)*

---

### US-06 — View Items Already Purchased ⟵ [TL] moved to Sprint 2

> Moved forward from Sprint 3. Sprint 2 is lighter with US-05 pulled to Sprint 1, and Sprint 3 benefits from the reduced load given offline complexity in US-08.

| Task ID | Description | Type | Priority | SP | Dependencies |
|---|---|---|---|---|---|
| US-06-T01 | Design purchased item treatment: strikethrough/grey style, remaining vs. purchased count | DESIGN | P1 | 2 | US-03-T01 |
| US-06-T02 | Include check-off status in list item payload (reuses US-08 endpoint) | BE | P1 | 1 | US-08-T02 |
| US-06-T03 | Apply purchased styling and live count ("7 of 12 done") | FE | P1 | 2 | US-06-T01, US-06-T02 |
| US-06-T04 | Verify real-time purchased status update without refresh | QA | P1 | 2 | US-06-T03 |

**Story Subtotal: 7 SP**

---

## Section 2 — Shopper Mode

### US-07 — Activate Shopper Mode

| Task ID | Description | Type | Priority | SP | Dependencies |
|---|---|---|---|---|---|
| US-07-T01 | Design Shopper Mode: large-touch-target layout, activation button, conflict blocking screen | DESIGN | P0 | 3 | US-03-T01 |
| US-07-T02 | Implement Shopper Mode session endpoint: create trip doc with `startedByHouseholdId` + `startedByHouseholdName`; enforce one-active-per-group | BE | P0 | 3 | US-01-T04 |
| US-07-T03 | Implement concurrent conflict response: query for `status === "active"` trip; return `startedByHouseholdName` | BE | P0 | 2 | US-07-T02 |
| US-07-T04 | Build Shopper Mode UI: optimised layout, activate button | FE | P0 | 5 | US-07-T01, US-07-T02 |
| US-07-T05 | Build conflict screen: blocking message with active shopper's household name | FE | P0 | 2 | US-07-T03 |
| US-07-T06 | Confirm add-item access not blocked for other members during active session | QA | P0 | 1 | US-07-T04 |
| US-07-T07 | Write integration tests: activation, conflict, no list-lock side effects | QA | P0 | 3 | US-07-T05 |

**Story Subtotal: 19 SP**

---

### US-08 — Check Off Items While Shopping

| Task ID | Description | Type | Priority | SP | Dependencies |
|---|---|---|---|---|---|
| US-08-T01 | Design check-off interaction: single tap, purchased section, remaining count, offline banner | DESIGN | P0 | 2 | US-07-T01 |
| US-08-T02 | Implement check-off endpoint: toggle purchased state, broadcast in real time | BE | P0 | 3 | US-07-T02, US-02-T03 |
| US-08-T03 | Implement uncheck endpoint | BE | P0 | 1 | US-08-T02 |
| US-08-T04a | Configure and validate Firestore IndexedDB persistence on app init; handle `failed-precondition` and `unimplemented` error cases | FE | P0 | 2 | — |
| US-08-T04b | Build offline status detection: listen to `navigator.onLine` + window events; expose connectivity state to components | FE | P0 | 2 | US-08-T04a |
| US-08-T05 | Build check-off UI: single tap toggle, purchased section, remaining count | FE | P0 | 3 | US-08-T01, US-08-T02 |
| US-08-T06 | Build offline banner: "You're offline — changes will sync when reconnected"; driven by connectivity state from T04b | FE | P0 | 2 | US-08-T04b |
| US-08-T07 | Write integration tests: check-off, uncheck, offline queue, sync-on-reconnect | QA | P0 | 5 | US-08-T06 |

**Story Subtotal: 20 SP** *(−4 SP from original: custom BE queue task replaced with two smaller, correctly-scoped FE tasks)*

---

### US-09 — Add a Last-Minute Item While Shopping

| Task ID | Description | Type | Priority | SP | Dependencies |
|---|---|---|---|---|---|
| US-09-T01 | Design inline add-item within Shopper Mode (no view exit) | DESIGN | P1 | 1 | US-07-T01 |
| US-09-T02 | Extend add item endpoint: set `addedDuringTripId` when a trip is active; attribute to Shopper's household | BE | P1 | 2 | US-02-T02, US-07-T02 |
| US-09-T03 | Build inline add-item control within Shopper Mode UI | FE | P1 | 2 | US-09-T01, US-09-T02 |
| US-09-T04 | Write integration tests: item added in Shopper Mode appears immediately, attributed to Shopper household | QA | P1 | 2 | US-09-T03 |
| US-09-T05 | Document on-behalf-of attribution limitation in Design Partner onboarding materials | DESIGN | P2 | 1 | — |

**Story Subtotal: 8 SP**

---

### US-10 — Receive a New Item Request During an Active Trip

> **Scope note:** Push notifications are out of scope. This story is implemented as a passive real-time UI update only — new items are visually flagged when they appear in the active Shopper Mode list.

| Task ID | Description | Type | Priority | SP | Dependencies |
|---|---|---|---|---|---|
| US-10-T01 | Design new item visual treatment in Shopper Mode: "newly added" flag, top-of-list placement | DESIGN | P1 | 2 | US-07-T01 |
| US-10-T02 | `addedDuringTripId` is set by US-09-T02 — confirm field is included in real-time item payload and readable in Shopper Mode context | BE | P1 | 1 | US-09-T02 |
| US-10-T03 | Build new item visual flag: check `addedDuringTripId === activeTripId`; surface flag and sort to top of pending list | FE | P1 | 2 | US-10-T01, US-10-T02 |
| US-10-T04 | Write integration tests: new item flagged without disrupting Shopper Mode view | QA | P1 | 2 | US-10-T03 |

**Story Subtotal: 7 SP**

---

### US-11 — Mark the Trip as Complete

| Task ID | Description | Type | Priority | SP | Dependencies |
|---|---|---|---|---|---|
| US-11-T01 | Design "Complete Trip" action: confirmation prompt, return to standard list view | DESIGN | P0 | 2 | US-07-T01 |
| US-11-T02 | Implement complete trip endpoint: set `status: "complete"`, `completedAt: now()`; archive purchased items; retain unpurchased as pending | BE | P0 | 3 | US-07-T02, US-08-T02 |
| US-11-T03 | Build Complete Trip UI: single action, return to list view on completion | FE | P0 | 2 | US-11-T01, US-11-T02 |
| US-11-T04 | Write integration tests: purchased items archived, unpurchased persist, group returns to list view | QA | P0 | 3 | US-11-T03 |

**Story Subtotal: 10 SP**

---

### US-12 — View the Trip Summary After Completion

| Task ID | Description | Type | Priority | SP | Dependencies |
|---|---|---|---|---|---|
| US-12-T01 | Design trip summary screen: items by household, count per household | DESIGN | P1 | 2 | US-11-T01 |
| US-12-T02 | Implement trip summary endpoint: purchased items grouped by household; enforce 30-day retention (NFR-03) | BE | P1 | 3 | US-11-T02, NFR-03-T01 |
| US-12-T03 | Deploy `purgeExpiredTripSummaries` Cloud Function (scheduled daily; deletes trips where `completedAt` < now − 30d) | BE | P1 | 2 | US-12-T02 |
| US-12-T04 | Build trip summary UI: grouping, counts, accessible to all group members | FE | P1 | 3 | US-12-T01, US-12-T02 |
| US-12-T05 | Write integration tests: summary accuracy, all-member access, 30-day window | QA | P1 | 3 | US-12-T04 |

**Story Subtotal: 13 SP** *(−1 SP from original: retention job is now a Cloud Function deploy, not a separate BE task)*

---

## NFR-03 — Trip Summary Data Retention

| Task ID | Description | Type | Priority | SP | Dependencies |
|---|---|---|---|---|---|
| NFR-03-T01 | Add `completedAt` and `expires_at` (completedAt + 30 days) to trip doc schema; `completedAt` is set by US-11-T02 | DB | P1 | 1 | US-11-T02 |
| NFR-03-T02 | Cloud Function deploy handled in US-12-T03 — verify purge job covers NFR-03 acceptance criteria | QA | P1 | 2 | US-12-T03 |
| NFR-03-T03 | Write tests: summaries accessible within 30 days, inaccessible after | QA | P1 | 2 | NFR-03-T02 |

**NFR Subtotal: 5 SP** *(−2 SP from original: schema and purge job rationalised against US-12 tasks)*

---

## Sprint Plan

> **[TL] Rebalanced.** Original Sprint 2 was 61 SP — an outlier. US-05 (4 SP, low effort) moved to Sprint 1. US-06 (7 SP) moved to Sprint 2 from Sprint 3. Sprint 3 is lighter by design: US-08 offline complexity warrants headroom.

| Sprint | Stories | Focus | SP |
|---|---|---|---|
| **Sprint 1** | US-00c, US-00d, US-01, US-05 | Household setup + attribution | 55 |
| **Sprint 2** | US-02, US-03, US-04, US-06 | Core list functionality + purchased view | 66 |
| **Sprint 3** | US-07, US-08 | Shopper Mode + offline check-off | 39 |
| **Sprint 4** | US-09, US-10, US-11, US-12, NFR-03 | Trip actions, summary, retention | 43 |

> **Note on Sprint 2 (66 SP):** This remains the heaviest sprint owing to US-04's soft-delete complexity. If the team flags concern during Sprint 1 retro, US-06 should be the first candidate to slide to Sprint 3 — it has no blocking dependencies on US-02 through US-04.

---

## Total Estimate Summary

| Section | Stories | SP |
|---|---|---|
| Household Setup | US-00c, US-00d | 27 |
| Shared List | US-01 – US-06 | 94 |
| Shopper Mode | US-07 – US-12 | 77 |
| NFR | NFR-03 | 5 |
| **Grand Total** | **14 stories · 1 NFR** | **203 SP** |

---

## Deferred to Later Sprints

| Item | Reason |
|---|---|
| US-00a — Create an account | Auth deferred |
| US-00b — Sign in on a new device | Auth deferred |
| NFR-01 — Push/in-app notification infrastructure | Notifications deferred |
| NFR-02 — Analytics instrumentation | Analytics deferred |
| US-09-T05 — On-behalf-of attribution | Post-pilot story |

---

*FamilyCart · MVP Task Breakdown (Pilot Slim) · v1.1 · Updated February 22, 2026*
