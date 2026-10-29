# Beginner evaluator pinned context fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans after matching approval. Capture only now;no execution.

**Goal:** Close the confirmed P1 missing-context contract while preserving privacy and legacy behavior.
**Architecture:** Reuse exact pinned Lesson snapshot role cards and private responseRubrics. Add optional server-only Beginner context to evaluation port;existing shared serializer carries it to both adapters. No schema,DTO or routing rewrite.
**Tech Stack:** Existing NestJS/TypeScript/Vitest,synthetic fixtures,mocked Prisma/fetch.
**Spec:** mandate/reports/2026-10-29-beginner-evaluator-context-fix-capture-authorization.md; mandate/reports/2026-10-29-beginner-evaluator-context-fix-scope.json; docs/qualification/beginner-evaluator-context-verification.md; existing Beginner implementation plan.

## Global Constraints
- Exact allowlist only;no DB/env/network/provider/OS/content/audio/schema/publication/GateC/merge/push/deploy/readiness change.
- Existing old mandates/approval/verification records remain frozen. No broad planning or re-investigation.
- Existing two desired tests are the regression target,not tests to skip/delete.

## Review Focus
- Old contextless cached Beginner result must not bypass the new guard.
- V1 stays pinned after V2 publication;no latest lookup or premature invalidation of valid V1.
- Referenced card ambiguity and whitespace-only criteria fail before any provider or write.
- Both adapters use shared serialization;legacy input/hash stay unchanged.
- Private context stays server-side and untrusted;no learner DTO enrichment.

## Exact Files
{
  "modify": [
    "apps/api/src/teacher-ai/application/evaluation.service.ts",
    "apps/api/src/ai-gateway/domain/language-evaluation.port.ts",
    "apps/api/src/ai-gateway/infrastructure/openai-language-evaluation.adapter.ts",
    "apps/api/src/teacher-ai/application/beginner-evaluator-context.spec.ts",
    "apps/api/src/teacher-ai/application/evaluation.service.spec.ts"
  ],
  "create": [
    "docs/qualification/beginner-evaluator-context-fix-verification.md"
  ],
  "fingerprint": "098e07cd423cd172970b59c82310d15b55b02304b32bba81904200bebd806d81"
}

## Task1 — Witness RED and pin missing-context/cache/privacy cases
**Files:** two existing allowlisted test files only.
**Consumes:** synthetic pinned snapshots plus actual shared serializer/routing with mocked fetch.
**Produces:** real RED assertions for mandatory role facts,authored criteria/alternatives,missing/ambiguous context,old-cache conflict and valid V1 replay.
- [ ] Run dedicated baseline:expected36tests34PASS2actualFAIL;record actual result before product changes.
- [ ] Extend desired assertions and add negative missing/blank/duplicate/stale identity/direct-adapter cases;add cached-valid V1 and old-contextless cache cases.
- [ ] Update synthetic Beginner fixtures with valid authored private criteria. Keep actual privacy/legacy assertions;change old identical-request characterization to expected distinct requests only after RED evidence.

## Task2 — Minimal server context and real GREEN
**Files:** EvaluationService,evaluation port and shared OpenAI serializer only.
**Interface:** optional LanguageEvaluationInput.beginnerContext:BeginnerEvaluationContextV1;schemaVersion,lessonVersionId,activityId,activitySlug,roleCards,taskCriteria. Export assertBeginnerEvaluationContext(input):void from port for shared serializer enforcement;legacy without context passes unchanged.
- [ ] Resolve requested cards uniquely by activity.contentReferences in validated pinned snapshot;read exact responseRubrics[activity.slug],validate mandatory identity/content before existing-result replay.
- [ ] Pass context to gateway;conditionally add deterministic context to Beginner inputHash only. Existing cache with old hash conflicts;no historical mutation.
- [ ] Shared untrustedInput validates context for Beginner rubrics and conditionally serializes it. Keep legacy serialized fields/instructions unchanged;criteria and alternatives are authored data,no sample-only scoring.
- [ ] Run dedicated full suite:all old two desired assertions and added regressions must PASS. Do not change routing/Discovery product code:existing forwarding/shared serializer is reused and tested.

## Task3 — Regression/review/report/local commit
**File:** new fix verification report only for evidence/ledger.
- [ ] Run focused lint,typecheck,build and isolated mock-only regressions. Do not invoke default API Vitest config because it loads.env/DB fallback.
- [ ] Independently review security/cache/legacy/privacy and actual diff. Record commands/counts/limitations;no live-grading accuracy claim.
- [ ] Commit exact allowlisted files only after GREEN;no push/merge. Propose scope-bound engineering verified only when all acceptance passes;do not advance old mandates or qualification automatically.

## Acceptance
- Two original desired-contract assertions become genuine PASS after a witnessed RED baseline;no skip/test.fails or weakening context distinction/acceptable-alternatives intent.
- BeginnerEvaluationContextV1 contains schemaVersion beginner-evaluation-context/1,exact lessonVersionId,activityId,activitySlug,referenced roleCards [{slug,text}] and exact authored taskCriteria from snapshot.foundation.responseRubrics[activity.slug]. Authored acceptable alternatives travel inside taskCriteria;no regex guessing/generated alternatives or model-only matching.
- EvaluationService resolves only its validated pinned snapshot and bound activity before cache replay/provider/transaction. Missing/blank criteria,missing/blank referenced cards,duplicate/ambiguous refs or mismatched snapshot identity fail closed;never first-Lesson/latest/global-card fallback.
- Shared server-side serializer asserts mandatory valid Beginner context even on direct adapter bypass. OpenAI and Discovery receive exact same context through existing shared untrustedInput;existing routing preserves it without product routing changes. Entire context is untrusted lesson data,not privileged instructions.
- Beginner cache input hash conditionally includes complete deterministic context/schema identity. Legacy hash/serialization remain byte-for-byte unchanged without context. Valid new V1 cache stays V1 after V2 pointer publish;old contextless or changed-context results fail conflict before replay/provider/mutation. Never delete,migrate,rescore or overwrite historical results automatically.
- No model/private rubric/key/listening transcript added to learner DTO. Existing genuine projection/privacy and version/rubric guards remain. No sample-answer or requiredPhrases shortcut for Beginner.
- Full dedicated isolated suite plus new missing/ambiguous/malformed/context injection tests,OpenAI/Discovery mocked-fetch,routing,cache/replay,V1/V2,legacy Foundation1.0/1.1 and Intermediate/IELTS service/projection regressions PASS. No real provider/HTTP/DB/env. All synthetic fixtures gain valid authored criteria rather than relaxing mandatory guard.
- Focused lint,API typecheck and API build PASS;independent read-only review and diff/hash verification. No skipped/BLOCKED test counted PASS;full unsafe default suites remain excluded and limits explicit.
- Only five modified source/test files and one new report;old verification/human/policy/content/audio records untouched. Report real engineering closure and limitations;do not automatically verify older mandates,release,GateC or R1.2b readiness.

## Commands after matching approval
- `pnpm --filter @worklingo/api exec vitest run --config vitest.beginner-evaluator-context.config.ts`
- `pnpm exec eslint apps/api/src/teacher-ai/application/evaluation.service.ts apps/api/src/ai-gateway/domain/language-evaluation.port.ts apps/api/src/ai-gateway/infrastructure/openai-language-evaluation.adapter.ts apps/api/src/teacher-ai/application/beginner-evaluator-context.spec.ts apps/api/src/teacher-ai/application/evaluation.service.spec.ts`
- `pnpm --filter @worklingo/api exec tsc --noEmit`
- `pnpm --filter @worklingo/api build`
- `node .agents/skills/mandate-steward/scripts/mandate.mjs validate`

## Rollback
Revert only five product/test files via inverse local commit and append withdrawal to the new fix report. Preserve all source/audio/old reports/sessions/evaluations. Contextless historical caches are never overwritten or migrated. A rollback reopens P1 and blocks actual learner evaluation;no deployment or data reset.

## Self-review
Coverage mapped to tasks1-3. Five ReviewFocus cases have explicit tests. No extra routing/DTO/DB changes assumed. Unknown actual live grading stays outside this fix and current authority.
