# FamilyCart — Developer Instructions
**Version:** 1.1
**Prepared by:** Tech Lead
**Last updated:** March 16, 2026
**Audience:** All engineers (FE, BE, QA, Design) working on FamilyCart

Read this document before writing a single line of code. It exists to prevent the category of mistake that costs half a sprint to undo.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Stack](#2-stack)
3. [Repository Structure](#3-repository-structure)
4. [Data Model](#4-data-model)
5. [Critical Implementation Rules](#5-critical-implementation-rules)
6. [Internationalization (i18n) & RTL](#6-internationalization-i18n--rtl)
7. [PR/Feature Done Checklist](#7-prfeature-done-checklist)
8. [Out of Scope — Do Not Build These](#8-out-of-scope--do-not-build-these)
9. [PR Checklist](#9-pr-checklist)

---

## 1. Project Overview

FamilyCart is a shared grocery list PWA for families across multiple households. Auth, push notifications, and analytics are explicitly out of scope — do not scope-creep them in.

**What we are building:**

- Household setup: create a family group, invite other households, leave a group
- Shared list: add items, view real-time updates from all households, edit and delete your own items
- Shopper Mode: an optimised in-store UI with check-off, offline support, and trip management
- Trip summary: a post-trip view of what was purchased, retained for 30 days

**What we are not building:** full authentication, push notifications, analytics, cost splitting, receipt upload, or trip scheduling. If a PR introduces any of these, it will be rejected. See Section 8 for the full out-of-scope list.

---

## 2. Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| PWA | vite-plugin-pwa (Workbox) |
| UI | Tailwind CSS + shadcn/ui |
| Database | Firebase Firestore |
| Backend logic | Firebase Cloud Functions (Node.js) |
| Hosting | Firebase Hosting |

Cloud Functions are in scope and required. Two scheduled functions must be deployed — one for soft-delete expiry (US-04) and one for 30-day trip summary purge (NFR-03). Firestore has no native TTL or scheduled delete mechanism. See Section 5.2.

---

## 3. Repository Structure

```
familycart/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── i18n/
│   │   ├── LanguageContext.tsx       ← Provider, useLanguage() hook, t() function
│   │   └── translations.ts          ← All en/he translation strings (~250 keys each)
│   ├── lib/
│   │   └── firebase.ts              ← Firebase init + IndexedDB persistence config
│   └── main.tsx
├── functions/
│   └── src/
│       ├── purgeDeletedItems.ts     ← Soft-delete expiry (runs every 1 min)
│       └── purgeExpiredSummaries.ts ← 30-day trip retention (runs every 24h)
├── .env.example                     ← Template — commit this
└── .gitignore
```

---

## 4. Data Model

This is the canonical Firestore schema. Every field listed is required. Do not add fields without updating this document and including the change in your PR description.

```
/groups/{groupId}
  name                    string
  inviteCode              string
  inviteExpiresAt         timestamp    — set to now + 48h at generation; regenerated per invite

/groups/{groupId}/households/{householdId}
  name                    string
  color                   string

/groups/{groupId}/items/{itemId}
  name                    string
  qty                     number
  unit                    string
  notes                   string
  householdId             string
  status                  "pending" | "bought" | "missed"
  createdAt               timestamp    — always set on creation; used by US-10 for "newly added" detection
  addedDuringTripId       string|null  — tripId if added during an active trip; null otherwise
  deleted                 boolean      — soft-delete flag; false by default
  deletedAt               timestamp|null — set on soft-delete; cleared to null on undo

/groups/{groupId}/trips/{tripId}
  startedAt               timestamp
  completedAt             timestamp|null
  status                  "active" | "complete"
  startedByHouseholdId    string       — required to identify the active shopper
  startedByHouseholdName  string       — denormalised; shown on conflict screen without a second read
```

### Fields you will be tempted to omit — don't

**`createdAt` on items:** Set this from day one on every item write. US-10 needs to identify items added after a trip started. Without it you will have to backfill.

**`addedDuringTripId` on items:** Default to `null`. Set it to the active `tripId` when an item is created during a Shopper Mode session. US-10 reads this field directly. Do not derive "newly added" from timestamp comparisons — that approach is fragile against clock skew.

**`startedByHouseholdId` and `startedByHouseholdName` on trips:** Both are required at trip creation. The conflict screen (US-07-T05) shows the active shopper's household name immediately. Without the denormalised name, showing the conflict screen requires two Firestore reads. Store it once at trip creation. If a household renames itself mid-trip, the in-flight trip retains the name it started with — acceptable.

---

## 5. Critical Implementation Rules

These are not preferences. Each rule exists because the alternative either will not work or will actively break something else.

### 5.1 Do Not Build a Custom Offline Queue

Firestore's `enableIndexedDbPersistence` handles offline queuing natively: it captures writes to IndexedDB when the device has no network connection and flushes them automatically on reconnect. Building a custom queue alongside it will conflict with Firestore's internal write management and cause unpredictable sync behaviour.

Enable persistence once, at app init, in `src/lib/firebase.ts`:

```typescript
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open — persistence only works in one tab at a time.
    // Log and continue. The app still functions; offline support is unavailable in this tab.
    console.warn('Offline persistence unavailable: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // Browser does not support IndexedDB (older Android WebView, some private modes).
    console.warn('Offline persistence not supported in this browser');
  }
});
```

For the offline banner, detect connectivity via `navigator.onLine` and the `online`/`offline` window events. Do not poll. Do not build a parallel sync tracker.

```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

### 5.2 Soft-Delete Uses a Cloud Function — Not a Client Timer

The 5-second undo window for item deletion (US-04) cannot be enforced with a `setTimeout` on the client. Clients go offline, close tabs, and crash. The mechanism is as follows.

**On delete** — the client marks the item and walks away:

```typescript
await updateDoc(itemRef, {
  deleted: true,
  deletedAt: serverTimestamp(),
});
```

**On undo** (within the 5s window) — the client reverses the flags:

```typescript
await updateDoc(itemRef, {
  deleted: false,
  deletedAt: null,
});
```

**Permanent removal** is handled by `functions/src/purgeDeletedItems.ts`, a Cloud Function on a 1-minute schedule with a 10-second grace buffer:

```typescript
// functions/src/purgeDeletedItems.ts
exports.purgeDeletedItems = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 10_000);
    const snapshot = await db.collectionGroup('items')
      .where('deleted', '==', true)
      .where('deletedAt', '<', cutoff)
      .get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  });
```

Worst-case, a soft-deleted item is permanently gone approximately 70 seconds after deletion. If exact 5-second enforcement is required later, replace the scheduler with Cloud Tasks.

The `onSnapshot` listener must filter `deleted: true` items immediately — the item must disappear from the rendered list the moment the client writes the flag, without waiting for the Cloud Function:

```typescript
const items = snapshot.docs
  .map(doc => ({ id: doc.id, ...doc.data() }))
  .filter(item => !item.deleted);
```

This function must be deployed and verified in the Firebase project.

### 5.3 Real-Time Sync Is via onSnapshot — Not Polling

All live list updates use Firestore `onSnapshot` listeners. There is no REST polling anywhere in this application. If you are writing a `setInterval` to refetch list data, stop and use `onSnapshot` instead.

Subscribe at the group items collection level. The subscription must be set up when the user enters a group view and torn down on unmount.

### 5.4 Invite Codes Expire — Validate Server-Side on Join

Invite codes carry an `inviteExpiresAt` timestamp (now + 48h) set at generation. The join-household endpoint must check that `now < inviteExpiresAt` before adding the user to the household. Expired invites must be rejected with a clear error. The UI surfaces this as a user-readable message, not a raw Firestore error state.

Clients should not be trusted to validate expiry on their own.

### 5.5 Shopper Mode Conflict Check

Only one active trip is permitted per group at a time. Before creating a trip document, query for any trip with `status === "active"`. If found, surface the conflict screen using the `startedByHouseholdName` field from the existing trip document.

```typescript
const activeTrip = await getDocs(
  query(tripsRef, where('status', '==', 'active'), limit(1))
);
if (!activeTrip.empty) {
  const trip = activeTrip.docs[0].data();
  showConflictModal(trip.startedByHouseholdName);
  return;
}
// safe to create new trip
```

A full transaction is not required for this conflict check at current scale — the race condition window is narrow enough that a query-then-write is acceptable. Note this as a known limitation in the code comment for when this is revisited at scale.

### 5.6 "Newly Added" Items During an Active Trip

When an item is added while a trip is active, the add-item write must include `addedDuringTripId: <current tripId>`. Items added outside of an active trip receive `addedDuringTripId: null`.

In Shopper Mode, the `onSnapshot` listener uses this field to drive the "newly added" visual flag and top-of-list placement:

```typescript
const isNewlyAdded = (item: Item) => item.addedDuringTripId === activeTripId;
```

Do not derive "newly added" from `createdAt` comparisons against `trip.startedAt`. That approach is fragile against clock skew and adds unnecessary complexity.

### 5.7 30-Day Trip Summary Purge

A second scheduled Cloud Function handles trip summary retention for NFR-03. It runs daily and deletes completed trip documents where `completedAt` is more than 30 days ago:

```typescript
// functions/src/purgeExpiredSummaries.ts
exports.purgeExpiredTripSummaries = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const cutoff = admin.firestore.Timestamp.fromMillis(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    );
    const snapshot = await db.collectionGroup('trips')
      .where('status', '==', 'complete')
      .where('completedAt', '<', cutoff)
      .get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  });
```

This function must be deployed and verified in the Firebase project.

### 5.8 PWA Install Prompt

Do not rely on the browser's default install prompt. Intercept the `beforeinstallprompt` event and store it. Trigger it from a button in the onboarding UI. Without an explicit nudge, users will skip installation and lose offline capability in Shopper Mode — which is the core value proposition of the entire feature.

---

## 6. Internationalization (i18n) & RTL

FamilyCart supports English and Hebrew with full RTL layout. Hebrew is the default language.

### 6.1 Architecture

A lightweight custom i18n system is used instead of i18next to keep the bundle small (~200 unique strings, 2 languages). The API mirrors i18next's `t(key)` pattern, so migration is trivial if needed later.

- **`src/i18n/LanguageContext.tsx`**: `LanguageProvider` wraps the app. Reads/writes `localStorage("familycart_lang")`. Sets `document.documentElement.dir` (`"rtl"` | `"ltr"`) and `document.documentElement.lang` on change.
- **`src/i18n/translations.ts`**: Single file with flat dot-notation keys. Both `en` and `he` objects side by side.
- **`useLanguage()` hook**: Returns `{ t, lang, setLang }`. All components use `const { t } = useLanguage()` to access translations.

### 6.2 Rules for New UI Strings

1. **Never hardcode user-visible text.** All strings go through `t("namespace.key")`.
2. **Add both en and he translations** in `translations.ts` when adding a new key.
3. **Use `{{param}}` interpolation** for dynamic values: `t("items.qty", { label: "2 kg" })`.
4. **Unit values are stored as English keys** in Firestore (e.g. `"kg"`, `"pcs"`). Display them via `t("units." + item.unit)`.
5. **Date formatting** must use locale-aware formatting: `"he-IL"` or `"en-US"` based on current language.

### 6.3 RTL CSS Rules

All layout must be direction-agnostic. Use logical CSS properties:

| Do NOT use | Use instead |
|---|---|
| `border-left`, `borderLeftWidth` | `border-inline-start`, `borderInlineStartWidth` |
| `left-*`, `right-*` (for positioning offsets) | `start-*`, `end-*` |
| `text-left`, `text-right` | `text-start`, `text-end` |
| `ml-*`, `mr-*` | `ms-*`, `me-*` |
| `pl-*`, `pr-*` | `ps-*`, `pe-*` |

Exception: `left-0 right-0` for full-width fixed positioning (e.g. bottom nav) is fine — it's symmetric.

---

## 7. PR/Feature Done Checklist

A task is done when all of the following are true:

- [ ] Code reviewed and approved by at least one other engineer
- [ ] All acceptance criteria from the user story are met
- [ ] QA tasks for the story written and passing
- [ ] No hardcoded user identifiers, credentials, or environment-specific values in committed code
- [ ] Any new Firestore fields present in the data model in this document (or a PR to update it is open and linked)
- [ ] Cloud Function changes deployed to the Firebase project — committed but not deployed does not count as done

---

## 8. Out of Scope — Do Not Build These

| Item | Status |
|---|---|
| Push notifications | Deferred — US-10 is a UI-only visual flag, no push infrastructure |
| Analytics event tracking | Deferred |
| Cost splitting | Deferred |
| Receipt upload | Deferred |
| Trip scheduling | Deferred |
| Custom offline write queue | Removed — Firestore IndexedDB persistence handles this natively |
| State management library (Redux, Zustand, Jotai, etc.) | Not needed — local component state is sufficient at this scale |

---

## 9. PR Checklist

Before opening a pull request, confirm all applicable items:

- [ ] Working from `TECH_ARCHITECTURE v1.1` and `TASK_BREAKDOWN v1.1`
- [ ] No hardcoded identifiers or credentials anywhere in the diff
- [ ] `deleted: true` items are filtered in every `onSnapshot` listener that renders the item list
- [ ] Item creation sets `createdAt`, `addedDuringTripId` (null or tripId), and `deleted: false`
- [ ] Trip creation sets `startedByHouseholdId` and `startedByHouseholdName`
- [ ] Invite generation sets `inviteExpiresAt` to now + 48h
- [ ] Any Cloud Functions in this PR are deployed and verified in the Firebase project, not just committed
- [ ] New user-visible strings use `t()` with keys in both `en` and `he` translation objects
- [ ] CSS uses logical properties (no `ml-*`/`mr-*`/`text-left`/`border-left` etc.)

---

*FamilyCart -- Developer Instructions -- v1.1 -- March 16, 2026*
