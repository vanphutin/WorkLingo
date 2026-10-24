---
{
  "schema_version": 1,
  "id": "MND-20261024-003",
  "status": "implementing",
  "created": "2026-10-24",
  "updated": "2026-10-24T10:57:17.951Z",
  "title": "Implement isolated Beginner R1.2a admin authoring and test release registry",
  "type": "feature",
  "owner": "Codex",
  "priority": "P1",
  "confidence": "high",
  "effort": "l",
  "impact": 4,
  "problem": "Verified R1.1 provides additive format/planner/privacy and default-deny guards, but Beginner has no scoped Admin workspace/editor/review/preview or environment-bound release registry. Existing publication archives prior versions and generic test configuration permits application DB fallback, so enabling authoring without a bounded policy would break history and environment safety.",
  "value": "Allow Admin to author and verify Beginner lessons in an explicitly approved isolated fixture environment, preserving historical versions, existing programs and learner privacy without fabricating content readiness.",
  "scope": [
    "R1.2a only; parent captured and predecessor verified remain frozen",
    "Exact allowlist:24 existing/46 new files, including2 future governance notes; no implicit paths",
    "Admin tree with2 Paths/5 Stages/20 Units/80 editorial Lessons and planned video metadata, not seeded records",
    "Format1.2 editor, technical validation, source-bound independent review and safe exact-version Admin preview",
    "Server-created scope/environment capability; generic runtime1.2 stays default-deny; no role/body/URL bypass",
    "Atomic scoped publication and target-bound receipts; exclusive Beginner supersession preserves valid V1",
    "Environment-bound fixture registry; real IDs/hashes only after separate test publication permission",
    "Unit/component, authorized isolated integration/E2E and legacy checks; no actual content or learner opening",
    "No migrations files/production/providers/R1.2b/R2/R3/R4/merge/push/deploy; data permissions separately required"
  ],
  "dedupe_key": "beginner:r1.2a:isolated-admin-authoring-preview-test-release",
  "evidence": [
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-24-beginner-r12a-preapproval-review.md:1",
      "observation": "Dated R1.2a source/scope/security review, exact file allowlist and proposed test environment boundaries; no implementation approval."
    },
    {
      "kind": "document",
      "reference": "docs/superpowers/plans/2026-10-24-beginner-r12a-implementation.md:1",
      "observation": "Scoped expansion of existing master R1.2a task, preserving verified R1.1 plan and approval hashes."
    },
    {
      "kind": "document",
      "reference": "mandate/items/MND-20261024-002-feature-implement-provider-free-beginner-r1-1-format-and-exact-version-planner.md:1",
      "observation": "Predecessor R1.1 is verified; its default-deny behavior remains the shared default."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/content-authoring/application/content-publisher.service.ts:610",
      "observation": "Current publisher archives the prior current LessonVersion, requiring exclusive Beginner supersession handling without altering legacy semantics."
    },
    {
      "kind": "code",
      "reference": "apps/api/prisma/schema.prisma:776",
      "observation": "ContentImport has optional lessonId but no explicit programId, requiring trusted relational target binding."
    },
    {
      "kind": "code",
      "reference": "apps/api/vitest.config.ts:10",
      "observation": "Existing test configuration falls back to application DATABASE_URL, so a dedicated fail-closed environment is required."
    }
  ],
  "acceptance": [
    "Admin workspace displays planned metadata with real status overlays; no automatic20-Unit/80-Lesson seeding or fake LearningResource/CONTENT_READY.",
    "CONTENT_ADMIN/SYSTEM_ADMIN plus trusted environment/action capability and relational ownership required before writes; direct/generic API, self-review, stale review and wrong-program mutations reject.",
    "Editor round-trip preserves source; exact1.2 readiness checks cover R/L/S/W, guided response, min_words, supported rubric, evidence and actual test audio/file hashes.",
    "Learner-mode preview shares canonical redaction/renderer behavior, uses explicit selected snapshot/version and writes no learner/session/progress/attempt/mastery/recording state.",
    "Scoped target/import/environment-bound idempotency and locks preserve atomicity on conflicts; exclusively Beginner V2 preserves valid V1/C1 and old snapshot reads/resume/evaluation; legacy archival semantics stay unchanged.",
    "Dedicated database/role/storage/registry and trusted approval-root preflight fail closed; no root .env/application DB fallback or real provider calls. Separate human environment permission required before connection/setup/write/publication.",
    "Export actual test publication IDs/receipts/source/snapshot/asset/manifest hashes; fixture stays FIXTURE_ONLY; actual approved test registry requires candidate-specific human authorization, never auto approval from tests.",
    "Report red/green, focused unit/component and authorized integration/E2E plus lint/typecheck/build and relevant1.0/1.1/Intermediate/IELTS regression; blocked/skipped checks never PASS.",
    "No schema changes, real content, production writes, automatic learner admission, later increment implementation or unauthorized Git integration. Any scope/baseline drift requires renewed approval."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": true,
    "external_effect": false,
    "rollback": "Disable scoped mutations/selection; before data revert only approved software slices. After test publication preserve immutable versions/readers/registry/audio/receipts until exact run ownership and reference-safe cleanup are verified under separate permission. Never delete learner history, regrade, unarchive withdrawn versions or change Intermediate/IELTS defaults."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-24-beginner-r12a-implementation.md",
  "sprint_reference": null,
  "approval": {
    "actor": "WorkLingo product owner",
    "reference": "mandate/reports/2026-10-24-beginner-r12a-human-approval.md:1",
    "at": "2026-10-24T10:57:17.790Z",
    "proposal_hash": "1170d5b91963b53ca848e87d0fcca85683f7a68746467531b06dcf12f3b13e49"
  },
  "verification": [],
  "history": [
    {
      "at": "2026-10-24T10:47:36.089Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-24T10:57:17.628Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Review scope and exact allowlist against the owner-approved hash; separate software permission from all environment/data/publication gates.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-24T10:57:17.790Z",
      "actor": "WorkLingo product owner",
      "from": "triaged",
      "to": "approved",
      "reason": "Direct human approval of R1.2a software only for proposal1170d5b91963b53ca848e87d0fcca85683f7a68746467531b06dcf12f3b13e49; no database, fixture publication, actual release or learner access permission.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-24-beginner-r12a-human-approval.md:1"
    },
    {
      "at": "2026-10-24T10:57:17.951Z",
      "actor": "Codex",
      "from": "approved",
      "to": "implementing",
      "reason": "All five approval bindings and exact source baseline matched. Begin only approved source-code TDD with mocks; DB/integration/E2E/publication remain blocked.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-24-beginner-r12a-human-approval.md:1"
    }
  ]
}
---

## Relationship and authority

Parent: mandate/items/MND-20261024-001-feature-enable-beginner-admin-authoring-and-learner-enrollment-for-foundation.md (captured / approval=null).

Predecessor: mandate/items/MND-20261024-002-feature-implement-provider-free-beginner-r1-1-format-and-exact-version-planner.md (verified; approval/verification frozen).

This is a distinct R1.2a child, not a duplicate implementation of R1.1 or approval of the broader parent. Owner Codex is assigned at capture. Current human request authorizes only documents/review/capture; approval=null.

## Bound artifacts

Plan: docs/superpowers/plans/2026-10-24-beginner-r12a-implementation.md; SHA-256 60ff2caff21f5d5352cf84c89fbbc6ddca27e1644bff452007f7875cd2a031e6.

Scope review: mandate/reports/2026-10-24-beginner-r12a-preapproval-review.md; SHA-256 ab66a7196bf5e9488265f786238202f7c5ccab46d0301cfaa305f95936679336.

Exact allowlist: mandate/reports/2026-10-24-beginner-r12a-scope.json; fingerprint 5c976d313378bd6fb5cb1831cf03ec0af9ed24cbfdafc842fb08d826a5538259.

Source baseline fingerprint: ec1bea8b364bb983af76cf595b35a2ab347bc713571ba9fe59eebecf04c1dd13. HEAD 5963dbf7ed5b448b77c8a8b3b48f476a90694caf; branch codex/foundation-basic-readiness; clean at capture baseline.

Master plan retained at SHA-256 165fc3e8cbcf7ce1b2245974fa7cb40cc0c75b10cb31cf87fe2557f6a922c96b.

Hashes of plan/review normalize CRLF to LF; allowlist/baseline fingerprints use recursively sorted-key JSON, array order retained; baseline per-file hashes use raw bytes. Verify all bindings immediately before implementation; any drift stops execution.

## Explicit gates

No test environment is approved. Software approval must match this proposal hash and exact file allowlist. Separate permission must name actual dedicated DB/role/storage/registry/approval-root and read/provision/schema setup/fixture import/audio attachment/test publication/cleanup actions before those actions occur.

No new migration files or application seed. Applying existing migrations to a dedicated test DB requires explicit environment/schema-setup permission; never infer it from software approval.

Actual test release approval must reference the actual candidate/environment/hash after real publication. Product-owner authorization is verified by a trusted operator and recorded in a runtime read-only approval source outside app-writable roots; API roles cannot mint authority. Fixture approval mocks stay isolated and cannot be exported as real approval.

Proposed independent source-editor/reviewer policy applies equally to fixtures; it remains a human-reviewable choice in this proposal.

## Acceptance and rollback

Use the linked task/matrix plan. SOFTWARE_READY, TEST_PUBLISHED, approved test release and CONTENT_READY are separate outcomes. R1.2a software is not blocked by absent R1.2b content, but full DB/E2E acceptance needs separate permissions. Old-pin new-start/admission and supplementary release remain R2/R4 gates, not claimed here.

No implementation, data/provider calls, learner opening, commit/merge/push/deploy are authorized by this capture. Future feature-branch commits need matching execution approval and relevant accepted gates. No silent allowlist expansion.

## Review evidence and unknowns

Source review and one independent read-only builder check completed; trust-anchor/self-review ambiguities resolved in the proposed plan. Preapproval checks are register/link/hash/baseline/document checks only, no runtime tests.

Open human decisions: approve exact software scope/hash and independent review/trusted authorization model; separately designate actual isolated target/operator/ACL and permitted test actions; later approve real test candidate hash. No real content/audio/reviewer/timed rehearsal belongs to this child.
