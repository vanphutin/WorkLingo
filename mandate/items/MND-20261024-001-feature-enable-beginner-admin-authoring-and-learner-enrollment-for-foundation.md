---
{
  "schema_version": 1,
  "id": "MND-20261024-001",
  "status": "captured",
  "created": "2026-10-24",
  "updated": "2026-10-24T05:32:13.568Z",
  "title": "Enable Beginner admin authoring and learner enrollment for Foundation and Basic pathways",
  "type": "feature",
  "owner": null,
  "priority": "P1",
  "confidence": "high",
  "effort": "l",
  "impact": 4,
  "problem": "Foundation/Basic is deliberately deferred in Admin and Beginner access is denied; onboarding initializes only Intermediate and the local DB has no learning programs or lessons. Flipping the menu/status cannot produce a usable learner journey.",
  "value": "Give Admin a correctly scoped beginner authoring flow and learners a reviewed, resumable entry route without corrupting Intermediate or legacy Foundation history.",
  "scope": [
    "Beginner Admin workspace and program/path binding",
    "Foundation/Basic curriculum content readiness",
    "Beginner enrollment/onboarding, policy, roadmap and learner session boundaries"
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
    }
  ],
  "acceptance": [
    "Confirm one Beginner program with two paths versus two separate programs before implementation.",
    "Admin authored Foundation/Basic lessons bind to the intended program/path and pass Foundation content validation.",
    "A new learner can enter reviewed Beginner content with a valid program enrollment and resume a version-pinned four-skill session.",
    "Unavailable/unpublished/foreign-program content remains blocked and legacy progress remains unchanged.",
    "Isolated integration/E2E and qualified content review evidence exists before enabling learner selection."
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
    }
  ]
}
---

## Analysis

See mandate/reports/2026-10-24-foundation-basic-readiness.md. Recommend one existing Beginner program with two scoped paths to minimize catalog and enrollment churn; two separate programs remain an explicit product choice. Existing admin import, Foundation objectives and immutable curriculum can be reused.

## Unknowns

Program split, entry/exit criteria, qualified content owner, pilot pack, duration policy and optional AI authoring schema remain unapproved. No production seed, migration, enrollment or publication was performed. This captured proposal is not release or implementation approval.
