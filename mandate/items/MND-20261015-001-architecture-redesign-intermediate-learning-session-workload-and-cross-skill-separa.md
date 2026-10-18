---
{
  "schema_version": 1,
  "id": "MND-20261015-001",
  "status": "approved",
  "created": "2026-10-15",
  "updated": "2026-10-16T11:15:51.534Z",
  "title": "Redesign Intermediate learning session workload and cross-skill separation",
  "type": "architecture",
  "owner": "Codex (W0/W2/W3/W4 coordinator)",
  "priority": "P1",
  "confidence": "medium",
  "effort": "l",
  "impact": 4,
  "problem": "Static code selects activity counts by canonical block occurrence rather than estimated workload, while the block contract labels every block 15 minutes. Listening projects referenced text to the learner and renders transcript before submission; incorrect comprehension feedback includes explanations before retry. The supplied consolidation also raises program/CEFR, authoring, mastery and quality gaps, whose live applicability and severity require baseline evidence rather than seed-wide assumptions.",
  "value": "Give learners honest independent versus assisted evidence and give authors actionable workload/content readiness. Evaluate benefit through comprehension, transfer, delayed retention and abandonment rather than question count or longer time alone.",
  "scope": [
    "Intermediate program/level/CEFR mapping discovery and reviewed content",
    "Learning-session workload profiling, duration readiness and versioned planner proposal",
    "Listening API/UI/media, practice/accessibility and feedback/attempt evidence policy",
    "Content authoring/metadata, quality linting and existing Admin workspaces",
    "Mastery/checkpoint, privacy-safe telemetry and controlled pilot decisions",
    "docs/IMPLEMENTATION_ROADMAP.md Increment 5 refinement"
  ],
  "dedupe_key": "learning-session:intermediate-workload-and-listening-leak",
  "evidence": [
    {
      "kind": "code",
      "reference": "apps/api/src/learning-sessions/domain/session-planner.ts:188",
      "observation": "Selection count is based on block occurrences, with Respond retaining at least two, then splice(selectedActivityCount); no workload-duration estimation at this selection point. Inspected statically on 2026-10-16 at efa2fd99b5373a644a011af3787bf81f737a51a7."
    },
    {
      "kind": "code",
      "reference": "packages/contracts/src/learning-session.contracts.ts:30",
      "observation": "Every canonical block has targetMinutes literal 15; this does not measure active learning time."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/learning-sessions/application/learning-sessions.service.ts:187",
      "observation": "getActivity projects referenced content; comprehension questions omit answerIndex/explanation, while referenced text remains in content. Full alternate-channel tests remain proposed work."
    },
    {
      "kind": "code",
      "reference": "apps/web/src/features/learning-session/activity-renderers/listening-activity.tsx:57",
      "observation": "Transcript text feeds LessonAudioPlayer and renders before submission; independent assessment protection must account for browser speech and supported modes."
    },
    {
      "kind": "code",
      "reference": "packages/content-format/src/normalizer.ts:180",
      "observation": "Authoring normalizer emits one question per comprehension activity, distinct from the runtime snapshot schema's multi-question array support."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/learning-sessions/application/learning-sessions.service.ts:544",
      "observation": "Incorrect comprehension feedback includes missed explanations; advance requires score === 1. This does not establish all mastery/checkpoint records are passing."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-16-intermediate-consolidated-source.txt:1",
      "observation": "User-supplied four-report consolidation, dated 2026-10-15, explicitly distinguishes findings, hypotheses, contradictions and unapproved proposals. Original S1-S4 were not independently provided."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-16-intermediate-normalization.md:1",
      "observation": "Records exact checkout, original dirty state, preservation hashes, static evidence, source corrections, dedupe and scope/verification limitations."
    },
    {
      "kind": "document",
      "reference": "docs/DECISIONS.md#d-036--intermediate-b1-additive-path-with-foundation-continuity",
      "observation": "Direct human approval on 2026-10-16 accepts additive reviewed B1 direction while preserving Foundation records; publication, enrollment/data migration and D2-D10 remain gated."
    }
  ],
  "acceptance": [
    "Establish a revision/environment-specific, redacted inventory of published content, separate activities/questions/open tasks and verify plan behavior for all five durations before making live-content claims.",
    "Obtain named program/CEFR, assessment/accessibility, audio, evidence-storage and rollout decisions for each implementation slice; preserve enrollment and historical version bindings.",
    "For approved new independent listening sessions, protect transcript/answer-bearing text across API/UI/media/error/replay channels until the approved finalization boundary; retain usable practice/accessibility support and honest evidence labels.",
    "Record first-attempt/support evidence server-side with idempotency/concurrency guarantees; do not rewrite historical mastery or change weights/checkpoints without policy approval.",
    "Show explainable uncalibrated workload/unknowns and per-duration warnings in existing Admin; calibrate before new hard gates. Distinguish structural playability from estimated sufficiency.",
    "After reviewed content exists, validate a deterministic additive planner in shadow mode with four-skill/order/uniqueness/review/version invariants and no filler; keep legacy parsers and sessions working.",
    "Use qualified content/audio review and a controlled comparison with retention/transfer/abandonment evidence before pilot promotion or adaptive/item analytics expansion."
  ],
  "risk": {
    "level": "high",
    "breaking": true,
    "data_change": true,
    "external_effect": true,
    "rollback": "Risk flags describe potential future program/policy/schema/provider/pilot changes, not actions performed by this document update. Approve slices separately. Preserve immutable versions and histories; switch selection flags only for new sessions, retain policy bindings for existing sessions, and require scoped schema/provider/content rollback before those optional changes."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-16-intermediate-learning-quality.md",
  "sprint_reference": null,
  "approval": {
    "actor": "Human user of current chat",
    "reference": "mandate/reports/2026-10-16-intermediate-approval.md",
    "at": "2026-10-16T11:15:51.534Z",
    "proposal_hash": "2a71633e18a7344fbec31ba75d7185e0b85b442c4af08d0458c50abb2335d5a3"
  },
  "verification": [],
  "history": [
    {
      "at": "2026-10-15T11:15:11.882Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-16T00:58:02.746Z",
      "actor": "mandate-steward",
      "from": "captured",
      "to": "captured",
      "reason": "Proposal revised; prior approval revoked; requires new triage.",
      "event": "update",
      "reference": null
    },
    {
      "at": "2026-10-16T00:58:32.279Z",
      "actor": "mandate-steward",
      "from": "captured",
      "to": "captured",
      "reason": "Proposal revised; prior approval revoked; requires new triage.",
      "event": "update",
      "reference": null
    },
    {
      "at": "2026-10-16T01:22:20.840Z",
      "actor": "mandate-steward",
      "from": "captured",
      "to": "captured",
      "reason": "Proposal revised; prior approval revoked; requires new triage.",
      "event": "update",
      "reference": null
    },
    {
      "at": "2026-10-16T01:22:21.018Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Human accepted the reviewed package; bounded W0 proceeds with downstream gates retained.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-16T01:22:21.202Z",
      "actor": "Human user of current chat",
      "from": "triaged",
      "to": "approved",
      "reason": "Direct human reply duyệt accepts the delivered package within the referenced execution boundaries; unresolved decisions remain gates.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-16-intermediate-approval.md"
    },
    {
      "at": "2026-10-16T05:07:08.202Z",
      "actor": "mandate-steward",
      "from": "approved",
      "to": "captured",
      "reason": "Proposal revised; prior approval revoked; requires new triage.",
      "event": "update",
      "reference": null
    },
    {
      "at": "2026-10-16T05:07:08.324Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Human accepted the reviewed package; bounded W0 proceeds with downstream gates retained.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-16T05:07:08.445Z",
      "actor": "Human user of current chat",
      "from": "triaged",
      "to": "approved",
      "reason": "Direct human reply duyệt accepts the delivered package within the referenced execution boundaries; unresolved decisions remain gates.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-16-intermediate-approval.md"
    },
    {
      "at": "2026-10-16T05:51:00.793Z",
      "actor": "mandate-steward",
      "from": "approved",
      "to": "captured",
      "reason": "Proposal revised; prior approval revoked; requires new triage.",
      "event": "update",
      "reference": null
    },
    {
      "at": "2026-10-16T05:51:00.962Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Direct human ok,tiếp authorizes the next advisory W3 slice; no timing defaults, enforcement, public data mutation, providers or publication inferred.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-16T05:51:01.144Z",
      "actor": "Human user of current chat",
      "from": "triaged",
      "to": "approved",
      "reason": "Direct human ok,tiếp continues the linked plan with advisory W3 implementation and the exact boundaries in the approval record.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-16-intermediate-approval.md"
    },
    {
      "at": "2026-10-16T06:38:58.752Z",
      "actor": "mandate-steward",
      "from": "approved",
      "to": "captured",
      "reason": "Proposal revised; prior approval revoked; requires new triage.",
      "event": "update",
      "reference": null
    },
    {
      "at": "2026-10-16T06:38:59.049Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Bounded authoring continuation authorized directly; broader mandate remains gated.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-16T06:38:59.638Z",
      "actor": "Human user of current chat",
      "from": "triaged",
      "to": "approved",
      "reason": "Direct ok,tiếp after concrete Format 1.2 proposal, with AI selected for review; exact scope and rollback recorded.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-16-intermediate-approval.md"
    },
    {
      "at": "2026-10-16T11:15:51.226Z",
      "actor": "mandate-steward",
      "from": "approved",
      "to": "captured",
      "reason": "Proposal revised; prior approval revoked; requires new triage.",
      "event": "update",
      "reference": null
    },
    {
      "at": "2026-10-16T11:15:51.401Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Direct human approval of concrete W2 policy, isolated implementation and test-only state migration.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-16T11:15:51.534Z",
      "actor": "Human user of current chat",
      "from": "triaged",
      "to": "approved",
      "reason": "Direct duyệt after exact W2 worktree implementation/test-only migration question; scope and rollback recorded.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-16-intermediate-approval.md"
    }
  ]
}
---

## Evidence and canonical plan

Reuse MND-20261015-001 and the linked master plan; no parallel backlog. Static evidence and examined-local W0/W3/W4 results remain in their reports. Imported time estimates are hypotheses.

## Accepted slices

Direct human approvals on 2026-10-16 accepted W0 baseline, D1 additive B1 direction, advisory W3, Format 1.2 grouped authoring and then the concrete W2 policy/plan. Exact messages and rollback are in mandate/reports/2026-10-16-intermediate-approval.md. Whole mandate remains incomplete. W4 authoring is verified in the isolated worktree; candidate B1 lessons remain unpublished/provisional AI-reviewed.

W2 now authorized: execute docs/superpowers/plans/2026-10-16-intermediate-assessment-integrity.md against docs/superpowers/specs/2026-10-16-intermediate-assessment-policy-design.md inline. Add three-mode server policy/private reviewed manifest, one SessionAssessmentState table for pre-answer support, additive immutable attempt evidence, safe projections/media errors and support UI. First complete accepted independent answer closes that cycle; later correction is supported; preserve perfect-score advancement and mastery weights. Generate one migration and apply only to disposable test schemas. One final engineering review and RED/GREEN fixes; keep live selection disabled until real content/media/history qualification.

## Boundaries and rollback

Preserve W0/W3/W4, legacy and placement sessions, versions, normalized answers, scores, enrollment and duration contracts. No public/preview migration, provider costs, B1 publication, admission/enrollment, mastery weighting, timing enforcement, free-speaking executor, commit/merge/push or pilot. Rollback disables new selection; retain bound policy/state readers and do not drop state or rewrite scores. W5-W8 and remaining D3/D6/D8/D10 gates stay open. AI review is selected, never invented human certification.
