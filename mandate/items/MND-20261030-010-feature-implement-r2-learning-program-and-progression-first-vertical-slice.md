---
{
  "schema_version": 1,
  "id": "MND-20261030-010",
  "status": "implementing",
  "created": "2026-10-30",
  "updated": "2026-10-30T12:22:06.481Z",
  "title": "Implement R2 Learning Program and Progression first vertical slice",
  "type": "feature",
  "owner": "WorkLingo owner",
  "priority": "P1",
  "confidence": "high",
  "effort": "l",
  "impact": 4,
  "problem": "The repository has immutable curriculum and learner roadmap primitives, but no generic Admin program publication workflow, exact program curriculum pins, learner enrollment bootstrap, or target-bound lesson start for a real Admin-to-Learner progression journey.",
  "value": "Enable a safe, local vertical slice where Admin publishes a program over exact immutable curriculum revisions and a learner enrolls, resumes lessons, completes required activities, and unlocks prerequisites without relying on unqualified AI mastery scores.",
  "scope": [
    "Generic Admin program metadata create/update/publish with role, revision and idempotency guards",
    "Exact published CurriculumRevision pinning and additive progression policy",
    "Learner enrollment/context bootstrap and immutable enrollment revision pins",
    "Pinned roadmap, target-bound lesson start, completion and prerequisite unlock/resume",
    "Accessible Admin and learner UI using existing contracts/client patterns",
    "Isolated PostgreSQL/API/browser qualification and truthful report"
  ],
  "dedupe_key": "r2:learning-program-progression:first-vertical-slice",
  "evidence": [
    {
      "kind": "code",
      "reference": "apps/api/src/learning-programs/application/program-context.service.ts:1",
      "observation": "Activation requires a pre-existing Intermediate enrollment/current level and cannot bootstrap a generic program."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/learning-programs/domain/program-availability.ts:1",
      "observation": "Program access is limited to hard-coded Intermediate and IELTS destinations."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/curriculum-foundation/application/curriculum-progress.service.ts:1",
      "observation": "Completion projection currently reads evaluated evidence and mastery together, so completion policy is coupled to mastery."
    },
    {
      "kind": "document",
      "reference": "docs/superpowers/specs/2026-10-30-r2-learning-program-progression-design.md:1",
      "observation": "Bounded R2 design defines exact revision pins, activity-completion policy and rollback limits."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-30-r2-authorization.md:1",
      "observation": "Current human master mission authorizes this exact bounded successor and conditional integration."
    }
  ],
  "acceptance": [
    "Admin can create and publish a non-reserved program over a nonempty ordered set of exact PUBLISHED curriculum revisions owned by that program.",
    "Publication rejects foreign, archived, empty, multi-lesson or cyclic revision bindings and stale/idempotency conflicts.",
    "Completed-onboarding learner enrollment is idempotent, concurrency-safe and pins the published revision list without resetting old progress.",
    "Pinned roadmap distinguishes locked, available, in-progress and completed; target-bound start rejects stale/foreign/locked revisions.",
    "Required activity evidence completes ACTIVITY_COMPLETION curriculum independent of evaluation score/mastery and exact prerequisite completion unlocks the next revision.",
    "Real isolated API/browser journey covers Admin create/publish, learner enroll/start/attempt/complete/unlock/resume and dashboard reload.",
    "Existing programs retain current access/mastery behavior; Beginner remains closed and no deployment occurs while R1 release gates are blocked."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": true,
    "external_effect": false,
    "rollback": "Disable new R2 program selection and revert only feature commits; retain published revisions, enrollments, sessions, completion receipts and audit history."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-30-r2-learning-program-progression.md",
  "sprint_reference": null,
  "approval": {
    "actor": "WorkLingo product owner (human user, transcribed by Codex)",
    "reference": "mandate/reports/2026-10-30-r2-authorization.md:1",
    "at": "2026-10-30T12:22:03.117Z",
    "proposal_hash": "01c01f2243cf1a26e523b1c8832c0f98d76daf2b53f0266f70617484dcb672e4"
  },
  "verification": [],
  "history": [
    {
      "at": "2026-10-30T12:20:13.356Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-30T12:21:36.253Z",
      "actor": "Codex coordinator",
      "from": "captured",
      "to": "triaged",
      "reason": "Current master mission explicitly scopes bounded R2 vertical slice; independent builder check resolved routine implementation choices",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-30T12:22:03.117Z",
      "actor": "WorkLingo product owner (human user, transcribed by Codex)",
      "from": "triaged",
      "to": "approved",
      "reason": "Actual current master mission orders autonomous R2 implementation and delegates ordinary design/plan decisions within exact bounded successor scope",
      "event": "transition",
      "reference": "mandate/reports/2026-10-30-r2-authorization.md:1"
    },
    {
      "at": "2026-10-30T12:22:06.481Z",
      "actor": "Codex coordinator",
      "from": "approved",
      "to": "implementing",
      "reason": "Execute linked R2 plan with test-first isolated engineering and independent review; no public Beginner release or deploy",
      "event": "transition",
      "reference": null
    }
  ]
}
---

## Analysis

Existing modules contain the hierarchy, immutable curriculum revisions, eligibility, sessions and roadmap, but the generic authoring/enrollment/progression bridge is absent. Reusing those boundaries gives one vertical slice without creating duplicate curriculum concepts. Completion must be policy-driven so unqualified AI provider scores never become authoritative mastery.

## Unknowns

The main database has no program/curriculum rows; qualification therefore uses seeded isolated schemas. Existing Admin UI capability is limited and will be extended only for the bounded metadata/publication flow. External deployment target and release gates remain unresolved; no deployment is authorized by this mandate.
