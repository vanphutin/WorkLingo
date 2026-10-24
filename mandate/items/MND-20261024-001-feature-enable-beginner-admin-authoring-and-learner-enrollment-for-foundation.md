---
{
  "schema_version": 1,
  "id": "MND-20261024-001",
  "status": "captured",
  "created": "2026-10-24",
  "updated": "2026-10-24T05:59:22.849Z",
  "title": "Enable Beginner admin authoring and learner enrollment for Foundation and Basic pathways",
  "type": "feature",
  "owner": null,
  "priority": "P1",
  "confidence": "high",
  "effort": "l",
  "impact": 4,
  "problem": "Foundation/Basic is deliberately deferred in Admin and Beginner access is denied; onboarding initializes only Intermediate and the local DB has no learning programs or lessons. Flipping the menu/status cannot produce a usable learner journey.",
  "value": "Give Admin a correctly scoped beginner authoring flow and learners a reviewed, resumable entry route without corrupting Intermediate or legacy Foundation history. Support future instructor-produced video without requiring it to launch text/audio-based lessons or equating viewing with competence.",
  "scope": [
    "Beginner Admin workspace and program/path binding",
    "Foundation/Basic curriculum content readiness",
    "Beginner enrollment/onboarding, policy, roadmap and learner session boundaries",
    "Beginner curriculum entry/exit, staged unit map and pilot design",
    "Versioned instructor-owned Learning Resources, captions/transcript, lesson placements and authorized streaming",
    "Media engagement isolated from activity completion and evaluated competency"
  ],
  "dedupe_key": "beginner-foundation-basic-admin-and-learner-entry-readiness",
  "evidence": [
    {
      "kind": "code",
      "reference": "apps/web/src/features/admin-dashboard/admin-sidebar.tsx:62",
      "observation": "Foundation/Basic selector is disabled."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/learning-programs/domain/program-availability.ts:14",
      "observation": "Beginner is not an approved program destination."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/learning-programs/application/program-context.service.ts:80",
      "observation": "Enrollment initialization is Intermediate-specific."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-24-foundation-basic-readiness.md:1",
      "observation": "Human requested analysis of both Admin and learner journeys on 2026-10-24; aggregate local DB and options are documented, not implementation approval."
    },
    {
      "kind": "document",
      "reference": "docs/superpowers/specs/2026-10-24-beginner-curriculum-resources-design.md:1",
      "observation": "Direct human request on 2026-10-24 expands analysis to detailed Beginner curriculum, optional future video, reusable resource versions, learner/Admin flows and staged tests/rollback. This is analysis authorization only."
    }
  ],
  "acceptance": [
    "Confirm one Beginner program with two paths versus two separate programs before implementation.",
    "Admin authored Foundation/Basic lessons bind to the intended program/path and pass Foundation content validation.",
    "A new learner can enter reviewed Beginner content with a valid program enrollment and resume a version-pinned four-skill session.",
    "Unavailable/unpublished/foreign-program content remains blocked and legacy progress remains unchanged.",
    "Isolated integration/E2E and qualified content review evidence exists before enabling learner selection.",
    "Document a Pre-A1 to A2 map and concrete pilot with hard versus recommended prerequisites and planned video slots.",
    "Pin approved resource versions, captions and transcript to lesson versions with access control, archival/revocation and historical-session behavior.",
    "Optional video absence must not block a complete lesson; media telemetry must never grant objective/mastery evidence.",
    "Describe curriculum revision/cohort compatibility, cross-path transitions and separate Intermediate admission without migrating legacy data.",
    "Define independent increments with acceptance/tests/rollback and explicit product decisions before implementation."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": true,
    "external_effect": false,
    "rollback": "Disable new Beginner admission/selection while preserving published versions, existing enrollments and resumable sessions. Do not delete or rewrite history."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": null,
  "sprint_reference": null,
  "approval": null,
  "verification": [],
  "history": [
    {
      "at": "2026-10-24T05:32:13.568Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-24T05:59:22.849Z",
      "actor": "mandate-steward",
      "from": "captured",
      "to": "captured",
      "reason": "Proposal revised; prior approval revoked; requires new triage.",
      "event": "update",
      "reference": null
    }
  ]
}
---

## Analysis

Extend the existing Beginner proposal, do not create a competing roadmap. See docs/superpowers/specs/2026-10-24-beginner-curriculum-resources-design.md and mandate/reports/2026-10-24-foundation-basic-readiness.md. Recommend Unit=Mission, one Beginner program/two paths, optional video bindings pinned to reviewed resource versions, and enrollment-specific curriculum manifests. These remain proposed choices.

## Unknowns and authority

Section10 of the design lists product decisions awaiting approval. No implementation, media production, paid AI, DB migration/seed, publication, legacy conversion or public release is approved by this analysis. Existing Intermediate PR18 has already merged and is untouched. The resource lifecycle and API/data structures are design proposals, not implemented models.
