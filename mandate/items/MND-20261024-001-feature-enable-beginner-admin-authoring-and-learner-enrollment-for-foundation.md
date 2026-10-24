---
{
  "schema_version": 1,
  "id": "MND-20261024-001",
  "status": "captured",
  "created": "2026-10-24",
  "updated": "2026-10-24T08:53:00.263Z",
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
    },
    {
      "kind": "document",
      "reference": "docs/superpowers/plans/2026-10-24-beginner-implementation.md:1",
      "observation": "On 2026-10-24 the human accepted product direction (one Beginner/two Paths/five Stages/Unit=Mission, editorial 20 Unit/80 Lesson, MG01-MG02 and optional video) and explicitly requested implementation planning/review only. Resource update policy, format/planner/rubric changes, content calibration and all execution permissions remain unapproved."
    }
  ],
  "acceptance": [
    "Preserve recorded directional agreement while requiring scoped human approval before code, migrations, content publication, cohort access or production changes.",
    "Admin authored Foundation/Basic lessons bind to the intended program/path and pass Foundation content validation.",
    "A new learner can enter reviewed Beginner content with a valid program enrollment and resume a version-pinned four-skill session.",
    "Unavailable/unpublished/foreign-program content remains blocked and legacy progress remains unchanged.",
    "Isolated integration/E2E and qualified content review evidence exists before enabling learner selection.",
    "Document 20 Unit / 80 planned Learning Lessons with grammar, pronunciation, vocabulary, R/L/S/W, can-do objectives and hard versus recommended prerequisites; an editorial video plan links only known Lessons.",
    "Pin approved resource versions, captions and transcript to lesson versions with access control, archival/revocation and historical-session behavior.",
    "Main Learning Lessons retain four-skill/evaluated evidence requirements; supplementary videos do not require four skills or create completion/mastery. MVP has no viewing telemetry/percentage.",
    "Describe curriculum revision/cohort compatibility, cross-path transitions and separate Intermediate admission without migrating legacy data.",
    "Use the linked R1-R4 execution proposal for MG01-MG02, with exact-Lesson session selection, real four-skill tasks, compatibility policy, tests, migration safety and rollback; direct-entry Basic/stage transition/analytics are outside this plan and cannot create fake completion.",
    "Compatible supplementary releases may reach currently enrolled learners only under an approved policy that preserves attempts/evaluation/mastery/completion and historical session pins including NONE. Assessment changes require new lesson/curriculum approval; all eight pilot lessons need real source/audio/rubric and timing review before learner acceptance.",
    "Separate R1.2a software/isolated test fixtures from R1.2b real source/audio/reviewer/timed rehearsal; environment-bound release registry must derive IDs/hashes from authorized publication. R1.1 software scope can be approved independently without data writes or learner access.",
    "Regression coverage must prove old pinned Beginner enrollment can start/resume/evaluate and resolve correct supplements after a newer curriculum revision/published pointer, retaining valid superseded versions without latest fallback or global ARCHIVED bypass."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": true,
    "external_effect": false,
    "rollback": "Disable new Beginner admission/selection while preserving published versions, existing enrollments and resumable sessions. Do not delete or rewrite history."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-24-beginner-implementation.md",
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
    },
    {
      "at": "2026-10-24T08:37:33.766Z",
      "actor": "mandate-steward",
      "from": "captured",
      "to": "captured",
      "reason": "Proposal revised; prior approval revoked; requires new triage.",
      "event": "update",
      "reference": null
    },
    {
      "at": "2026-10-24T08:53:00.263Z",
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

## Current planning proposal (not execution approval)

Use [docs/superpowers/plans/2026-10-24-beginner-implementation.md](../../docs/superpowers/plans/2026-10-24-beginner-implementation.md) as the proposed R1-R4 implementation plan, linked to the existing refinement, Knowledge Map and production plan. The human directionally accepted one Beginner Program, two Paths, five Stages, Unit=Mission, 20 Unit/80 Lesson editorial framework, MG01-to-MG02 and optional video. This records the actual 2026-10-24 planning request; it does not authorize execution or change status to approved.

New source-backed gaps: current curriculum revision lookup selects the first Lesson; current Foundation authoring supports shadowing and a fixed minimum word floor; activity count checks do not prove a 45-minute lesson. The plan proposes explicit Lesson targeting, additive Beginner format/planner/rubrics and eight real source/audio task packages. All eight remain PLANNED until authored, reviewed and timed.

The proposed compatible supplementary release layer is a deliberate exception to the earlier all-binding-changes-require-new-curriculum policy. A fifth release concept, immutable asset versions and session pin/NONE preserve historical sessions and assessment evidence while offering new reviewed supplementary material to the same base LessonVersion. This policy is awaiting human approval; assessment changes still require new LessonVersion/CurriculumRevision/manifest approval.

## Authority, dependencies and rollback

Mandate remains captured with approval=null. Implementation, migrations, test-data import, publication, learner cohort, merge/push/deploy/public access need their own matching authorization. R1 core authoring/content precedes R2 closed-cohort progression; R3 library can be separate; R4 binding/player depends on R1/R3 and R2 for learner acceptance. Basic direct-entry, full-stage checkpoints/transitions, Intermediate admission and analytics are outside R1-R4.

Rollback disables new admission/writes/player and retains history, immutable content/files and readers/evaluators for active sessions. Do not downgrade to readers that cannot parse new Beginner payloads. Do not drop referenced data or reset progress. Intermediate/IELTS/Foundation legacy/PR18 implementation and databases are untouched by this planning task.

## Review delta before implementation approval (2026-10-24)

Human requested four bounded plan corrections only: split R1.2a software/fixtures from R1.2b real content/audio/pedagogy; clarify environment-bound registry lifecycle and actual published IDs/hashes; test old pinned enrollment start/resume/evaluation/supplements after newer revision/pointer; retain contract45 with human timed rehearsal. The linked plan now records these as proposed acceptance and independent R1.1 software-only approval scope, not authorization to execute.

Targeted source review found content-publisher.service.ts automatically archives the previous published version, while curriculum eligibility requires PUBLISHED bindings. The proposed Beginner-only supersession policy preserves valid old versions; current Intermediate/IELTS archive behavior remains unchanged. No implementation or DB change was made to fix it in this review.

R2 software tests can use approved isolated fixtures after R1.1/R1.2a; real-cohort release still requires R1.2b CONTENT_READY, target publication/registry and explicit cohort permission. R1.1 alone excludes migrations, publication/data import, live providers, real content/media and learner opening. Mandate stays captured/approval=null.
