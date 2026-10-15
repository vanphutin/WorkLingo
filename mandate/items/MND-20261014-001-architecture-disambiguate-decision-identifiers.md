---
{
  "schema_version": 1,
  "id": "MND-20261014-001",
  "status": "captured",
  "created": "2026-10-14",
  "updated": "2026-10-14T12:23:22.243Z",
  "title": "Disambiguate decision identifiers",
  "type": "architecture",
  "owner": null,
  "priority": "P2",
  "confidence": "high",
  "effort": "s",
  "impact": 2,
  "problem": "DECISIONS.md assigns D-022 to both the Increment 3 evidence policy and the durable Teacher AI decision, so references using only D-022 are ambiguous.",
  "value": "Engineers and audit agents can resolve technical decision references without confusing progression policy with Teacher AI retention.",
  "scope": [
    "docs/DECISIONS.md",
    "architecture/decision-traceability"
  ],
  "dedupe_key": "architecture:decision-id-d-022-ambiguity",
  "evidence": [
    {
      "kind": "document",
      "reference": "docs/DECISIONS.md:3",
      "observation": "Heading uses D-022 for Increment 3 evidence and progression policy."
    },
    {
      "kind": "document",
      "reference": "docs/DECISIONS.md:164",
      "observation": "A second heading uses D-022 for durable Teacher AI and retention."
    }
  ],
  "acceptance": [
    "Every technical decision has an unambiguous canonical identifier or explicit legacy alias mapping.",
    "Existing D-022 references are located and clarified without altering accepted decision substance."
  ],
  "risk": {
    "level": "low",
    "breaking": false,
    "data_change": false,
    "external_effect": false,
    "rollback": "Revert only the approved documentation mapping changes; retain accepted decision content."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": null,
  "sprint_reference": null,
  "approval": null,
  "verification": [],
  "history": [
    {
      "at": "2026-10-14T12:23:22.243Z",
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

Two distinct decisions share D-022 in the current working-tree document. This is a confirmed documentation ambiguity, not a runtime defect. Inspection date: 2026-10-14. Source lines are cited in metadata.

## Value and alternatives

Prefer a documentation-only canonical identifier/legacy alias mapping, then clarify dependent references. Do not rewrite accepted decision substance or use the duplicate as permission to redesign progression or AI.

## Unknowns and dependencies

The number of downstream references and the responsible documentation owner have not been established. No sprint assignment, implementation plan or human approval exists.

## Implementation and verification proposal

After owner triage and scoped approval, inspect decision references, choose a mapping, test uniqueness/resolution with a focused document check and review linked plans. No migration or runtime change is proposed.
