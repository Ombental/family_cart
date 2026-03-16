# TECH_ARCHITECTURE v1.1 -- Pruned Sections

**Archived on:** 2026-03-16
**Reason:** Heavy prune of TECH_ARCHITECTURE_v1.1.md to produce a compact, evergreen architecture reference. Sections below were removed or substantially rewritten.

---

## Removed: Document Header / Pilot Framing

Original lines 1-7:

```
# FamilyCart — MVP Technical Architecture
**For:** Tech Lead → Dev Team
**From:** CTO (v1.0) · Updated by Tech Lead (v1.1)
**Date:** February 22, 2026
**Scope:** Minimum viable pilot — get it in front of Design Partners

> **v1.1 changes:** Data model extended to match task requirements; soft-delete mechanism named explicitly; offline persistence clarified; pilot user provisioning guardrails added. All changes marked **[TL]**.
```

---

## Removed: [TL] Annotation on Stack Table

Original note after Stack table:

```
> **[TL]** Cloud Functions added explicitly. They are required for soft-delete expiry (US-04) and 30-day trip summary purge (NFR-03). This is not optional — Firestore has no native TTL or scheduled delete.
```

---

## Removed: [TL] Annotations on Data Model Fields

All `← [TL] added — ...` inline comments were removed from the data model. The fields are now documented without provenance markers.

---

## Removed: Verbose Denormalised Name Rationale

Original section:

```
### Why the denormalised `startedByHouseholdName`

The conflict screen (US-07-T03/T05) must display the active shopper's name immediately. A second Firestore read to `/households/{id}` on every conflict check adds latency and a failure surface. Store the name at trip creation. If the household renames itself mid-trip, the in-flight trip shows the name it started with — acceptable for a pilot.
```

Replaced with a shorter inline note stating the tradeoff without pilot framing.

---

## Removed: Soft-Delete Pilot Caveat

Original line:

```
Worst-case, a soft-deleted item is permanently gone ~70 seconds after deletion. Acceptable for a pilot. If exact 5-second enforcement is required later, replace with Cloud Tasks.
```

Replaced with neutral framing noting the ~70s worst-case and the Cloud Tasks alternative.

---

## Removed: Concurrent Trip Conflict Pilot Caveat

The original `createTrip` code comment and surrounding text contained:

```
NOTE: This check-then-write is NOT wrapped in a Firestore transaction.
At pilot/design-partner scale the race-condition window is narrow and
acceptable. For production, wrap in a transaction or use a Cloud Function
with a transaction to guarantee atomicity.
```

Replaced with neutral framing noting check-then-write as a known limitation.

---

## Removed: [TL] Annotation on Offline Section

Original note:

```
> **[TL]** US-08-T04 ("Implement offline queue: BE, 5 SP") has been reclassified and reduced. See updated TASK_BREAKDOWN.
```

---

## Removed: "This Phase" Language in Out of Scope

Original heading was `## Out of Scope (This Phase)`. Changed to `## Out of Scope`.

---

## Removed: Seed Script / Env Var References

The "Household Identity" section previously contained references to env vars and seed scripts (cleaned up in earlier passes). The section was rewritten to reflect the current runtime-generated identity approach without those references.

---

## Removed: Footer

Original:

```
*FamilyCart · MVP Architecture · v1.1 · Updated February 22, 2026*
```
