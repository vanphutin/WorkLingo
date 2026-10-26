---
{
  "schema_version": 1,
  "id": "MND-20261026-002",
  "status": "triaged",
  "created": "2026-10-26",
  "updated": "2026-10-26T10:15:51.412Z",
  "title": "Retire only the owned temporary Beginner worker and preserve main database data",
  "type": "infrastructure",
  "owner": "Codex",
  "priority": "P2",
  "confidence": "high",
  "effort": "s",
  "impact": 3,
  "problem": "Owner stopped temporary worker setup and requested main-DB testing, but actual main DB has accounts/sessions/vocabulary and unexplained history/catalog differences. Exact SID retirement needs new OS authority; no existing approval permits deleting this account or writing that DB.",
  "value": "Remove only the owned unused temporary account with profile retention while preventing inherited isolated-test authority from mutating a populated main database.",
  "scope": [
    "OS account VAN-PHU-TIN/wl_beginner_r12a, exact SID S-1-5-21-3809754005-2092998575-1059868825-1014 only after renewed human approval and no sessions/processes",
    "Optional14 exact unchanged empty directories in locked scope; nonrecursive leaf-first; profile retained",
    "Main DB worklingo at127.0.0.1:55432 is read-only reference evidence ONLY; no DB write/backup/migration/fixture rights",
    "Source/test/script allowlist EMPTY; governance capture/lifecycle/evidence files only"
  ],
  "dedupe_key": "beginner:r12a:retire-owned-temporary-worker:main-db-readonly-gates-20261026",
  "evidence": [
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-26-main-db-worker-preapproval-review.md",
      "observation": "Actual read-only SQL across97 tables proves nonempty main DB,47 applied/4 rolled-back migrations and3 unexplained checksums; worker provenance/profile retention documented."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-26-beginner-windows-worker-verification.md",
      "observation": "Partial approved setup created exact SID and14 owned roots; diagnostics not completed and subsequent owner instruction stops setup pending new scope."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-26-main-db-worker-retirement-scope.json",
      "observation": "Exact account/root identities, source/frozen/allowlist/plan/review/audit hashes and explicit no-main-DB-write boundary captured."
    }
  ],
  "acceptance": [
    "Match new human OS-retirement proposal, plan/review/scope hashes, current source/frozen baseline and empty source allowlist before mutation.",
    "Verify worker name/SID against creation ledger, Users-only membership and different operator; no worker sessions/processes, profile unloaded/non-special and exact SID/path before removing only that account.",
    "Preserve entire profile and unknown data. Only14 exact owned unchanged/proven-empty directories may be removed nonrecursively leaf-first after fresh verification; otherwise retain/STOP.",
    "No database/container/storage write, backup/restore, migration, fixture/publication/release, provider, product source or other-user/global policy change.",
    "Record removed/retained resources and irreversible SID limitation; preserve all frozen mandates/lifecycles and keep Gate A BLOCKED/Gate B NOT RUN.",
    "Any main-DB testing requires separately resolved data/history/role/backup/restore/harness scope and new human approval; do not reuse old isolated DB authorization."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": true,
    "external_effect": true,
    "rollback": "Stop before mutation if prerequisites fail. Original SID deletion cannot be reversed by account recreation. Preserve profile/evidence; remove only the exact proven-empty ledger directories if authorized. No DB restore/reset, shared deletion, ACL force, unknown-process kill or automatic account recreation."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-26-main-db-audit-worker-retirement-preapproval.md",
  "sprint_reference": null,
  "approval": null,
  "verification": [],
  "history": [
    {
      "at": "2026-10-26T10:15:05.512Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-26T10:15:22.837Z",
      "actor": "mandate-steward",
      "from": "captured",
      "to": "captured",
      "reason": "Proposal revised; prior approval revoked; requires new triage.",
      "event": "update",
      "reference": null
    },
    {
      "at": "2026-10-26T10:15:51.412Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Read-only audit and exact retirement-only scope reviewed; main-DB writes remain unready/unapproved. New matching OS human approval required; no execution.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-26-main-db-worker-preapproval-review.md"
    }
  ]
}
---

## Parent and scope change

Parent setup MND-20261026-001 is frozen implementing; related isolated DB MND-20261025-002 and R1.2a MND-20261024-003 remain implementing. Parent program MND-20261024-001 remains captured/approval=null. Existing setup/isolated approvals do not authorize retirement or main-DB writes. This is distinct from the prior creation scope; owner direction is capture authority only.

## Frozen approval inputs

Plan LF SHA-256: a6743552c44ad2d7fc29cfcb78f295bc2790e72dc622d1947484e9fea7fb0a6b
Review LF SHA-256: 9136edd914363d8c84c585dffcb780ca7773c29a1e10003b6e6ae82d0546d63c
Aggregate audit LF SHA-256: 9f389fa9f6d203ae49b8327e653d8209666bd40e4e0c19b5cd78ebfc828b79ae
Exact scope LF SHA-256: c3f5ac639801d77bab107407fc17c0c5b1137958ff16b2cd292cc8b85004a6c8
Source baseline fingerprint: b34b0be1f1fb44872fbabd6b63f1dac25055a1a2c90f7b40d982840c5cfc271e
Frozen artifact fingerprint: 13b31584f7ebbcf85b395c2c28e3e294fd5b4d6fc64ebe6f79441dbbe7afb7a9
Empty source allowlist fingerprint: ae2d4c270e612768a2d82ce0a3bdd1244ab88422bbf0b1cb39992da92a09da4b
Baseline HEAD: 8c3bc63df04309140e241e085050a0e32341f1f7; branch codex/foundation-basic-readiness.

## Proposed OS action and retention

Only named SID deletion after actual matching human approval and execution-time account/use checks. Preserve profile, system/personal data and audit. Optional14 exact empty owned-directory cleanup is nonrecursive leaf-first and stops for unknown data/owner/ACL/reparse/use. Do not force logoff or claim account recreation restores its SID.

## Main DB findings and non-goals

Confirmed worklingo/systemID7692646346822291490/OID16384 at host55432, pinned container and shared volume in scope. Snapshot has8744 source occurrences,8129 lexical entries,2 accounts,9 sessions and1 learner profile; not disposable by assumption. All47 source migrations already applied; planned execution set EMPTY. Three checksum differences and absent program catalog require review; schema equivalence NOT_ASSESSED. Existing audit role is superuser. No executable DB-data/testing scope is approved or requested by this hash.

## Unknowns and future decisions

Worker-process absence must be rechecked at action time; no token/engine diagnostic acceptance inferred. Backup/real restore rehearsal, least-privilege role and fail-closed main-DB harness/publication changes need separate scope/allowlist/hash. Existing data preservation and migration/catalog findings require owner review first. Gates remain blocked; no next increment.

## Verification proposal

CLI validate, source/frozen/document/allowlist checks and reference existence before handoff. Future OS verification records exact removed SID and retained resources. No DB/E2E or product tests are authorized by this proposal.
