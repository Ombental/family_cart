# FamilyCart — MVP Technical Architecture
**For:** Tech Lead → Dev Team
**From:** CTO (v1.0) · Updated by Tech Lead (v1.1)
**Date:** February 22, 2026
**Scope:** Minimum viable pilot — get it in front of Design Partners

> **v1.1 changes:** Data model extended to match task requirements; soft-delete mechanism named explicitly; offline persistence clarified; pilot user provisioning guardrails added. All changes marked **[TL]**.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| PWA | vite-plugin-pwa (Workbox) |
| UI | Tailwind CSS + shadcn/ui |
| Database | Firebase Firestore |
| Backend logic | Firebase Cloud Functions (Node.js) |
| Hosting | Firebase Hosting |

> **[TL]** Cloud Functions added explicitly. They are required for soft-delete expiry (US-04) and 30-day trip summary purge (NFR-03). This is not optional — Firestore has no native TTL or scheduled delete.

---

## Data Model (Firestore)

```
/groups/{groupId}
  name
  inviteCode
  inviteExpiresAt              ← [TL] added — regenerate per invite; expire after 48h

/groups/{groupId}/households/{householdId}
  name
  color

/groups/{groupId}/items/{itemId}
  name, qty, unit, notes
  householdId
  status: "pending" | "bought" | "missed"
  createdAt                    ← [TL] added — required for US-10 "newly added" flag
  addedDuringTripId            ← [TL] added — tripId if added during active trip; null otherwise
  deleted                      ← [TL] added — boolean; soft-delete flag
  deletedAt                    ← [TL] added — timestamp; Cloud Function purges after 5s window

/groups/{groupId}/trips/{tripId}
  startedAt
  completedAt
  status: "active" | "complete"
  startedByHouseholdId         ← [TL] added — required to identify active shopper for conflict screen
  startedByHouseholdName       ← [TL] added — denormalised; avoids second read on conflict check
```

### Why the denormalised `startedByHouseholdName`

The conflict screen (US-07-T03/T05) must display the active shopper's name immediately. A second Firestore read to `/households/{id}` on every conflict check adds latency and a failure surface. Store the name at trip creation. If the household renames itself mid-trip, the in-flight trip shows the name it started with — acceptable for a pilot.

---

## Key Implementation Notes

### Real-Time Sync

Firestore `onSnapshot` on `/groups/{groupId}/items`. Filter out `deleted: true` items client-side before rendering.

```javascript
onSnapshot(itemsRef, (snapshot) => {
  const items = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(item => !item.deleted);
  setItems(items);
});
```

### Offline (Shopper Mode)

**Firestore handles the offline queue natively. Do not build a custom one.**

Enable persistence on app init:

```javascript
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open — persistence only works in one tab at a time
    console.warn('Offline persistence unavailable: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Offline persistence not supported in this browser');
  }
});
```

When offline, Firestore queues writes to IndexedDB and flushes on reconnect automatically. FE work for US-08 is:

1. Detect connectivity state via `navigator.onLine` + the `online`/`offline` window events.
2. Show/hide the offline banner accordingly.
3. Trust Firestore to sync queued writes. Do not build a parallel queue.

> **[TL]** US-08-T04 ("Implement offline queue: BE, 5 SP") has been reclassified and reduced. See updated TASK_BREAKDOWN.

### Soft-Delete + Undo (US-04)

**On delete (client):**

```javascript
await updateDoc(itemRef, {
  deleted: true,
  deletedAt: serverTimestamp()
});
```

**On undo (client, within 5s window):**

```javascript
await updateDoc(itemRef, {
  deleted: false,
  deletedAt: null
});
```

**Cloud Function — purges permanently, runs every minute:**

```javascript
// functions/src/purgeDeletedItems.ts
exports.purgeDeletedItems = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - 10_000); // 10s grace buffer
    const snapshot = await db.collectionGroup('items')
      .where('deleted', '==', true)
      .where('deletedAt', '<', cutoff)
      .get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  });
```

Worst-case, a soft-deleted item is permanently gone ~70 seconds after deletion. Acceptable for a pilot. If exact 5-second enforcement is required later, replace with Cloud Tasks.

The `onSnapshot` listener filters `deleted: true` items immediately on the client — the list updates without waiting for the Cloud Function.

### Concurrent Trip Conflict

```javascript
const activeTrip = await getDocs(
  query(tripsRef, where('status', '==', 'active'), limit(1))
);
if (!activeTrip.empty) {
  const trip = activeTrip.docs[0].data();
  showConflictModal(trip.startedByHouseholdName);
}
```

### "Newly Added" Item Flagging (US-10)

When an item is added while a trip is active, set `addedDuringTripId` to the current `tripId`. In Shopper Mode, the `onSnapshot` listener checks this field to drive the visual flag and top-of-list placement:

```javascript
const isNewlyAdded = item.addedDuringTripId === activeTripId;
```

### 30-Day Trip Summary Purge (NFR-03)

```javascript
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

### PWA Install

Add an explicit "Add to Home Screen" nudge during onboarding. Intercept `beforeinstallprompt` and trigger it from a button in the UI — do not rely on the browser prompt appearing on its own.

---

## Household Identity

Household identity is generated dynamically. Users enter a household name in the app's setup flow, which creates a UUID via `crypto.randomUUID()` and persists both in localStorage. The `useHousehold()` hook reads these values at runtime. No env vars or seed scripts are needed.

---

## Out of Scope (This Phase)

- Full authentication system
- State management library — local component state is fine at this scale
- Push notifications
- Analytics / event tracking
- Cost splitting, receipt upload, trip scheduling
- Custom offline queue — Firestore IndexedDB persistence handles this natively

---

*FamilyCart · MVP Architecture · v1.1 · Updated February 22, 2026*
