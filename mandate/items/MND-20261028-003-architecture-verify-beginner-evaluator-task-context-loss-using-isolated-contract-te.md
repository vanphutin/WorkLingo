---
{
  "schema_version": 1,
  "id": "MND-20261028-003",
  "status": "implementing",
  "created": "2026-10-28",
  "updated": "2026-10-28T12:16:59.932Z",
  "title": "Verify Beginner evaluator task context loss using isolated contract tests without product changes",
  "type": "architecture",
  "owner": "Codex",
  "priority": "P1",
  "confidence": "high",
  "effort": "m",
  "impact": 4,
  "problem": "Static evaluator request carries generic prompt/rubric identifiers but not retained role-card facts or responseRubrics. Actual grading error is not reproduced.",
  "value": "Resolve uncertainty before real learner evaluation;prevent silent false-positive/negative grading and DTO leakage.",
  "scope": [
    "Beginner R1.2b MG01/MG02 only",
    "evaluator-context",
    "Exact allowlist 62c98d25f7d4ffc15f07ac3021d6ee39a2dd14df2e58d014b28774f836cb86d5"
  ],
  "dedupe_key": "beginner:r12b:post-ai-review:evaluator-context:69b559e",
  "evidence": [
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-28-beginner-successors-capture-authorization.md:1",
      "observation": "Direct owner permits capture only;Option B selected for a separate future policy."
    },
    {
      "kind": "document",
      "reference": "docs/qualification/beginner-pilot-pedagogy-review.json:1",
      "observation": "Exact current AI history has1 PASS7 REVISE,4 correction accepts2 defers;0 proven individual human version signoffs."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-28-beginner-successor-evaluator-context-scope.json:1",
      "observation": "Frozen baseline/exact allowlist/dependencies/acceptance captured;implementation has not run."
    }
  ],
  "acceptance": [
    "Create only four approved test/report files; product read-only; configuration uses safe Beginner transpiler,no ordinary vitest config,.env,DB or real network/providers.",
    "Capture evaluateAttempt request and mock-fetch serialized OpenAI/Discovery requests/routing for two synthetic exact-version cards with opposite fact correctness under same prompt/response; inspect alternate context paths.",
    "Separate characterization from desired-context assertions; report desired-contract FAIL as finding,not masked by characterization PASS. Fake semantic score cannot establish real-provider grading correctness.",
    "Check rubric ID/version/skill dispatch,referenceText/requiredPhrases,acceptable alternatives,exact historical V1 evaluation and snapshot mismatch denial; retain private cache LessonVersion binding.",
    "Learner DTO exposes needed public card only; no model/private rubric/key/listening transcript; compare Foundation1.0/1.1 and Intermediate/IELTS request/projection regressions.",
    "Report confirmed static omission versus mocked-contract reproduction versus unknown real-provider behavior separately; no production-bug claim without evidence.",
    "If omission confirmed,capture proposed product-fix scope separately after owner authorization; no product fix here. Investigation complete is not P1 resolved; actual evaluator use blocked until corrective verification closes finding.",
    "Run focused isolated tests,lint/typecheck/build as applicable without secrets/network/DB; report FAIL/BLOCKED/skipped honestly."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": false,
    "external_effect": false,
    "rollback": "Revert only four new files via scoped commit if implemented;retain actual finding evidence and do not declare unresolved P1 closed."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-28-beginner-successor-evaluator-context.md",
  "sprint_reference": null,
  "approval": {
    "actor": "WorkLingo product owner (direct human authorization)",
    "reference": "mandate/reports/2026-10-28-beginner-successors-execution-approval.md:1",
    "at": "2026-10-28T12:16:59.678Z",
    "proposal_hash": "84f561d607ebb4dbc17dab70dccfab6a267eba41a3de5ab9def437aa945be8c3"
  },
  "verification": [],
  "history": [
    {
      "at": "2026-10-28T11:43:08.527Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-28T12:16:59.430Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Review frozen scope and assign captured owner without scope changes",
      "event": "transition",
      "reference": "mandate/reports/2026-10-28-beginner-successors-execution-approval.md:1"
    },
    {
      "at": "2026-10-28T12:16:59.678Z",
      "actor": "WorkLingo product owner (direct human authorization)",
      "from": "triaged",
      "to": "approved",
      "reason": "Record exact unified human execution approval;no scope expansion",
      "event": "transition",
      "reference": "mandate/reports/2026-10-28-beginner-successors-execution-approval.md:1"
    },
    {
      "at": "2026-10-28T12:16:59.932Z",
      "actor": "Codex",
      "from": "approved",
      "to": "implementing",
      "reason": "Begin only approved allowlist;enforce dependencies and safety gates",
      "event": "transition",
      "reference": "mandate/reports/2026-10-28-beginner-successors-execution-approval.md:1"
    }
  ]
}
---

## Captured successor, not execution approval

Parent MND-20261027-003 remains implementing with original acceptance. Capture authority: mandate/reports/2026-10-28-beginner-successors-capture-authorization.md.

Frozen scope: mandate/reports/2026-10-28-beginner-successor-evaluator-context-scope.json SHA-256 75670a34444ab32bd90c13c5f4114c54a4e6779f67224752272ad1a6580c19ed. Plan SHA-256 LF 0997698af90c00c2e5c6dc59cf785e4178139134fec959f0c136a6d7c9f5e7a1. Baseline HEAD 69b559e9475d08c67cb4920b13c8e0f034eabaf3; baseline fingerprint 7b987f9303a45ecae83204fecff7bd3fb870e6052c7a76aa22ce651045dcd183; exact allowlist fingerprint 62c98d25f7d4ffc15f07ac3021d6ee39a2dd14df2e58d014b28774f836cb86d5.

## Dependencies and boundaries
Runs first;does not depend on content correction or AI-led policy.
Finding may require separately captured and approved fix mandate;verification approval never authorizes product writes.

Only declared new successor result lifecycle may apply after matching approval;no retroactive human signoff. No provider/DB/OS/publication/Gate C. Matching execution approval required. Runtime tests NOT_RUN.

## Facts and unknowns
Static evaluator request carries generic prompt/rubric identifiers but not retained role-card facts or responseRubrics. Actual grading error is not reproduced. No real learner timing or real-provider grading result inferred. See scope details and acceptance for evidence and escalation.
