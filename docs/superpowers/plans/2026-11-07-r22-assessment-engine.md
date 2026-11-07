# R2.2 Assessment Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Extend the actual four-skill learner workflow with versioned, evidence-validated AI-first assessment and immutable history.

**Architecture:** Existing TeacherAiModule/EvaluationService and LanguageEvaluationPort own orchestration; EvaluationRun extends ActivityAttempt history while legacy results stay compatible. Shared contracts and skill policies feed safe feedback and separate mastery projections.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Zod, Next.js/React, Vitest/Playwright; existing OpenAI/Discovery/Microsoft adapters.

**Spec:** docs/superpowers/specs/2026-11-07-r22-assessment-design.md

## Global Constraints

- Baseline origin/main 66af136; preserve unrelated user changes and R2.1 completion rules.
- No purchases/top-ups/increased limits, production learner data or destructive shared writes.
- Every semantic score uses AI; missing mandatory evidence produces no total. Fake/local fixture results never establish AI qualification.
- Preserve historical REVISE and all old evaluation rows. Four-level criterion scale 0–3, normalized total 0–100 only when required criteria pass validation.
- Server-only private context; exact program/lesson/activity/rubric/policy/prompt/provider identities. Unknown metadata null.
- No production deployment from local success. Final reports distinguish IMPLEMENTED, TESTED, VERIFIED, AI_QUALIFIED, HUMAN_VALIDATED, NOT_RUN and BLOCKED.

## Review Focus

- Reused idempotency key with different context must reject without extra provider calls (Task2).
- Concurrent/retried/re-evaluated same submission must not double-count mastery or mutate terminal history (Task4).
- Correct transcript with unavailable acoustic evidence must not score pronunciation/total (Task3).
- Provider verdict must not introduce evidence, hidden answers or instructions into learner DTOs (Tasks1/2/5).
- Legacy Beginner participation/completion and old result uniqueness must remain unchanged (Tasks4/6).

### Task 1: Shared strict contracts and skill rubric policies

**Files:** packages/contracts/src/assessment.contracts.ts and .spec.ts, index.ts; apps/api/src/teacher-ai/domain/assessment-{rubrics,scoring,context}.ts and specs.
**Interfaces:** AssessmentResult, AssessmentCriterion, AssessmentEvidence, AssessmentProviderVerdict; resolveAssessmentRubric(skill), aggregateAssessment(rubric, verdict, evidence), resolveAssessmentContext(attempt).
- [x] Write failing contracts/scoring/context tests: null-score incomplete evidence; required/duplicate criteria; literal weighted result; passage/audio/snapshot tamper; learner projection excludes private fields.
- [ ] Run relevant Vitest; Expected FAIL for missing behavior. Historical limitation: initial scoring RED was not observed; first run occurred after implementation. Later targeted regression RED→GREEN and complete final suites are recorded in the execution report.
- [x] Implement strict versioned contracts, exact context hashing and four rubric policies with deterministic objective evaluation and AI semantic criteria.
- [x] Run scoped suites/typecheck; Expected PASS. Commit explicit files.

### Task 2: Existing provider abstraction and orchestration

**Files:** ai-gateway domain/language-evaluation.port.ts; existing OpenAI/Discovery/routing adapters; teacher-ai/domain/assessment-orchestrator.ts and specs.
**Interfaces:** evaluateAssessment(input: AssessmentProviderInput, signal?:AbortSignal):Promise<AssessmentProviderResponse>; runAssessment(context, primary, verifier, signal).
- [x] Write failing serializer/orchestration tests for structured evidence/metadata, provider refusal/schema errors, timeout/cancellation, independent verifier, disagreement/abstention, key/context mismatch and injection.
- [x] Run tests; Expected FAIL.
- [x] Extend actual adapters/HTTP cancellation, bounded independent-role orchestration and actual usage/model metadata; no silent scoring fallback.
- [x] Run real local HTTP fixture tests through serializers and existing adapter regressions; Expected PASS. Commit.

### Task 3: Actual speaking audio/acoustic evidence

**Files:** ai-gateway speech port/Microsoft adapter; teacher-ai/domain/assessment-audio.ts and specs; transcription handler.
**Interfaces:** validateAssessmentAudio(bytes,mime,expectedHash); SpeechTranscription acoustic evidence; speaking mandatory dimension admission.
- [x] Write failing tests: silence/corrupt/size/duration/hash rejection, word/phoneme timing preservation, absent phonemes/prosody explicitly unassessed, transcript alone cannot score.
- [x] Run tests; Expected FAIL.
- [x] Implement supported PCM validation/VAD, preserve provider acoustics, secure retained recording checks and identity; no invented stress/accent scores.
- [x] Run adapter/audio/speaking regressions; Expected PASS. Commit.

### Task 4: Persisted attempt-backed history/API/mastery

**Files:** prisma/schema.prisma + additive migration; teacher-ai/application/assessment-history.service.ts, EvaluationService/module/controllers; mastery assessment projection and specs/integration.
**Interfaces:** requestAssessment(learnerId,attemptId,key,previousId), getAssessmentHistory(actor,attemptId), cancelAssessment(actor,runId), projectAssessmentMastery(runs).
- [x] Write failing actual DB/API cases for all four skills, exact pins, auth/privacy, concurrent idempotency, linked re-evaluation, expired-lease recovery, cancellation, immutable terminal rows and unique-submission mastery.
- [x] Run against new owned disposable DB; Expected FAIL.
- [x] Add EvaluationRun history, guarded lifecycle endpoints/rate limits, job integration and separate mastery projection; preserve legacy table/flow invariants.
- [x] Migrate/recover disposable DB and run integration + legacy regressions; Expected PASS. Commit.

### Task 5: Learner/Admin feedback and benchmark tooling

**Files:** existing session feedback/hooks/api client; assessment history/admin components and i18n; apps/api/scripts/assessment-benchmark.ts, versioned benchmark fixtures and reports.
**Interfaces:** shared public AssessmentResult/history; admin-only audit; benchmark metrics with denominators/intervals and provenance.
- [x] Write failing UI/benchmark tests for four skills, null/missing criteria, bounded evidence/corrections, audio timestamps, history/re-evaluate, auth and metrics including zero denominators.
- [x] Run tests; Expected FAIL.
- [x] Implement responsive accessible feedback/history and benchmark/adjudication CLI; preserve failures; research provider comparison and verified cost/privacy without inventing live evidence.
- [x] Run component/local fixture benchmark and real browser four-skill workflow on disposable DB at390×844,768px,desktop; Expected PASS for engineering assertions, real model qualification separately reported. Commit.

### Task 6: Full verification, independent review and integration

**Files:** docs/qualification/r22/ required20-document set, plan and final audit.
- [x] Run API/web/contracts full relevant suites, security/privacy, builds/lint/typechecks, migrations and R2.1/legacy regression. Expected PASS; preserve and fix genuine failures.
- [x] Dispatch independent whole-branch review, reproduce/fix important findings test-first; Expected no unresolved confirmed Critical/Important engineering issue.
- [x] Audit all commits/secrets/scope/history, commit actual evidence; integrate current main preserving user changes only after all engineering gates. Normal push/readback succeeded at 91521a9; final documentation receipt follows, see integration-receipt.md.
- [x] Record all four skill engineering and separate actual AI qualification statuses, external blockers and production restrictions without inflating evidence.
