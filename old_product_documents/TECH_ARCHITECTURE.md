# FamilyCart — MVP Technical Architecture
**For:** Tech Lead  
**From:** CTO  
**Date:** February 22, 2026  
**Scope:** Minimum viable pilot — get it in front of Design Partners

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| PWA | vite-plugin-pwa (Workbox) |
| UI | Tailwind CSS + shadcn/ui |
| Database | Firebase Firestore |
| Hosting | Firebase Hosting |

That's it.

---

## Data Model (Firestore)

```
/groups/{groupId}
  name, inviteCode

/groups/{groupId}/households/{householdId}
  name, color

/groups/{groupId}/items/{itemId}
  name, qty, unit, notes
  householdId
  status: "pending" | "bought" | "missed"

/groups/{groupId}/trips/{tripId}
  startedAt, completedAt
  status: "active" | "complete"
```

---

## Key Implementation Notes

### Real-Time Sync
Firestore `onSnapshot` on `/groups/{groupId}/items`. All household members see updates live.

### Offline (Shopper Mode)
Enable on app init — this is non-negotiable for the shopper-in-store use case:
```javascript
enableIndexedDbPersistence(db);
```

### Concurrent Trip Conflict
Before starting a trip, check for any `/trips` doc with `status === "active"`. If found, block and show the "Trip Already Active" modal. One active trip per group at a time.

### PWA Install
Add an explicit "Add to Home Screen" nudge during onboarding. Without it, users skip install and lose offline. Don't rely on the browser prompt alone.

---

## Out of Scope (This Phase)

- Authentication — hardcode or manually provision pilot users for now
- State management library — local component state is fine at this scale
- Push notifications
- Analytics / event tracking
- Cost splitting, receipt upload, trip scheduling

---

*FamilyCart · MVP Architecture · v1.0*
