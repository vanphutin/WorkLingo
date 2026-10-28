# Verify Beginner evaluator task context loss using isolated contract tests without product changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for later approved execution. This capture does not start execution.

**Goal:** Resolve uncertainty before real learner evaluation;prevent silent false-positive/negative grading and DTO leakage.

**Architecture:** Independent successor; exact scope and baseline JSON below govern writes. Existing qualified-human Gate B remains frozen. Offline evidence only.

**Tech Stack:** Existing TypeScript/tsx/Vitest; JSON/Markdown qualification artifacts;no schema/DB/provider changes.

**Spec:** mandate/reports/2026-10-28-beginner-successors-capture-authorization.md; mandate/reports/2026-10-28-beginner-successor-evaluator-context-scope.json; existing docs/superpowers/plans/2026-10-24-beginner-implementation.md and docs/superpowers/plans/2026-10-27-beginner-r12b-qualification.md.

## Global Constraints
- CAPTURE_ONLY now; execution requires future matching proposal approval and CLI lifecycle.
- No DB/.env/provider/network/OS/publication/enrollment/Gate C/merge/push/deploy. No product or schema writes.
- Do not modify any existing mandate, old human claims or A evidence; no old verdict transfer.
- All existing B/authoring/R1.2a lifecycle states unchanged. Runtime/provider tests NOT_RUN in capture.

## Exact files
{
  "modify": [],
  "create": [
    "apps/api/vitest.beginner-evaluator-context.config.ts",
    "apps/api/src/teacher-ai/application/beginner-evaluator-context.spec.ts",
    "apps/api/test/beginner-evaluator-context.setup.ts",
    "docs/qualification/beginner-evaluator-context-verification.md"
  ],
  "fingerprint": "62c98d25f7d4ffc15f07ac3021d6ee39a2dd14df2e58d014b28774f836cb86d5"
}

## Dependencies
- Runs first;does not depend on content correction or AI-led policy.
- Finding may require separately captured and approved fix mandate;verification approval never authorizes product writes.

## Review Focus
- Hash drift: fail closed; legitimate approved dependency outputs require exact successor binding,not latest fallback.
- Characterization PASS is not desired-contract PASS.
- Old audio reuse needs exact unchanged script/WAV and explicit new-source binding.
- AI decision is not teacher signature or measured learner performance.
- Missing model/phonetic/learning evidence blocks final qualification.

## Tasks after matching approval only

### Task 1
**Files:** exact scope allowlist only; no implicit additions.
**Inputs:** frozen scope/baseline; prior task evidence where applicable.
**Outputs:** Implement isolated config/setup and tests capturing mocked service/serializer/routing requests;block .env,DB,network.
- [ ] Establish named failing assertions or evidence gaps before changes;no fabricated red result.
- [ ] Implement isolated config/setup and tests capturing mocked service/serializer/routing requests;block .env,DB,network.
- [ ] Run applicable commands below;record PASS/FAIL/BLOCKED and actual output,never skip to PASS.
- [ ] Review diff and only commit exact allowlisted changes after relevant acceptance;no push/merge.

### Task 2
**Files:** exact scope allowlist only; no implicit additions.
**Inputs:** frozen scope/baseline; prior task evidence where applicable.
**Outputs:** Run characterization and desired-contract assertions;report all actual FAIL separately without changing product or hiding assertions.
- [ ] Establish named failing assertions or evidence gaps before changes;no fabricated red result.
- [ ] Run characterization and desired-contract assertions;report all actual FAIL separately without changing product or hiding assertions.
- [ ] Run applicable commands below;record PASS/FAIL/BLOCKED and actual output,never skip to PASS.
- [ ] Review diff and only commit exact allowlisted changes after relevant acceptance;no push/merge.

### Task 3
**Files:** exact scope allowlist only; no implicit additions.
**Inputs:** frozen scope/baseline; prior task evidence where applicable.
**Outputs:** Verify DTO/legacy/exact-version paths;record evidence and proposed separately authorized fix if required.
- [ ] Establish named failing assertions or evidence gaps before changes;no fabricated red result.
- [ ] Verify DTO/legacy/exact-version paths;record evidence and proposed separately authorized fix if required.
- [ ] Run applicable commands below;record PASS/FAIL/BLOCKED and actual output,never skip to PASS.
- [ ] Review diff and only commit exact allowlisted changes after relevant acceptance;no push/merge.

## Acceptance
- Create only four approved test/report files; product read-only; configuration uses safe Beginner transpiler,no ordinary vitest config,.env,DB or real network/providers.
- Capture evaluateAttempt request and mock-fetch serialized OpenAI/Discovery requests/routing for two synthetic exact-version cards with opposite fact correctness under same prompt/response; inspect alternate context paths.
- Separate characterization from desired-context assertions; report desired-contract FAIL as finding,not masked by characterization PASS. Fake semantic score cannot establish real-provider grading correctness.
- Check rubric ID/version/skill dispatch,referenceText/requiredPhrases,acceptable alternatives,exact historical V1 evaluation and snapshot mismatch denial; retain private cache LessonVersion binding.
- Learner DTO exposes needed public card only; no model/private rubric/key/listening transcript; compare Foundation1.0/1.1 and Intermediate/IELTS request/projection regressions.
- Report confirmed static omission versus mocked-contract reproduction versus unknown real-provider behavior separately; no production-bug claim without evidence.
- If omission confirmed,capture proposed product-fix scope separately after owner authorization; no product fix here. Investigation complete is not P1 resolved; actual evaluator use blocked until corrective verification closes finding.
- Run focused isolated tests,lint/typecheck/build as applicable without secrets/network/DB; report FAIL/BLOCKED/skipped honestly.

## Commands after approval
- `pnpm --filter @worklingo/api exec vitest run --config vitest.beginner-evaluator-context.config.ts`

## Rollback
Revert only four new files via scoped commit if implemented;retain actual finding evidence and do not declare unresolved P1 closed.

## Capture review
Plan self-reviewed against owner capture authorization. Exact changes/tests/dependencies are in frozen scope. No runtime acceptance has run. Cost USD0;effort m is an estimate,not actual duration.
