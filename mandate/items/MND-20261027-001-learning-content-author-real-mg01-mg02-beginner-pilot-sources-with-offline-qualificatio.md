---
{
  "schema_version": 1,
  "id": "MND-20261027-001",
  "status": "triaged",
  "created": "2026-10-27",
  "updated": "2026-10-27T11:04:15.776Z",
  "title": "Author real MG01 MG02 Beginner pilot sources with offline qualification and honest readiness gates",
  "type": "learning-content",
  "owner": "Codex",
  "priority": "P1",
  "confidence": "high",
  "effort": "l",
  "impact": 4,
  "problem": "The selected MG01 to MG02 pilot has a verified1.2 planner and editorial map but no real authored source files. Existing R1.2a/main-DB approvals do not authorize R1.2b content authoring; audio, teacher review and observed timing are missing.",
  "value": "Provide8 complete teacher-reviewable lessons and reproducible offline checks without pretending that scripts, synthetic media, activity counts or software approval establish real learning readiness.",
  "scope": [
    "Offline R1.2b text authoring only; separate child of captured parent MND-20261024-001",
    "Exact11 create paths:8 real lesson sources,1 qualification report and2 pure test-only checker files",
    "MG01-L1 first; then7 distinct lessons;64 assessed activities and32 required single-skill objectives",
    "Reuse actual Foundation1.2 parser, exact-version45-minute planner, rubric registry and learner redaction",
    "No media/provider/DB/live API/publication/learner/product-code changes; preserve6 optional PLANNED VP slots",
    "Human pedagogy, real audio and measured timing remain explicit gates; no verified/CONTENT_READY while missing",
    "Explicit local commits after checks only; no merge/push/deploy or R2/R3/R4"
  ],
  "dedupe_key": "beginner:r12b:mg01-mg02:real-source-offline-authoring-with-human-audio-timing-gates",
  "evidence": [
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-27-beginner-r12b-preapproval-review.md:1",
      "observation": "Targeted preapproval audit confirms no pilot sources and no distinct R1.2b approval; current parent and R1.2a statuses preserved."
    },
    {
      "kind": "document",
      "reference": "docs/superpowers/plans/2026-10-24-beginner-implementation.md:192",
      "observation": "Canonical R1.2b specifies eight real lessons/audio,64 assessed activities,16 skill objectives per Unit and human timed rehearsal."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/learning-sessions/domain/beginner-session-planner.ts:10",
      "observation": "Shipped planner enforces exact selected version, format1.2,45 minutes and3R/3L/1S/1W, independent of a database."
    },
    {
      "kind": "document",
      "reference": "docs/superpowers/specs/2026-10-24-beginner-knowledge-map.md:11",
      "observation": "Pilot MG01/MG02 content, can-do objectives and hard/recommended prerequisites exist as an editorial frame, not authored content."
    }
  ],
  "acceptance": [
    "Eight distinct original complete draft sources match the mapped MG01/MG02 can-do, grammar, pronunciation and vocabulary scope; no synthetic cloned pilot or scaffold completion.",
    "Exactly64 assessed activities and32 required single-skill objectives (16 per Unit), complete answer/rubric/evidence/script references and existing planner compatibility.",
    "Offline parser/planner/learner-projection/rubric checks run with real source files; malformed/missing/leaking cases fail; tool tests use fixtures separately and record actual results.",
    "Eight-row qualification dossier records source hashes, actual audio status, reviewer and rehearsal evidence; no fabricated actors/media/timings or readiness.",
    "Do not mark R1.2b verified or CONTENT_READY until all8 real reviewed audio sets, human pedagogy/rubric approval and actual timed rehearsal meet separately approved human criteria.",
    "Preserve6 authoritative optional VP slots; no resource metadata, product code change, DB/provider/publication/learner action or scope beyond the exact approved files.",
    "Validate register and links/hashes, record PASS/FAIL/NOT_RUN honestly, and commit reviewed text/test changes only after matching execution approval and focused checks."
  ],
  "risk": {
    "level": "medium",
    "breaking": false,
    "data_change": false,
    "external_effect": false,
    "rollback": "Revert only unpublished owned authoring/checker/report changes or retain NOT_READY drafts; preserve review history, never alter DB/media/learner history or referenced versions."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-27-beginner-r12b-content-authoring.md",
  "sprint_reference": null,
  "approval": null,
  "verification": [],
  "history": [
    {
      "at": "2026-10-27T11:03:38.219Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-27T11:03:38.437Z",
      "actor": "mandate-steward",
      "from": "captured",
      "to": "captured",
      "reason": "Proposal revised; prior approval revoked; requires new triage.",
      "event": "update",
      "reference": null
    },
    {
      "at": "2026-10-27T11:04:15.776Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "R1.2b offline source scope reconciled with actual1.2 planner/map,11 exact future files and explicit audio/human/timing gates. Ready for human scope/hash review only; no execution approval.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-27-beginner-r12b-preapproval-review.md:1"
    }
  ]
}
---

## Scope and dependency

Child R1.2b content authoring under MND-20261024-001, separate from R1.2a and main-DB qualification. This request is permission to prepare scope only, not execution approval. Follow docs/superpowers/plans/2026-10-27-beginner-r12b-content-authoring.md.

Exact future content/test allowlist:11 create paths in mandate/reports/2026-10-27-beginner-r12b-scope.json; no existing product file edits. Source/plan/review fingerprints are locked before execution.

Plan SHA-256(LF): fd1a0372b68e4f1c53f385702353435fe988e217443c7a8e7ce185c381a79dc7
Review SHA-256(LF): 81f9cedbde1d2ecc98e164152fb1aa0780b74ed26f6145519f8d7c067fca6d86
Allowlist fingerprint: 04bf2fa42b7bb9b6eab47256161adbdd7771f47ecab6026ff023d96ef6c1df86
Baseline fingerprint: 4166536f1822a405e3f8a03e0ea6f3652f5f5bae8c7643cdca221001e3d31285
Scope SHA-256(LF): 886e57a2a18a1bce5887be162bebba55122eeac5a676a22a58f7ca7fd43e6653

## Proposed execution

Author MG01-L1 and qualify it first, then seven distinct real sources:8 Lessons,64 activities,32 skill objectives. Reuse actual1.2 parser/snapshot/exact-version planner/rubric/projection through a narrow pure offline checker. Preserve optional six VP codes and core curriculum/prerequisites. Teacher-required lexical support and proposed AmE are not claimed approved content.

## Human and media limits

This proposal grants text/offline authoring only after matching approval, not audio production, real TTS/AI/STT, DB/API/browser preview or publication. Audio/human review/timing remain missing. No verified R1.2b or CONTENT_READY until actual real-audio/teacher/timing gates pass; technical source completion is only a milestone. Later media/publication operations need independent scope and authority.

## Prohibited and rollback

No migration/reset/seed/import/release/enrollment/provider calls, OS changes, R2/R3/R4, merge/push/deploy. No fake audio/resource/published IDs, teacher approvals or timing records. Rollback only unpublished owned source/checker/report files; preserve history and DB. Parent stays captured/null; other mandates keep their states.
