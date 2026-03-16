# FamilyCart -- Technical Architecture

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript |
| PWA | vite-plugin-pwa (Workbox) |
| UI | Tailwind CSS + shadcn/ui |
| Database | Firebase Firestore |
| Backend logic | Firebase Cloud Functions (Node.js) |
| Hosting | Firebase Hosting |

Cloud Functions handle soft-delete expiry and 30-day trip summary purge. Firestore has no native TTL or scheduled delete.

---

## Data Model (Firestore)

```
/groups/{groupId}
  name
  inviteCode
  inviteExpiresAt                ← regenerated per invite; expires after 48h

/groups/{groupId}/households/{householdId}
  name
  color

/groups/{groupId}/items/{itemId}
  name, qty, unit, notes
  householdId
  status: "pending" | "bought"
  createdAt                      ← serverTimestamp; drives sort order
  addedDuringTripId              ← tripId if added during active trip; null otherwise
  deleted                        ← boolean; soft-delete flag
  deletedAt                      ← timestamp; Cloud Function purges after grace window

/groups/{groupId}/trips/{tripId}
  startedAt
  completedAt                    ← null while active; serverTimestamp on completion
  status: "active" | "complete"
  startedByHouseholdId
  startedByHouseholdName         ← denormalised (see note below)
  purchasedItems                 ← array of {name, qty, unit, householdId}; populated at trip completion
```

**`startedByHouseholdName` denormalisation:** Stored at trip creation to avoid an extra read on conflict checks. If the household renames mid-trip, the in-flight trip retains the original name.

**`purchasedItems` archival:** On trip completion, all items with `status === "bought"` are snapshotted into this array and hard-deleted from the items collection. This keeps the items collection lean and provides a self-contained trip summary.

---

## Key Implementation Notes

### Real-Time Sync

Firestore `onSnapshot` on `/groups/{groupId}/items`. Soft-deleted items (`deleted: true`) are filtered client-side before rendering.

### Offline

`enableIndexedDbPersistence` is called on app init. Firestore queues writes to IndexedDB when offline and flushes on reconnect automatically. No custom offline queue.

The UI detects connectivity via `navigator.onLine` + `online`/`offline` window events and shows/hides an offline banner.

### Soft-Delete + Undo

**On delete:** Set `deleted: true` and `deletedAt: serverTimestamp()`.

**On undo (within 5s):** Set `deleted: false` and `deletedAt: null`.

**Purge (Cloud Function, every 1 min):** Hard-deletes items where `deleted === true` and `deletedAt` is older than 10s. Worst-case, a soft-deleted item is permanently gone ~70s after deletion. For tighter enforcement, replace with Cloud Tasks.

The `onSnapshot` listener filters out deleted items immediately -- the list updates without waiting for the Cloud Function.

### Concurrent Trip Conflict

Before creating a trip, query for `status === "active"` (limit 1). If one exists, surface a conflict dialog showing the active shopper's name.

This is a check-then-write (not transactional). A narrow race window exists where two households could create trips simultaneously. Transactions would be needed at scale to guarantee one-active-per-group atomicity.

### "Newly Added" Item Flagging

Items added during an active trip have `addedDuringTripId` set to the current trip ID. Shopper Mode uses this to flag and surface newly added items.

### 30-Day Trip Summary Purge

A Cloud Function runs every 24 hours and hard-deletes completed trips where `completedAt` is older than 30 days.

### PWA Install

Intercept `beforeinstallprompt` and trigger from a UI button during onboarding. Do not rely on the browser prompt.

---

## Household Identity

Users enter a household name in the setup flow. A UUID is generated via `crypto.randomUUID()` and both values persist in localStorage. The `useHousehold()` hook reads them at runtime.

---

## Out of Scope

- Full authentication system
- State management library (local component state suffices)
- Push notifications
- Analytics / event tracking
- Cost splitting, receipt upload, trip scheduling
- Custom offline queue (Firestore IndexedDB persistence handles this)
