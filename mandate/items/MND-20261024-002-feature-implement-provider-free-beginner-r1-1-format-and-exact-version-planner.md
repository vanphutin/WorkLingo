---
{
  "schema_version": 1,
  "id": "MND-20261024-002",
  "status": "implementing",
  "created": "2026-10-24",
  "updated": "2026-10-24T09:19:23.956Z",
  "title": "Implement provider-free Beginner R1.1 format and exact-version planner",
  "type": "feature",
  "owner": "Codex",
  "priority": "P1",
  "confidence": "high",
  "effort": "l",
  "impact": 4,
  "problem": "The selected Beginner R1.1 requires additive 1.2 content, a provider-free exact-version planner, versioned rubric dispatch and guarded learner DTOs, while current parser accepts only 1.0/1.1 and runtime import creation writes before parsing. The parent mandate is broader and cannot authorize this bounded software increment without separate approval.",
  "value": "Prepare a testable software-only Beginner foundation while keeping learner access, persistent data, real content/media, providers and later increments closed.",
  "scope": [
    "R1.1 only; parent MND-20261024-001 remains captured",
    "Exact allowlist in linked review: 17 existing source files, 4 new source files and 17 unit/component test files",
    "Additive Foundation1.2 INSTRUCTION/guided_response/min_words and immutable versioned rubric registry/dispatch",
    "Pure 45-minute Beginner planner with required expectedLessonVersionId and no resolver or first/latest selection",
    "Beginner manifest schema/canonical hash, additive DTO instructions and learner answer redaction",
    "Default-deny1.2 runtime create/update/validate/publish before writes; mocks/synthetic fixtures only",
    "Legacy regression and scoped lint/typecheck/build; no migrations/data/provider calls/publication/learner opening/merge/push/deploy"
  ],
  "dedupe_key": "beginner:r1.1:provider-free-format-exact-version-planner",
  "evidence": [
    {
      "kind": "document",
      "reference": "mandate/items/MND-20261024-001-feature-enable-beginner-admin-authoring-and-learner-enrollment-for-foundation.md:1",
      "observation": "Parent Beginner proposal is captured and includes R1-R4, not an R1.1 execution approval."
    },
    {
      "kind": "document",
      "reference": "docs/superpowers/plans/2026-10-24-beginner-implementation.md:1",
      "observation": "Latest human-selected R1.1 scope excludes implementation until matching human approval, and isolates data/publication in later increments."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-24-beginner-r11-preapproval-review.md:1",
      "observation": "Dated source/contract/allowlist review, baseline and proposal boundaries; selection and capture are not approval."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/curriculum/domain/curriculum.types.ts:69",
      "observation": "PublishedMission carries a single lessonVersion snapshot/ID; pure planner does not need to select the first lesson."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/content-authoring/application/content-imports.service.ts:46",
      "observation": "Current create writes a draft without parsing version first, so the1.2 guard must precede writes."
    }
  ],
  "acceptance": [
    "New1.2 syntax/instructions/guided response/min_words normalize correctly;1.0/1.1 and existing Intermediate/IELTS behavior unchanged in relevant unit regression.",
    "Planner selects3R/3L/1S/1W into3x15-minute blocks from only the supplied snapshot; expected version mismatch fails and no first/latest/DB lookup occurs.",
    "Manifest schema/hash deterministic; object key order normalized, array order preserved, malformed/wrong binding inputs rejected.",
    "Exact id/version rubric dispatch and result provenance; unknown rubric/version fails before provider call; no change to existing weights or historical outcomes.",
    "Learner DTO redaction hides internal answers/models/rubrics for Beginner assessment, preserves intentional legacy shadowing and optional instruction DTO through client validation.",
    "Runtime1.2 import/update/validate/publish disabled before any writes/jobs/provider calls; tests use mocks and synthetic fixtures only.",
    "Test-first red/green, legacy unit/component regressions, scoped lint/typecheck/build all reported; skipped or blocked checks not called PASS.",
    "No Prisma/schema/migrations/seed/real DB/content/provider/learner access/future increments or automatic merge/push/deploy; any allowlist expansion requires renewed scope review/approval."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": false,
    "external_effect": false,
    "rollback": "Preactivation code-only revert/disable while preserving all existing1.0/1.1 readers and output. No data downgrade/delete/regrade. If any1.2 referenced history is discovered, stop and preserve compatible reader before rollback."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-24-beginner-implementation.md",
  "sprint_reference": null,
  "approval": {
    "actor": "WorkLingo product owner",
    "reference": "mandate/reports/2026-10-24-beginner-r11-human-approval.md:1",
    "at": "2026-10-24T09:19:23.807Z",
    "proposal_hash": "571187f39dc43213dd39f19c37f3b4cc76ab374faa55082e64229c13add5df82"
  },
  "verification": [],
  "history": [
    {
      "at": "2026-10-24T09:08:37.526Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-24T09:18:59.767Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Human approved owner=Codex only; no other proposal field changes.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-24T09:19:23.807Z",
      "actor": "WorkLingo product owner",
      "from": "triaged",
      "to": "approved",
      "reason": "Direct human approval for exact R1.1 proposal hash 571187f39dc43213dd39f19c37f3b4cc76ab374faa55082e64229c13add5df82.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-24-beginner-r11-human-approval.md:1"
    },
    {
      "at": "2026-10-24T09:19:23.956Z",
      "actor": "Codex",
      "from": "approved",
      "to": "implementing",
      "reason": "All approved hashes/baselines reverified; execute only provider-free R1.1 allowlist.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-24-beginner-r11-human-approval.md:1"
    }
  ]
}
---

## Parent and exact implementation scope

Parent [MND-20261024-001](MND-20261024-001-feature-enable-beginner-admin-authoring-and-learner-enrollment-for-foundation.md) stays captured/approval=null. This child is software-only R1.1, not the Beginner launch mandate. Read [scope review](../reports/2026-10-24-beginner-r11-preapproval-review.md) and [plan R1.1](../../docs/superpowers/plans/2026-10-24-beginner-implementation.md).

Plan SHA-256 UTF-8 LF: 165fc3e8cbcf7ce1b2245974fa7cb40cc0c75b10cb31cf87fe2557f6a922c96b. Scope-review SHA-256 UTF-8 LF: c114dbcc2d8cecf2c6b9fba84a882b382b065137c378874d0c57419f808c7b2c. Exact allowlist fingerprint: 3dad13875964ae06d41c94cd314d9a548794022d6b1dd82f26efc714e96160d5. Existing source/test baseline fingerprint: baef0869f96d715139af966ce290375177280cfe787d65608e9c76f0bdec34ef. These artifacts must still match at approval/execution; scope or source changes require review/recapture.

## Human authority boundary

On2026-10-24 the human selected R1.1 as first scope and explicitly required capture/review before code, no automatic mandate approval, and stopping if a valid scope/hash approval is absent. This authorizes this proposal capture only; no approval source, owner signature or approved transition is invented. No execution has started.

## Delivery and exclusions

Pure/offline contracts/parser/normalizer/planner/rubric/DTO code and mock unit/component tests only, on an isolated feature branch after explicit human approval. Future R2 resolver supplies exact snapshot and expectedLessonVersionId; R1.1 must not implement resolver, session-start wiring or DB access to prove binding. No migrations/seed/data import/publication, Beginner enrollment, real AI/STT, R1.2/R2/R3/R4, merge/push/deploy.

## Verification and rollback

Use test-first red/green and scoped legacy regression/lint/typecheck/build from the linked review. Not run in capture stage. Do not turn skips into PASS. Runtime1.2 default-deny guards remain closed; rollback code before activation without changing data/history. Parent remains captured and R1.2a will need a distinct permission for test fixture publication.
