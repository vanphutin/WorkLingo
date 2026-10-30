---
{
  "schema_version": 1,
  "id": "MND-20261030-009",
  "status": "verified",
  "created": "2026-10-30",
  "updated": "2026-10-30T08:22:38.508Z",
  "title": "Restore publication regression fixture for Beginner ownership checks",
  "type": "bug",
  "owner": "WorkLingo owner",
  "priority": "P2",
  "confidence": "high",
  "effort": "s",
  "impact": 2,
  "problem": "Five existing topic publication unit tests fail because their transaction mock lacks the required Beginner ownership lookup.",
  "value": "Restore meaningful regression coverage without weakening production guard or existing assertions.",
  "scope": [
    "One existing test fixture and own governance records only.",
    "Scope SHA256 aba6585bf763a62473d8658b052f19c54a61fc36c39a116f5e670802d4e74322."
  ],
  "dedupe_key": "r12b:topic-publication:missing-missionLesson-transaction-double",
  "evidence": [
    {
      "kind": "code",
      "reference": "apps/api/src/intermediate-topics/topic-publication.spec.ts:21",
      "observation": "Transaction fixture lacks missionLesson.findMany required on lesson ownership check."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/beginner/domain/beginner-authoring-policy.ts:55",
      "observation": "Existing guard reads missionLesson associations; must remain enforced."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-30-r12b-publication-fixture-fix-authorization.md:1",
      "observation": "Actual finalization mission authorizes regression repair; baseline reproduces five failures."
    }
  ],
  "acceptance": [
    "Reproduce existing five failures at36bab10 and current revision before edit.",
    "Add missing ownership query fixture and explicit Beginner rejection, retaining all original publication assertions.",
    "Focused suite and broad safe unit regression pass; lint/typecheck and independent review verify test-only change."
  ],
  "risk": {
    "level": "low",
    "breaking": false,
    "data_change": false,
    "external_effect": false,
    "rollback": "Revert only single test file; keep prior failure logs."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-30-r12b-finalization.md",
  "sprint_reference": null,
  "approval": {
    "actor": "WorkLingo product owner (direct current instruction)",
    "reference": "mandate/reports/2026-10-30-r12b-publication-fixture-fix-authorization.md:1",
    "at": "2026-10-30T07:54:24.995Z",
    "proposal_hash": "026b5704f618aa199e1354dc65b5fdff6aa6e51fcc99abba6f2c915d7ce83e03"
  },
  "verification": [
    {
      "command": "Baseline five failures reproduced; topic-publication focused suite 14 passes retains all original cases",
      "result": "passed",
      "reference": "docs/qualification/beginner-r12b-final-test-results.md:30"
    },
    {
      "command": "Broad safe API units 1160 passes; API lint/typecheck and independent fixture review",
      "result": "passed",
      "reference": "docs/qualification/beginner-r12b-final-test-results.md:7"
    }
  ],
  "history": [
    {
      "at": "2026-10-30T07:54:23.548Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-30T07:54:24.280Z",
      "actor": "WorkLingo owner delegated coordinator",
      "from": "captured",
      "to": "triaged",
      "reason": "Five stale fixture failures reproduced at baseline and current; one-file repair preserves guard.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-30T07:54:24.995Z",
      "actor": "WorkLingo product owner (direct current instruction)",
      "from": "triaged",
      "to": "approved",
      "reason": "Actual full regression/fix-until-pass mission verified; exact single-test-file successor with no production change.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-30-r12b-publication-fixture-fix-authorization.md:1"
    },
    {
      "at": "2026-10-30T07:54:25.770Z",
      "actor": "WorkLingo owner delegated engineering coordinator",
      "from": "approved",
      "to": "implementing",
      "reason": "Execute baseline reproduction, fixture correction and Beginner denial assertion; no skipped or weakened tests.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-30T08:22:38.508Z",
      "actor": "WorkLingo owner delegated engineering coordinator",
      "from": "implementing",
      "to": "verified",
      "reason": "Finite engineering acceptance verified against actual logs and independent review; genuine expert, phonetic, real-learner, provider-quality and deployment release gates remain open. No release promotion.",
      "event": "transition",
      "reference": null
    }
  ]
}
---

## Confirmed baseline fixture defect

Five unchanged topic publication tests fail because the transaction mock omits the ownership association query introduced by the Beginner guard. Baseline36bab10 reproduction confirms provenance.

## Exact fix

ScopeSHA aba6585bf763a62473d8658b052f19c54a61fc36c39a116f5e670802d4e74322 permits only that test file plus own register bookkeeping. Add realistic empty non-Beginner associations and an explicit Beginner rejection case. Preserve original assertions and production behavior. Current human full regression mission authorizes this finite correction.
