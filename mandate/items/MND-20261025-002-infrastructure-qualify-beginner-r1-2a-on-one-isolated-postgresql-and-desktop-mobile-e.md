---
{
  "schema_version": 1,
  "id": "MND-20261025-002",
  "status": "implementing",
  "created": "2026-10-25",
  "updated": "2026-10-26T05:28:35.595Z",
  "title": "Qualify Beginner R1.2a on one isolated PostgreSQL and Desktop Mobile E2E run",
  "type": "infrastructure",
  "owner": "Codex",
  "priority": "P1",
  "confidence": "high",
  "effort": "l",
  "impact": 4,
  "problem": "R1.2a lacks real PostgreSQL/E2E qualification and separate data authority; future harness lacks complete setup/cleanup, lock/history/authorization coverage and Windows ACL proof.",
  "value": "Obtain exact-scope permission for genuine synthetic fixture publication and DB/E2E qualification without production, learner or provider impact.",
  "scope": [
    "apps/api/prisma.beginner-test.config.ts",
    "apps/api/src/beginner/domain/beginner-environment-preflight.spec.ts",
    "apps/api/src/beginner/domain/beginner-environment-preflight.ts",
    "apps/api/test/beginner-isolated/egress-guard.cjs",
    "apps/api/test/beginner-isolated/environment.spec.ts",
    "apps/api/test/beginner-isolated/environment.ts",
    "apps/api/test/beginner-isolated/fixtures.ts",
    "apps/api/test/beginner-isolated/run.spec.ts",
    "apps/api/test/beginner-isolated/run.ts",
    "apps/api/test/integration/beginner-authoring.integration.spec.ts",
    "apps/api/test/integration/beginner-release-registry.integration.spec.ts",
    "apps/api/test/integration/beginner-test-harness.ts",
    "apps/api/vitest.beginner-isolated-tools.config.ts",
    "apps/web/e2e/beginner-admin-history.spec.ts",
    "apps/web/e2e/beginner-admin.spec.ts",
    "apps/web/playwright.beginner-admin.config.ts"
  ],
  "dedupe_key": "beginner:r12a:isolated-postgres-202610250002:real-fixture-publication-db-e2e-qualification",
  "evidence": [
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-p1-verification.md",
      "observation": "P1 software verified; real DB/integration/E2E gates remain blocked."
    },
    {
      "kind": "code",
      "reference": "apps/api/test/integration/beginner-test-harness.ts:20",
      "observation": "Requires approved environment/descriptor; no provisioning/migration/cleanup."
    },
    {
      "kind": "code",
      "reference": "apps/web/playwright.beginner-admin.config.ts:9",
      "observation": "Exact dedicated servers and real synthetic authentication state required, not started/provisioned."
    },
    {
      "kind": "code",
      "reference": "apps/api/src/beginner/domain/beginner-environment-preflight.ts:44",
      "observation": "Uses accessSync for approval-root writability; actual Windows ACL proof must be added/tested."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-review.md",
      "observation": "Bounded review records coverage/config/OS gaps and exact proposed resources; no execution performed."
    }
  ],
  "acceptance": [
    "Match plan/review/allowlist/baseline/proposal hashes and actual human approval before source/runtime operations; preserve frozen001/002/003/P1 and exact16-file scope.",
    "Exact local pinned Docker/container/volume/DB/role/paths/actions, least-privilege runtime role, actual OS approval-root boundary and no ordinary DATABASE_URL/.env fallback.",
    "TDD/unit/static/independent review of runner and ACL changes before DB; phase identity/action/cleanup preflight before any local data/setup operation.",
    "Execute real M01-M11 and Desktop/Mobile M12 without unexplained FAIL/skips; prove PG locks/rollback/idempotency, V1/C1 exact history/read/resume/fake evaluation and Intermediate/IELTS/legacy regression.",
    "Actual persisted IDs/receipts/assets/source/snapshot/candidate hashes; synthetic content stays FIXTURE_ONLY, no CONTENT_READY/APPROVED_RELEASE or false human authority/enrollment.",
    "Prove exact run DB/container/volume/PID/storage/approval cleanup and protected-root integrity; unknown ownership/residue blocks completion.",
    "Report actual commands/results/commits/errors/runtime proofs; no automatic003 verification, actual release, production/provider/next-increment or merge/push/deploy."
  ],
  "risk": {
    "level": "high",
    "breaking": false,
    "data_change": true,
    "external_effect": true,
    "rollback": "Stop only owned processes; identity-gated rollback/restore/drop limited to the sole disposable run DB/files/container/volume. Revert approved harness/OS guard commits only, retain P1 fix/readers. Unknown cleanup quarantines; no production/shared restore or broad reset."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-25-beginner-r12a-isolated-db-e2e-preapproval.md",
  "sprint_reference": null,
  "approval": {
    "actor": "WorkLingo product owner (human user)",
    "reference": "mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-human-approval.md",
    "at": "2026-10-26T05:28:34.730Z",
    "proposal_hash": "0293feefb1447c48e921e7c801d628db3b2352079d23ac42f74c6628c28179f2"
  },
  "verification": [],
  "history": [
    {
      "at": "2026-10-25T12:52:47.551Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-25T12:52:48.162Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Exact resources/actions/16-file harness scope and cleanup gates reviewed; preapproval only, waiting matching human execution/data approval.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-review.md"
    },
    {
      "at": "2026-10-25T12:56:28.393Z",
      "actor": "mandate-steward",
      "from": "triaged",
      "to": "captured",
      "reason": "Proposal revised; prior approval revoked; requires new triage.",
      "event": "update",
      "reference": null
    },
    {
      "at": "2026-10-25T12:56:29.104Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Exact resources/actions/16-file harness scope and cleanup gates reviewed; preapproval only, waiting matching human execution/data approval.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-review.md"
    },
    {
      "at": "2026-10-26T05:28:34.730Z",
      "actor": "WorkLingo product owner (human user)",
      "from": "triaged",
      "to": "approved",
      "reason": "Actual conditional human approval for exact hash: Gate A source safety only first; Gate B remains disabled until observed gates pass.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-human-approval.md"
    },
    {
      "at": "2026-10-26T05:28:35.595Z",
      "actor": "Codex",
      "from": "approved",
      "to": "implementing",
      "reason": "Begin approved Gate A TDD, no DB operations before safety proof.",
      "event": "transition",
      "reference": "mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-human-approval.md"
    }
  ]
}
---

## Linked preapproval

Separate proposed environment/data qualification linked to MND-20261024-003. Parent001 captured/null,002 verified,003 implementing,20261025-001 verified remain frozen. Current human request authorizes preapproval capture/review only, not execution.

## Approval locks

Plan docs/superpowers/plans/2026-10-25-beginner-r12a-isolated-db-e2e-preapproval.md SHA256-LF 1f0fc2a7f7b70687e9013f40c8679ef8965b3c6fe750407911aa283cafda1997
Scope review mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-review.md SHA256-LF 56347e1578f713f41b16c96935a7d868e7d6e969e8a32c4e269be242245e6e54
Exact16-file allowlist fingerprint 5b8bad074edf290429bd8acf6c18b40833c6422806d88f91650089583106b5c7
Source baseline fingerprint 98b81779ce35fe4965aed9ade158e038286caaab7c228b17a6b70f464ef86562 at HEAD 520acdca8b7d63deaeb3a2a8b8dd721a6bd4186b branch codex/foundation-basic-readiness
Environment fingerprint 29094d2c951a49f8b33d639b3aa97738c3c374895d80651beb81f454e92f4290; unchanged migration ledger fingerprint 6e4cadaf6f0f16001c014edcee0d271a43bdbef211d6efc7decc6693bb33b1cb
Full non-secret envelope mandate/reports/2026-10-25-beginner-r12a-isolated-db-e2e-scope.json. ProposalHash is computed by Mandate CLI, intentionally not self-embedded.

## Exact proposed authority

Run202610250002/environment beginner-r12a-db-e2e-20261025-002. Local desktop-linux named pipe; pinned postgres@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24; exact container worklingo-beginner-r12a-202610250002 and volume worklingo-beginner-r12a-202610250002-pgdata.
PostgreSQL127.0.0.1:55432, DB worklingo_beginner_r12a_202610250002, runtime wl_beginner_202610250002, cluster wl-beginner-r12a-202610250002; one temporary migration owner and bootstrap postgres confined to the new container. Runtime TEST_DATABASE_URL is private and exact; DATABASE_URL explicit equality, never fallback. No DSN/password in Git/reports.
Disposable root C:/Users/ASUS/AppData/Local/Temp/worklingo-beginner-r12a/202610250002 and separate operator root C:/ProgramData/WorkLingo/BeginnerTestApprovals/202610250002; read-only records to non-elevated children. API47771/Web47772 new owned PIDs. Real matching grant24h maximum; no auto extension.

## Requested future actions, not granted now

After matching approval only: exact8-modify/8-create TDD/harness/OS ACL changes with independent review; create exact resources/role/ACLs; unchanged migration deploy via dedicated config; genuine synthetic fixtures/audio/curriculum publication with distinct technical reviewer; actual integration/E2E and TEST_PUBLISHED export; proven run-only backup/cleanup and at most one cleanup-verified retry.
Runtime read/author/validate/review/publish/export/fixture-audio only, no approve-release. Existing003 literal in permission is software provenance; actual child human approval ID/hash bound by trusted outer envelope/authorizationSource. Unit templates cannot authorize live actions.

## Boundaries and rollback

Plan maps M01-M12, exact commands/rights/preflight, native OS ACL, real auth/history, no-.env mirror, strict egress and cleanup. All runtime tests/proofs NOT RUN now.
No extra files/new migration/schema, production/shared DB/media, real content/video/providers, learner enrollment, R1.2b/R2/R3/R4, merge/push/deploy, fabricated human approval or automatic003 transition. Scope/source drift needs a new matching decision.
Rollback only identity-proven disposable resources and approved source commits, preserving P1/history/readers. Unknown cleanup quarantines. Actual APPROVED_RELEASE needs later actual candidate-hash human approval.

## Governance bookkeeping

Current capture may create this item, generated INDEX and three named plan/review/scope artifacts. Matching future approval may add named human-approval/verification reports and child lifecycle via CLI; runtime resources remain exactly those proposed. No execution approval note fabricated in capture.
