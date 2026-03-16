# Archived Sections from DEVELOPER_INSTRUCTIONS.md

**Archived on:** 2026-03-16
**Reason:** These sections were removed during a prune of the developer instructions. They contain sprint-specific planning, version migration warnings, and process guidance that are no longer actionable now that all sprints are complete.

---

## Section 1: Reference Documents (original)

Always work from the v1.1 versions of the architecture and task breakdown. The v1.0 documents from the CTO have been superseded.

| Document | Version | What Changed |
|---|---|---|
| `TECH_ARCHITECTURE.md` | v1.1 | Data model extended; Cloud Functions added to stack; offline persistence clarified; pilot auth guardrails added |
| `TASK_BREAKDOWN.md` | v1.1 | Sprint rebalanced; offline queue tasks reclassified; Cloud Function deploy tasks made explicit |

If you are looking at a document that does not say v1.1 at the bottom, you have the wrong version.

---

## Section 8: Sprint Plan (original)

| Sprint | Stories | Focus | SP |
|---|---|---|---|
| **Sprint 1** | US-00c, US-00d, US-01, US-05 | Household setup + attribution | 55 |
| **Sprint 2** | US-02, US-03, US-04, US-06 | Core list + purchased view | 66 |
| **Sprint 3** | US-07, US-08 | Shopper Mode + offline check-off | 39 |
| **Sprint 4** | US-09, US-10, US-11, US-12, NFR-03 | Trip actions, summary, retention | 43 |

**Sprint 2 is the heaviest sprint.** US-04 (soft-delete, undo, ownership enforcement, real-time broadcast of edit/delete/undo events) is the most technically complex story in the entire breakdown. If the team surfaces velocity concerns at the Sprint 1 retro, US-06 is the designated candidate to slide to Sprint 3 — it has no dependencies on US-02 through US-04 and moves cleanly.

**Sprint 3 is intentionally lighter.** The offline persistence work in US-08 involves multi-device and multi-network-state testing that is hard to estimate. The headroom is deliberate.

---

## Section 12: Raising Blockers (original)

Raise blockers and open questions in the team channel immediately. Do not silently invent a solution that contradicts this document — it will be caught in review and cost more time than asking upfront. The architecture and task breakdown are settled. What is not settled is implementation detail within those constraints, and that is the right place to exercise engineering judgment.
