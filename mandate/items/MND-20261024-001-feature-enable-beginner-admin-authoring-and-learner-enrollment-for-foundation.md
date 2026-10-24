---
{
  "schema_version": 1,
  "id": "MND-20261024-001",
  "status": "captured",
  "created": "2026-10-24",
  "updated": "2026-10-24T08:12:23.171Z",
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
    "Learning Lesson versus Supplementary Resource boundary; optional video without playback mastery"
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
    },
    {
      "kind": "document",
      "reference": "docs/superpowers/specs/2026-10-24-beginner-final-refinement.md:1",
      "observation": "Human requested final design refinement only: complete Lesson knowledge map and editorial production plan, compare pilots, minimize Video MVP and separate readiness states; no implementation approval."
    }
  ],
  "acceptance": [
    "Confirm one Beginner program with two paths versus two separate programs before implementation.",
    "Admin authored Foundation/Basic lessons bind to the intended program/path and pass Foundation content validation.",
    "A new learner can enter reviewed Beginner content with a valid program enrollment and resume a version-pinned four-skill session.",
    "Unavailable/unpublished/foreign-program content remains blocked and legacy progress remains unchanged.",
    "Isolated integration/E2E and qualified content review evidence exists before enabling learner selection.",
    "Document 20 Unit / 80 planned Learning Lessons with grammar, pronunciation, vocabulary, R/L/S/W, can-do objectives and hard versus recommended prerequisites; an editorial video plan links only known Lessons.",
    "Pin approved resource versions, captions and transcript to lesson versions with access control, archival/revocation and historical-session behavior.",
    "Main Learning Lessons retain four-skill/evaluated evidence requirements; supplementary videos do not require four skills or create completion/mastery. MVP has no viewing telemetry/percentage.",
    "Describe curriculum revision/cohort compatibility, cross-path transitions and separate Intermediate admission without migrating legacy data.",
    "Recommend sequential MG01+MG02 pilot, keep stage transition disabled, and isolate direct-entry Basic assessment/exemption in R5 without fake completion. Define R0-R6 dependencies/acceptance/rollback and remaining product decisions."
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
    },
    {
      "at": "2026-10-24T08:12:23.171Z",
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

## Current refinement (proposed)

Use docs/superpowers/specs/2026-10-24-beginner-final-refinement.md as the current pilot/MVP/dependency proposal, with its linked 80-Lesson Knowledge Map and planned Video Production Plan. It refines the original design and reuses the same mandate/backlog. Recommend MG01+MG02 for learning progression; one Beginner/two Paths/five Stages/Unit=Mission remain unapproved options. Supplementary Resource is not a Learning Lesson and does not produce competence evidence. Video Library MVP has four resource concepts, exact version access/history and reviewed captions/transcript; ResourceEngagement/coverage/analytics are deferred to R6.

## Remaining authority and scope

Product choices in refinement section8 remain awaiting approval. Direct-entry Basic assessment/admission is required before R5, not before initial F0 pilot. Lesson readiness, Unit mastery and Stage transition readiness are separate; pilot completion is not CEFR certification. No code, paid AI, media production, migrations, seed, publication, legacy conversion or public access was performed or approved. Intermediate/IELTS/Foundation legacy/PR18 remain untouched.
