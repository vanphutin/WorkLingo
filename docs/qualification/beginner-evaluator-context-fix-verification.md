# MND-20261029-001 — Pinned evaluator context fix verification

Business date2026-10-29;exact matching owner approval f41d6673ac882e08a578b0e78e8e3e23cca7d36e9ffd4be24865b5a0003d355d recorded through Mandate CLI. Baseline cf24c8262fac9888be87cac2b5fbdae38256acba;26 files/plan/scope/allowlist checked before changes. Owner additionally allowed Discovery/necessary DB,but no real provider/DB/.env access was needed or used.

## Result
P1 missing-context delivery is fixed and verified at the isolated service/serializer boundary. Two original desired-contract assertions now genuinely PASS. This is not observed live-provider grading accuracy or content/learner qualification.

## Implementation
- LanguageEvaluationInput gains optional server-only BeginnerEvaluationContextV1 and runtime guard.
- EvaluationService derives exact lessonVersionId/activityId/slug,only uniquely referenced role-card text,and exact private responseRubrics criteria/acceptable alternatives from validated pinned snapshot. No latest lookup,model-answer shortcut,global content dump or fabricated alternatives.
- Guard executes before cache lookup/replay and before provider/mutation. Missing/blank/ambiguous context fails closed.
- Beginner input hash conditionally includes full versioned context;old contextless or changed-context cached results conflict without deletion/overwrite/regrading. Valid V1 context cache remains V1 despite V2 pointer. Legacy hash remains byte-compatible.
- Shared untrustedInput transmits context to both OpenAI and Discovery via unchanged routing/shared serializer. Direct adapter bypass validates too. New Beginner JSON escapes markup delimiters while original source text remains recoverable. Legacy serialized bytes/instructions unchanged.
- Learner DTO/projection,content/audio,aggregation registry,DB schema and old human/AI/verification records unchanged.

## TDD ledger and actual results
1. Original dedicated baseline:36tests34PASS2FAIL0skipped before product edits.
2. Expanded tests before product edits:49tests39PASS10FAIL0skipped.
3. Minimal product fix:49/49PASS.
4. Added malformed direct serializer cases exposed wrong-skill acceptance:60tests59PASS1FAIL;explicit skill guard fixed it.
5. Final dedicated suite after all test changes:60/60PASS,0FAIL,0skipped. Includes exact original two desired assertions,17 existing service tests,synthetic guards/cache/version/privacy/routing/mock-fetch/legacy/injection regressions. No skip/test.fails/weakening desired intent.
6. Focused ESLint all5files:PASS. Initial typecheck fixture index-signature error TS2322 fixed by object-spread cloning;final API tsc --noEmit:PASS. API tsc build:PASS.
7. Independent read-only reviewer found no Critical/Important actionable issue in five-file diff;reviewer did not independently run tests and did not assess real-provider scoring.

Commands actually run:
- pnpm --filter @worklingo/api exec vitest run --config vitest.beginner-evaluator-context.config.ts
- pnpm exec eslint apps/api/src/teacher-ai/application/evaluation.service.ts apps/api/src/ai-gateway/domain/language-evaluation.port.ts apps/api/src/ai-gateway/infrastructure/openai-language-evaluation.adapter.ts apps/api/src/teacher-ai/application/beginner-evaluator-context.spec.ts apps/api/src/teacher-ai/application/evaluation.service.spec.ts
- pnpm --filter @worklingo/api exec tsc --noEmit
- pnpm --filter @worklingo/api build

Default API test configuration is excluded because it loads.env/DB fallbacks. Dedicated harness blocks real network/Prisma/env and uses synthetic fetch only. Legacy regressions cover service/cache/serializer/projection boundaries,not full application E2E. Full live provider,DB,GateC/publication tests NOT_RUN and not counted PASS.

## Exact file hashes
~~~json
[
  {
    "path": "apps/api/src/teacher-ai/application/evaluation.service.ts",
    "sha256": "bdee7da0b52168c5e3e625b66ea55a7d1401c815dd3edcb0ec90b937c839f1b4"
  },
  {
    "path": "apps/api/src/ai-gateway/domain/language-evaluation.port.ts",
    "sha256": "7d8cc715c3e7e92490276620f9930df13cbf7be3fe53eb92d93cdf87f0fc51a9"
  },
  {
    "path": "apps/api/src/ai-gateway/infrastructure/openai-language-evaluation.adapter.ts",
    "sha256": "327d81a176cd497813991e1fd0b38304ca655cb72a6df2761e04973c0025d5e7"
  },
  {
    "path": "apps/api/src/teacher-ai/application/beginner-evaluator-context.spec.ts",
    "sha256": "dabf2ac4a05936ccf5f2c5584f0e62065be0d4e8e14c40161aadaa2f41edc78c"
  },
  {
    "path": "apps/api/src/teacher-ai/application/evaluation.service.spec.ts",
    "sha256": "e78f42d1673ee9a7c4e1453e817639193b39679321e9ab551ab4a514e5da47ab"
  }
]
~~~

## Scope and preservation
Only three approved product files,two approved test files and this new report changed,plus authorized capture/approval/lifecycle metadata. All21 read-only baseline files match. Context/rubric data stays private server-side;source and prior qualification snapshots retain their historical bytes. Existing old result retrieval/history is preserved;new evaluation cannot silently reuse contextless cached scores.

## Remaining boundaries
No blocker remains within this product-fix scope. Real model scoring calibration,exact exposed model version,phonetic/provenance evidence and real learner timing remain separate qualification work. Prior AI review code bindings must be refreshed under their own authority before final qualification. Old MND-20261028-002/003/004,GateB,R1.2a/R1.2b and GateC lifecycle/readiness unchanged;only this new fix may be verified. No DB/provider/OS/merge/push/deploy/publication action.

## Rollback
Inverse local commit only for five source/test files;record actual withdrawal in scoped evidence. Preserve all database/history/source/audio. Rollback reopens P1 and blocks learner evaluation;never reset data or silently claim readiness.

## Workflow rulings
Exact allowlist overrides extra workflow scratch writes:ledger is this approved report. Parent/old verification records stay frozen even though their historic tests were red. Existing requested real Discovery/DB permissions are unnecessary for this isolated contract fix.

## SKILL AUDIT
Used mandate-steward(authority/lifecycle),executing-plans/TDD(RED-GREEN),git-workflow-and-versioning(explicit staging/local commit),verification-before-completion(actual checks),requesting-code-review(independent read-only review). No new planning cycle,provider/DB/E2E/GateC workflow used.
