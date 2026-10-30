---
{
  "schema_version": 1,
  "id": "MND-20261030-011",
  "status": "implementing",
  "created": "2026-10-30",
  "updated": "2026-10-30T14:14:16.144Z",
  "title": "Complete R2 immutable program releases enrollment and progression platform",
  "type": "feature",
  "owner": "Codex",
  "priority": "P1",
  "confidence": "high",
  "effort": "l",
  "impact": 5,
  "problem": "The verified R2 slice has mutable program metadata and UUID pins but lacks release lifecycle, enrollment administration/history, configurable readiness/retention and program-version analytics.",
  "value": "Administrators safely evolve programs; learners retain exact historical releases and evidence-backed progression.",
  "scope": [
    "Program releases and curriculum authoring integration",
    "Enrollment lifecycle and history",
    "Deterministic progression and versioned review retention",
    "Learner and Admin UI plus aggregate analytics",
    "Actual vocabulary identity/provenance integration",
    "Disposable DB and actual API/browser regression; merge and push after gates"
  ],
  "dedupe_key": "r2:full-platform:releases-enrollment-progression-retention",
  "evidence": [
    {
      "reference": "docs/qualification/r2-learning-program-progression-report.md:1",
      "kind": "document",
      "observation": "Existing verified result is a bounded vertical slice, not the full platform."
    },
    {
      "reference": "apps/api/prisma/schema.prisma:171",
      "kind": "code",
      "observation": "Program revision/pins do not provide a release lifecycle or enrollment history."
    },
    {
      "reference": "docs/superpowers/specs/2026-10-30-r2-full-learning-program-platform-design.md:1",
      "kind": "document",
      "observation": "Scoped full-platform design derived from current owner mission."
    }
  ],
  "acceptance": [
    "Immutable program release lifecycle with exact curriculum bindings and authorized optimistic commands.",
    "Enrollment admin/self-service lifecycle and history preserve enrolled versions.",
    "Server progression distinguishes completion mastery readiness and supports reviews and snapshots.",
    "UI supports real Admin and learner journeys; analytics are bounded aggregate-only.",
    "Actual vocabulary identifiers and A1-A2 Beginner scope preserved without primary mutations.",
    "Disposable migration/API/browser and regression gates; no Critical or Important findings before merge/push."
  ],
  "risk": {
    "rollback": "Additive migration on disposable DB only. Disable new selection while retaining bound releases and sessions. Revert mission commits without rewriting shared history.",
    "breaking": false,
    "level": "high",
    "data_change": true,
    "external_effect": true
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-30-r2-full-learning-program-platform.md",
  "sprint_reference": null,
  "approval": {
    "actor": "Human user of current chat",
    "reference": "mandate/reports/2026-10-30-r2-full-platform-owner-authorization.md",
    "at": "2026-10-30T14:14:15.657Z",
    "proposal_hash": "735cdc2fa97dc18d35391312ed546974131f0e399dd61b412b835dbe44fca554"
  },
  "verification": [],
  "history": [
    {
      "at": "2026-10-30T14:12:59.095Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-30T14:14:15.269Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Owner-authorized bounded successor to verified vertical slice; reviewed actual source and builder-check decisions.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-30T14:14:15.657Z",
      "actor": "Human user of current chat",
      "from": "triaged",
      "to": "approved",
      "reason": "Direct full R2 mission authorizes exact bounded implementation and merge/push after gates; production excluded.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-30-r2-full-platform-owner-authorization.md"
    },
    {
      "at": "2026-10-30T14:14:16.144Z",
      "actor": "Codex",
      "from": "approved",
      "to": "implementing",
      "reason": "Execute linked plan under explicit owner authorization, preserving primary data and release qualification boundaries.",
      "event": "transition",
      "reference": null
    }
  ]
}
---

## Analysis

Scoped successor to verified MND-20261030-010; reuse existing hierarchy, snapshots, evaluator and vocabulary. This scope is explicitly authorized by current owner mission. No production deployment or primary-data mutation.

## Unknowns

External learner, expert and real-provider qualification remain deferred. Full regression and independent review are required before integration.
