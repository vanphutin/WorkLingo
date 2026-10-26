---
{
  "schema_version": 1,
  "id": "MND-20261026-001",
  "status": "implementing",
  "created": "2026-10-26",
  "updated": "2026-10-26T06:51:16.628Z",
  "title": "Establish one least-privilege Windows worker for Beginner R1.2a without database authority",
  "type": "infrastructure",
  "owner": "Codex",
  "priority": "P1",
  "confidence": "high",
  "effort": "m",
  "impact": 4,
  "problem": "R1.2a cannot qualify its current elevated Windows execution context; a separate standard principal and actual ACL boundary need explicit OS authority, and a new profile requires different TEMP/run paths from frozen parent scope.",
  "value": "Enable a reproducible least-privilege OS worker boundary without widening operator/profile/production access or inventing database execution authority.",
  "scope": [
    "OS account: VAN-PHU-TIN/wl_beginner_r12a; initially absent; Users SID S-1-5-32-545 only",
    "OS profile: C:/Users/wl_beginner_r12a; actual new SID/profile verified",
    "OS new roots: exact run/snapshot/approval and newly created ancestors in locked worker scope",
    "Existing-binary copy-only snapshot and bounded pure diagnostics; no software install/build",
    "Repository source allowlist: EMPTY; existing 16-file parent allowlist unchanged",
    "SID/ownership-bound rollback of newly created worker resources; no DB operation"
  ],
  "dedupe_key": "beginner:r12a:windows-dedicated-standard-worker:os-only-20261026",
  "evidence": [
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-verification.md",
      "observation": "9d50bc2 records actual elevated execution, no qualified interactive Medium worker and blocked Gate A; data qualification never executed."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/beginner/domain/beginner-environment-preflight.ts:63",
      "observation": "Current path preflight requires ownedTempRoot below the actual process tmpdir; different worker profile cannot silently use frozen ASUS TEMP scope."
    },
    {
      "kind": "document",
      "reference": "docs/superpowers/plans/2026-10-26-beginner-windows-worker-preapproval.md",
      "observation": "A/B/C comparison recommends bounded B as a proposal; exact account/profile/new-root, native diagnostics, rollback and blocked successor qualification specified."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-26-beginner-windows-worker-review.md",
      "observation": "Fresh builder questions refined launch/env, OS-versus-harness write boundaries and copy-only dependency policy; no execution approval."
    }
  ],
  "acceptance": [
    "Match child proposal, plan/review/scope LF hashes, source baseline/frozen/migration locks, empty repository source allowlist and actual human OS-only approval before any mutation.",
    "Only exact absent account/profile/roots may be created; account Users-only, actual worker/child tokens non-elevated Medium and matching recorded new SID, no privileged/engine access.",
    "Prove actual read/execute on sealed secret-free snapshot, controlled run scratch write, and effective denial of approval/snapshot/ancestor mutations and known protected secrets/media without reading production contents.",
    "Use only locked native diagnostic contract and fresh allowlisted environment; no hooks/profile/inherited secrets, application build/install/server/provider/DB/client action. Missing artifacts or unsafe pre-existing ACLs cause STOP.",
    "Keep old scope/approvals/16-file allowlist unchanged; source allowlist empty; record changed worker TEMP/run/snapshot as proposed new identity requiring successor harness/environment approval.",
    "Bounded SID/ledger rollback and residue inventory; unknown ownership/profile/session/name collision blocks cleanup, never broad account/ACL/recursive deletion.",
    "Report OS-only PASS/FAIL/BLOCKED evidence; parent Gate A remains BLOCKED until all owner-required proofs, Gate B NOT RUN; no parent verification, later increments or merge/push/deploy."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": true,
    "external_effect": true,
    "rollback": "OS state only: disable newly created exact worker; stop only ledger-owned processes; remove only new SID-bound profile/account and proven owned run/snapshot/approval paths; preserve audit, quarantine unknown residue. Never edit existing account/global ACL/policy or DB; native profile lifecycle, no shared-root recursion."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-26-beginner-windows-worker-preapproval.md",
  "sprint_reference": null,
  "approval": {
    "actor": "WorkLingo product owner (human user)",
    "reference": "mandate/reports/2026-10-26-beginner-windows-worker-human-approval.md",
    "at": "2026-10-26T06:51:16.457Z",
    "proposal_hash": "4c772bb0e7ee9820e64742cf56b92a94d2f6bec231a776eea5591af103238c34"
  },
  "verification": [],
  "history": [
    {
      "at": "2026-10-26T06:39:45.304Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-26T06:41:28.596Z",
      "actor": "mandate-steward",
      "from": "captured",
      "to": "captured",
      "reason": "Proposal revised; prior approval revoked; requires new triage.",
      "event": "update",
      "reference": null
    },
    {
      "at": "2026-10-26T06:41:28.755Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "OS-only A/B/C proposal and exact resources reviewed; builder questions refined. Ready for human selection and matching OS-scope approval only; no execution or data authority.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-26-beginner-windows-worker-review.md"
    },
    {
      "at": "2026-10-26T06:51:16.457Z",
      "actor": "WorkLingo product owner (human user)",
      "from": "triaged",
      "to": "approved",
      "reason": "Direct human approval of matching proposal 4c772bb0... OS-only; secure input/owner logon and all data/source/Gate B prohibitions retained.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-26-beginner-windows-worker-human-approval.md"
    },
    {
      "at": "2026-10-26T06:51:16.628Z",
      "actor": "Codex",
      "from": "approved",
      "to": "implementing",
      "reason": "Matching OS-only human approval and frozen hashes verified; begin exact plan. No worker/account/profile/ACL/data mutation before this lifecycle transition.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-26-beginner-windows-worker-human-approval.md"
    }
  ]
}
---

## Parent and proposed decision

Parent MND-20261025-002; R1.2a MND-20261024-003. Recommend B, not human-approved. Proposed new child MND-20261026-001. Current task is documents/preapproval only.

## Exact locks

Plan LF-SHA256: 9019768c4a47775a6eaa5e2aff2a19ef72c48f1c60c600c1f90d8a2da41fec77

Review LF-SHA256: c85c29459abf67c999e72bfa29493b3e528fdefb8b14ad6fd294002f15aa61e5

Scope LF-SHA256: 74cf2ee5d637803a780e27ba6510c4ff64a38bda520b9a081507658b49f2be74

Baseline fingerprint: b34b0be1f1fb44872fbabd6b63f1dac25055a1a2c90f7b40d982840c5cfc271e

Empty repository allowlist fingerprint: ae2d4c270e612768a2d82ce0a3bdd1244ab88422bbf0b1cb39992da92a09da4b

Frozen-artifact fingerprint: fc637058ae3a68826d7d067760b11e4e5fdac87ebcfb140d3110adc32e7e75c4

48 migration-file fingerprint: 6e4cadaf6f0f16001c014edcee0d271a43bdbef211d6efc7decc6693bb33b1cb

Baseline HEAD: 9d50bc23ff596232c9693bc058d7fb434edda211; branch codex/foundation-basic-readiness.

## Authority boundary

Locked OS/resources/diagnostics: mandate/reports/2026-10-26-beginner-windows-worker-scope.json. No source modifications or DB authority. data_change/external_effect describe proposed OS account/profile/filesystem state only. No credentials, human approval note or runtime activation record created by capture.

## Dependencies and unknowns

Existing standard sessions/VM availability not assumed. Actual new-account token/ACL/engine/secret boundary and artifact availability remain unproved. Normal profile scratch is not OS confinement to four output paths. Parent preflight/hardcoded validators need a separately captured successor scope for new profile/run root. Actual SQL/backup proofs require an explicitly approved setup/proof order, never a synthetic Gate A PASS.

## Current lifecycle

Capture/triage only, approval=null. Preserve parent captured/verified/implementing states and frozen bytes. OS setup/cleanup, provider/DB/E2E/Gate B NOT RUN.
