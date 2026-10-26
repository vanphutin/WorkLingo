---
{
  "schema_version": 1,
  "id": "MND-20261026-003",
  "status": "triaged",
  "created": "2026-10-26",
  "updated": "2026-10-26T11:38:10.871Z",
  "title": "Qualify Beginner R1.2a on the existing main database with fixture-only writes and protected cleanup",
  "type": "infrastructure",
  "owner": "Codex",
  "priority": "P1",
  "confidence": "high",
  "effort": "m",
  "impact": 4,
  "problem": "Owner chose the existing main worklingo database and retired the Windows worker; current isolated runtime guards cannot authorize that identity. The populated DB is offline, three historical checksum inputs are unexplained and current runtime credentials are superuser. Safe main-DB qualification requires a new explicit bounded source/data/backup/role/testing scope.",
  "value": "Complete controlled R1.2a PostgreSQL/Admin qualification without extra workers/instances/databases, protecting all existing data and honestly reporting backup/restore and migration limitations.",
  "scope": [
    "Existing worklingo at127.0.0.1:55432 / infra_worklingo-postgres / exact stopped review container; guarded startup, no new instance/database",
    "Exact26-file source allowlist for explicit main permission/config/test runner and existing narrow tests; legacy isolated behavior retained",
    "Whole-DB private backup/archive validation, exact limited PostgreSQL role and one run261026a00003 with UUID-ledger fixture publication/test/cleanup",
    "No migration/history/checksum repair, broad deletion, real learner/public access, APPROVED_RELEASE or providers; original gates not falsely passed"
  ],
  "dedupe_key": "beginner:r12a:main-worklingo-controlled-qualification:one-run-20261026",
  "evidence": [
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-26-beginner-main-db-review.md",
      "observation": "Read-only inspection establishes current offline container, populated last SQL snapshot, three unresolved input hashes, unsafe generic test hooks and runtime/config blockers."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-26-beginner-main-db-scope.json",
      "observation": "Exact source/data/role/container/path/action allowlists, protected-row/backup/cleanup gates and residual risks bound to source/frozen fingerprints."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-26-main-db-worker-retirement-verification.md",
      "observation": "Dedicated Windows worker was retired under separate matching authority; that approval grants no main-DB testing or new worker authority."
    }
  ],
  "acceptance": [
    "Verify actual matching human proposal/plan/review/scope/source/frozen hashes before code/OS/data changes; TDD pure safety guards and retain legacy/default-deny behavior.",
    "Use only exact existing host/database/systemID/OID/container/image/volume, one owner-maintenance window and exact runtime role; no root env/URL fallback or foreign client/provider access.",
    "Before fixture writes refresh47 migration status/counts; validate complete private dump + full archive decode, explicit RESTORE_NOT_TESTED, compatible supported schema plus3-migration catalog semantics; no history/source repair.",
    "Runtime is non-superuser/non-owner with exact minimal privileges; no protected-row DML, no broad cleanup, no shared ACL/role privilege changes; bootstrap superuser confined to reviewed exact-ID operations.",
    "Run fixture-only authoring/review/preview/ownership/idempotency/real PG locks/rollback/V1-V2/C1-C2/registry and desktop-mobile E2E; keep no learner mutation/APPROVED_RELEASE/CONTENT_READY; blocked cases never PASS.",
    "Cleanup only exact created keys/rows after incoming-FK ownership checks; retain backup/audit, prove all pre-existing data/counts/digests/schema unchanged and report every residue/blocked test.",
    "Report focused tests/lint/typecheck/build/regression and one independent final review with actual commands/results; commit only allowlisted files on feature branch, no merge/push/deploy or next increment.",
    "New qualification route substitutes only old dedicated-DB/trusted-root execution controls explicitly; old isolated Gate B not PASS. Original R1.2a003 cannot verify while any remaining mandatory acceptance is unproven."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": true,
    "external_effect": true,
    "rollback": "Rollback failed transactions and exact owned fixture IDs/files after locked FK checks; preserve every original row and backup. No full restore/reset/drop/foreign cleanup, no forced broad role revoke. Exact new role/grants and run-owned startup only; quarantine unknown dependencies. Restore rehearsal not performed/authorized and same-operator trust/historical input checksum risks explicitly disclosed."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-26-beginner-main-db-qualification.md",
  "sprint_reference": null,
  "approval": null,
  "verification": [],
  "history": [
    {
      "at": "2026-10-26T11:36:18.766Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-26T11:38:10.871Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Single main-DB qualification scope prepared from existing R1.2a evidence; exact safety gates and residual risks reviewed; no execution approval, source or DB mutation.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-26-beginner-main-db-review.md"
    }
  ]
}
---

## Parent and single-scope decision

Follow-up for parent R1.2a MND-20261024-003, replacing the EXECUTION ROUTE of frozen MND-20261025-002. Worker MND-20261026-002 is verified/retired; no new worker, PostgreSQL instance/database or schema clone. Current user permission is only audit/capture; not matching execution approval.

## Frozen inputs

Plan LF SHA-256: 93d6e51cdd5045a3e858a1e393d3a6883608871f99f3ef7e6fd2ede74ea453b9
Review LF SHA-256: 84165b82ee3d97543d57a1272351bd1bfe9f316ec0f1c00d637587ecdc8778bb
Checksum evidence LF SHA-256: 6796025f9183f56e3e230fd72fa7860b585640ab1a7daa39da8aa52faf537e5a
Scope LF SHA-256: 23353b08775352448f175b24c261cf043969ee49b1b0f4a25b730611c8867b2b
Source baseline fingerprint: 4e338e399cee760b70b0a2263c5293c804b9dcc026a10ab49a39e4de1f2b9c16
Exact26-file allowlist fingerprint: 1f973320b6730f56f3b4aa342a81723c6a1a0fa5ab1b58a0e4001a0c5c898ef3
Frozen artifact fingerprint: fc577e0a29a74349e79ba9fbc541ac81f8ab857e073091f706356610c9b0f33d
HEAD 98b0e72b8dd1f42eed002b2b14802ee249e91753; branch codex/foundation-basic-readiness.

## Explicit rights requested, not granted

One approval covers exact26 source paths, existing-container startup, read-only audit, private full backup/decoding, one least-privilege PG role, exact synthetic UUID fixtures/test publication, safe integration/E2E and exact cleanup. No schema/migration/history/checksum repair or destructive recovery. Privileged coordinator credentials never enter runtime children. Source role/data/public-table rights and fixed roots/actions are in scope JSON.

## Residual risks requiring owner acknowledgment

Last SQL snapshot is populated, current server offline. Three stored migration inputs remain unavailable locally; current relevant schema must still match before fixtures. Dump readability is not restore PASS: no actual restore target/operation is allowed. Same-ASUS trusted-operator mode does not provide a separate immutable OS principal; known PUBLIC TEMP inheritance is disclosed rather than revoked from other users. These known limitations cannot justify unknown structural differences, unsafe rights or broad cleanup.

## Qualification and limits

Runtime fixture program stays DISABLED, release TEST_PUBLISHED/FIXTURE_ONLY, no learner access/provider calls/APPROVED_RELEASE. All existing data preserved; bootstrap cleanup only exact created IDs with locked incoming-FK checks. Generic destructive suites stay BLOCKED. Original003 verification requires all remaining acceptance and explicit mapping of this approved environment-only substitution; old isolated Gate B never becomes PASS. No next increment or Git integration.

## Verification proposal

Pure safety TDD + legacy regression; full private backup/archive decode; actual PostgreSQL locks/rollback/idempotency/history/ownership tests and two Admin device projects; exact cleanup/digests; lint/typecheck/build; one fresh final review. Source/role/data safety failure stops before the next write phase and is reported honestly.

## Builder refinements included before approval

Explicit LearningProgram SELECT/lock-only UPDATE, one execute process/memory handoff,4h hard deadline with30m cleanup reserve and cleanup-only crash recovery, and canonical-slug exceptions are incorporated. No new human preference or second execution approval per phase is required. Scope retains honest same-operator trust, unknown checksum input and NOT_TESTED restore risks.
