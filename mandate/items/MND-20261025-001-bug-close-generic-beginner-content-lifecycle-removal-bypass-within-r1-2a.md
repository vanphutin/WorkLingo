---
{
  "schema_version": 1,
  "id": "MND-20261025-001",
  "status": "verified",
  "created": "2026-10-25",
  "updated": "2026-10-25T12:12:19.244Z",
  "title": "Close generic Beginner content lifecycle removal bypass within R1.2a",
  "type": "bug",
  "owner": "Codex",
  "priority": "P1",
  "confidence": "high",
  "effort": "s",
  "impact": 4,
  "problem": "Generic Admin lifecycle removal can archive Beginner current LessonVersion and clear published pointer using only role/revision, bypassing default-deny scoped authoring boundaries.",
  "value": "Prevent accidental/direct-API Beginner withdrawal, preserve historical V1/V2 validity and retain authorized legacy Intermediate/IELTS removal.",
  "scope": [
    "apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.ts",
    "apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.spec.ts"
  ],
  "dedupe_key": "beginner-r12a-generic-admin-content-lifecycle-removal-bypass-two-file-followup",
  "evidence": [
    {
      "kind": "code",
      "reference": "apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.ts:32",
      "observation": "Role and receipt hash checked without Beginner authorization before receipt replay."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.ts:116",
      "observation": "Draft delete/current version archive/pointer clear lack Beginner ownership/format guard."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-24-beginner-r12a-verification.md:100",
      "observation": "Previous independent review records confirmed P1 outside approved allowlist."
    },
    {
      "kind": "document",
      "reference": "docs/superpowers/plans/2026-10-24-beginner-r12a-implementation.md:55",
      "observation": "Canonical plan requires generic Beginner mutation default denial."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-p1-amendment-review.md",
      "observation": "Bounded mutation inventory and minimal two-file correction with blocked DB gates."
    }
  ],
  "acceptance": [
    "Five-lock validation and matching named human approval before execution; original003/001/002 frozen.",
    "Only exact service/spec product changes; all generic Beginner/1.2 delete/archive denied before receipts or content/audit/receipt DML, rechecked after locks.",
    "Observed RED then GREEN for Admin roles, inactive/unauthorized users, environment/direct-controller bypass, dual target references, receipt replay and zero-write failure branches, using mocks only.",
    "Legacy Intermediate/Foundation/IELTS removal, stale/action/FK/idempotency and old-import/new-pointer behavior preserved; Beginner V1/V2 snapshots and supersession unchanged.",
    "Focused/dedicated mock regressions, API lint/typecheck/build PASS without hidden skips; independent implementation review resolved; separate P1 feature commit after acceptance.",
    "No DB/integration/E2E/providers/publication/learner/next increment/merge/push/deploy;003 stays implementing until separately authorized complete acceptance."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": false,
    "external_effect": false,
    "rollback": "Revert only approved P1 source commit with authorization, preserving versions/readers/learner state. Revert restores P1 and is not release-safe. No DB rollback/deletion."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-25-beginner-r12a-p1-lifecycle-amendment.md",
  "sprint_reference": null,
  "approval": {
    "actor": "WorkLingo product owner (human user)",
    "reference": "mandate/reports/2026-10-25-beginner-r12a-p1-human-approval.md",
    "at": "2026-10-25T11:51:39.618Z",
    "proposal_hash": "333afd904efbd281cb2b21c26a898e293f2679fcb383525b52a883c8bd2aacf9"
  },
  "verification": [
    {
      "command": "pnpm --filter @worklingo/api exec vitest run --config <absolute ignored .superpowers/sdd/2026-10-25-beginner-r12a-p1-lifecycle-amendment/vitest.lifecycle.config.ts>",
      "result": "passed",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-p1-verification.md"
    },
    {
      "command": "pnpm --filter @worklingo/api exec vitest run --config vitest.beginner.config.ts (complete unchanged rerun; initial failure retained in report)",
      "result": "passed",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-p1-verification.md"
    },
    {
      "command": "pnpm --filter @worklingo/api lint",
      "result": "passed",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-p1-verification.md"
    },
    {
      "command": "pnpm --filter @worklingo/api typecheck",
      "result": "passed",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-p1-verification.md"
    },
    {
      "command": "pnpm --filter @worklingo/api build",
      "result": "passed",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-p1-verification.md"
    },
    {
      "command": "Independent read-only two-file code review and coordinator disposition; snapshot mutation detected/restored; source-only commit24756b3",
      "result": "passed",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-p1-verification.md"
    }
  ],
  "history": [
    {
      "at": "2026-10-25T11:45:06.150Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-25T11:45:13.681Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Recorded P1 confirmed; two-file follow-up reviewed and hash locked. Capture/triage only, matching human execution approval pending.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-p1-amendment-review.md"
    },
    {
      "at": "2026-10-25T11:51:39.618Z",
      "actor": "WorkLingo product owner (human user)",
      "from": "triaged",
      "to": "approved",
      "reason": "Explicit direct human execution approval for exact MND-20261025-001 proposal hash333afd904efbd281cb2b21c26a898e293f2679fcb383525b52a883c8bd2aacf9 after matching five-lock preflight; two product files only, no DB/provider/publication authority.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-p1-human-approval.md"
    },
    {
      "at": "2026-10-25T11:51:40.570Z",
      "actor": "Codex",
      "from": "approved",
      "to": "implementing",
      "reason": "Matching human approval recorded; begin two-file P1 TDD using synthetic mocks only.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-p1-human-approval.md"
    },
    {
      "at": "2026-10-25T12:12:19.244Z",
      "actor": "Codex",
      "from": "implementing",
      "to": "verified",
      "reason": "Approved two-file software acceptance met: observed RED/GREEN, final focused101/101, dedicated203/203 with initial transient failure retained, no skips, lint/types/build exit0, independent review and mutation check. No DB/full R1.2a verification authority implied.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-p1-verification.md"
    }
  ]
}
---

## Linked scope amendment

Parent execution MND-20261024-003 remains implementing, frozen scope/approval unchanged. MND-20261024-001 stays captured/approval=null;002 stays verified.
Human request2026-10-25 authorizes capture/review only, explicitly not matching execution approval. No code before renewed approval.

## Five-lock envelope

Plan docs/superpowers/plans/2026-10-25-beginner-r12a-p1-lifecycle-amendment.md: 8faaff111aeab7b985a7640e284776a4bf39d40fbc05a057224f44ec35711793
Scope review mandate/reports/2026-10-25-beginner-r12a-p1-amendment-review.md: ca7fbd38d6def2eb1bd2a043457ea5662ac6433cc7e6645b70bb969958dfa6df
Exact allowlist fingerprint: b876ec6106b4f59473060d375778e55171c90d9d08bbdeaa051ab25b88a07076
Current source baseline fingerprint: ddfbabf5baadd66532c9c02b63f9b22ac09b7e956b9f4540de4650860404c655
HEAD 47dab4efb54d33b207455762446185a3f516f1e5; branch codex/foundation-basic-readiness. Scope lock: mandate/reports/2026-10-25-beginner-r12a-p1-amendment-scope.json.
Fifth value is proposalHash computed by Mandate CLI over captured proposal/body, intentionally not self-embedded.

## Boundary and dependency

Only apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.ts and apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.spec.ts may change as product source after matching approval. Generic route default denial only; no new Beginner archive API/capability. Author/publish grants cannot authorize withdrawal.
Check both actual Lesson relations and source/version format before replay and after locks; preserve legacy hashes/locks, old import/new pointer behavior and supersession. Stop if safe correction needs any other product file or permission.
Addendum specifies TDD, zero denied-path DML, direct-controller/environment tests, V1/V2/legacy regressions, ignored DB-free runner, lint/types/build and independent review.

## Gates and rollback

No DB integration/E2E/real fixture/test publication/release authority; separate identity/action approval required. No providers, migration/seed, learner opening, next increment, merge/push/deploy.003 cannot be verified on unit results alone.
Revert only future P1 commit with authorization; preserve snapshots/readers/state and acknowledge restored vulnerability.

## Governance bookkeeping

Capture may create this item, INDEX and three named addendum/review/scope artifacts. Future matching approval may add actual human approval/verification only at named report paths in scope lock; lifecycle uses CLI. No implied product/data authority.
