---
{
  "schema_version": 1,
  "id": "MND-20261030-008",
  "status": "implementing",
  "created": "2026-10-30",
  "updated": "2026-10-30T07:48:57.663Z",
  "title": "Keep fake evaluation feedback valid when Beginner reference text is blank",
  "type": "bug",
  "owner": "WorkLingo owner",
  "priority": "P1",
  "confidence": "high",
  "effort": "s",
  "impact": 3,
  "problem": "Actual local Beginner writing evaluations fail strict feedback validation because the fake adapter returns an empty correctedExample for empty referenceText.",
  "value": "Complete the local deterministic writing evaluation path while retaining strict schema and honest fake-provider provenance.",
  "scope": [
    "Exact allowlist mandate/reports/2026-10-30-r12b-fake-feedback-fix-scope.json SHA256 2a8b0ce80416fc559ac71e9bca4944062c1440e6d1410e7adca26326f17f8181",
    "Two existing adapter/test files plus own governance records only."
  ],
  "dedupe_key": "r12b:fake-feedback:empty-reference-corrected-example",
  "evidence": [
    {
      "kind": "code",
      "reference": "apps/api/src/ai-gateway/infrastructure/fake-language-evaluation.adapter.ts:49",
      "observation": "Nullish fallback retains empty reference text and violates strict feedback min1."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/teacher-ai/application/evaluation.service.ts:240",
      "observation": "Beginner deliberately passes an empty referenceText."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-30-r12b-fake-feedback-fix-authorization.md:1",
      "observation": "Current direct human instruction authorizes this necessary local integration fix."
    }
  ],
  "acceptance": [
    "Reproduce empty-reference strict-schema failure before implementation for completed and incomplete responses.",
    "Use minimum meaningful fallback; strict schema, nonblank legacy reference and deterministic provider contracts pass.",
    "Fresh real Web/API/Postgres journeys persist writing evaluations under explicit fake provenance; retain earlier failures; review, lint, typecheck and build pass."
  ],
  "risk": {
    "level": "low",
    "breaking": false,
    "data_change": false,
    "external_effect": false,
    "rollback": "Revert only approved fake adapter/test changes; preserve failed receipts and strict schema."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-30-r12b-finalization.md",
  "sprint_reference": null,
  "approval": {
    "actor": "WorkLingo product owner (direct current instruction)",
    "reference": "mandate/reports/2026-10-30-r12b-fake-feedback-fix-authorization.md:1",
    "at": "2026-10-30T07:48:57.330Z",
    "proposal_hash": "1ec2b63547ae602a85cded14b7d94e0ca424f19a476973790598f567821894a2"
  },
  "verification": [],
  "history": [
    {
      "at": "2026-10-30T07:48:40.536Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-30T07:48:56.979Z",
      "actor": "WorkLingo owner delegated coordinator",
      "from": "captured",
      "to": "triaged",
      "reason": "Actual stored writing attempt reproduces strict feedback error; distinct two-file adapter defect.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-30T07:48:57.330Z",
      "actor": "WorkLingo product owner (direct current instruction)",
      "from": "triaged",
      "to": "approved",
      "reason": "Coordinator verified actual finalization and browser/fix-until-pass instruction; exact bounded successor within authorized integration engineering.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-30-r12b-fake-feedback-fix-authorization.md:1"
    },
    {
      "at": "2026-10-30T07:48:57.663Z",
      "actor": "WorkLingo owner delegated engineering coordinator",
      "from": "approved",
      "to": "implementing",
      "reason": "Execute two-file test-first correction; preserve strict schema and all earlier failed receipts.",
      "event": "transition",
      "reference": null
    }
  ]
}
---

## Actual defect

Exact local browser writing jobs fail after submission. A real stored failed attempt reproduced the strict correctedExample min1 violation. Empty referenceText is intentional in Beginner; fake adapter fallback must handle it.

## Scope and authority

The current human mission authorizes fixes in affected integration paths. Scope SHA256 2a8b0ce80416fc559ac71e9bca4944062c1440e6d1410e7adca26326f17f8181 binds the two-file correction and own register files. No real provider, rubric, source, audio or release requirement changes.

## Verification

RED then GREEN contract regression, full related tests and fresh local browser writing evaluation persistence; retain all failed observations.
