# Increment 4 Speech, TTS, and Teacher AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a local-first speaking and structured-writing journey that saves submissions before asynchronous evaluation, supports optional Microsoft Speech and OpenAI-compatible adapters, survives provider failures, and updates learner mastery exactly once.

**Architecture:** Extend the modular NestJS application with provider-neutral AI Gateway, Media, Teacher AI, and durable PostgreSQL job boundaries. Next.js submits recordings or writing, polls learner-safe evaluation state, and renders feedback; deterministic fake providers remain the default while real adapters are selected only by validated configuration.

**Tech Stack:** Node.js 20, TypeScript 5.9, pnpm 10, NestJS 11, Prisma 6/PostgreSQL, Zod 4, Next.js 16/React 19, browser MediaRecorder, Vitest, Supertest, Playwright, local filesystem object storage, Microsoft Speech REST APIs, OpenAI-compatible Responses API.

**Spec:** `docs/superpowers/specs/2026-10-07-increment-4-speech-teacher-ai-design.md`

## Global Constraints

- Preserve the local-first runtime: fake STT, language evaluation, and TTS must run with no external credentials or network calls.
- Save the learner attempt and durable job before returning success; provider failure must not lose the response or regress a session checkpoint.
- Keep all provider calls behind backend ports. The web application must never receive or use provider credentials.
- Use Microsoft Speech as the initial real STT/pronunciation and TTS adapter; use an OpenAI-compatible Responses API adapter for language evaluation.
- Raw audio must stay in object storage, never PostgreSQL, job payloads, application logs, or Git fixtures.
- Store only normalized evaluation data and redacted diagnostics; never persist raw provider responses.
- Delete terminal recordings after seven days and abandoned writing drafts after 30 days; preserve transcripts, structured feedback, scores, and mastery evidence.
- Treat lesson text, transcript, and learner writing as untrusted prompt data. They cannot alter the rubric, schema, level, or feedback language.
- Foundation feedback is concise Vietnamese, may include English correction examples, and lists at most three improvements.
- Do not present `workplace-checkpoint-v1` or score `0.7` as CEFR/B2, IELTS, TOEIC, or employment certification.
- Do not claim human calibration or pilot readiness unless actual human ratings are present in the calibration report.
- Use TDD for every behavior change: observe a focused failing test, implement the minimum behavior, observe the focused pass, then run relevant regressions.
- Preserve the untracked root `AGENTS.md`; never stage it. Stage only explicit task files and make one atomic commit per task.

## Review Focus

- Reusing a speaking `clientAttemptId` after uploading different bytes must return the original same-target attempt and delete the newly staged duplicate object; it must never create a second recording/job.
- Deleting a recording while work is queued or running must prevent future provider retries and must not recreate or retain the audio after cleanup.
- A stale writing-draft revision from another tab must return a conflict and preserve the newest server draft.
- A worker crash after a provider response but before final commit must be safely reclaimable and produce one official evaluation and one set of mastery events.
- A session created on lesson version N must continue streaming version N audio after version N+1 is published.

---

### Task 1: Shared Teacher AI Contracts and Provider Configuration

**Files:**
- Create: `packages/contracts/src/teacher-ai.contracts.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `apps/api/src/common/config/app-config.schema.ts`
- Modify: `apps/api/src/common/config/app-config.schema.spec.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: existing Zod contract conventions and `parseAppConfig(environment)`.
- Produces: `evaluationStatusSchema`, `evaluationDtoSchema`, `recordingSubmissionResultSchema`, `writingDraftSchema`, `EvaluationDto`, `RecordingSubmissionResult`, and provider settings under `AppConfig.ai`.

- [ ] **Step 1: Write failing configuration tests**

Add cases proving fake providers are the defaults; fake mode starts without credentials; selecting Microsoft STT/TTS requires key and region; selecting OpenAI-compatible evaluation requires key, base URL, and model; timeout, attempt, retention, recording-size, and recording-duration bounds reject unsafe values; thrown messages contain field names but not supplied secret values.

- [ ] **Step 2: Run the configuration test and observe RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/common/config/app-config.schema.spec.ts`

Expected: FAIL because provider fields and validation do not exist.

- [ ] **Step 3: Add the shared schemas and typed configuration**

Implement the contracts from the spec and extend `AppConfig` with nested immutable settings for STT, language evaluation, TTS, timeouts, retry limits, seven-day recording retention, 30-day draft retention, 10 MB upload limit, and two-minute duration limit. Keep all secret fields optional in fake mode and omit them from any serializable public config shape.

- [ ] **Step 4: Run focused tests and workspace type checks**

Run: `pnpm --filter @worklingo/api test -- src/common/config/app-config.schema.spec.ts && pnpm --filter @worklingo/contracts typecheck && pnpm --filter @worklingo/api typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the contract/config slice**

```bash
git add .env.example packages/contracts/src/teacher-ai.contracts.ts packages/contracts/src/index.ts apps/api/src/common/config/app-config.schema.ts apps/api/src/common/config/app-config.schema.spec.ts
git commit -m "feat: define Teacher AI contracts and provider configuration"
```

---

### Task 2: Teacher AI Persistence and Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20261007120000_add_teacher_ai_pipeline/migration.sql`
- Create: `apps/api/test/integration/teacher-ai-schema.integration.spec.ts`
- Modify: `docs/DATA_MODEL.md`

**Interfaces:**
- Consumes: current `User`, `LearningSession`, `Activity`, `ActivityAttempt`, `Job`, `MasteryEvent`, and `AudioArtifact` models.
- Produces: Prisma models/enums for `Recording`, `EvaluationResult`, `ActivityDraft`, `JobAttempt`, expanded `Job`, and expanded `AttemptEvaluationStatus`/`JobStatus`.

- [ ] **Step 1: Write the failing isolated-schema integration test**

Test migration from an empty randomly named schema and assert: recording is unique by `attemptId`; evaluation is unique by `(attemptId, rubricVersion)`; draft is unique by `(learnerId, sessionId, activityId)`; jobs require a unique idempotency key and expose lease/retry fields; job attempts relate to a job; ownership relations use restrictive/cascading deletes as specified; the existing content-audio rows remain readable after migration.

- [ ] **Step 2: Run the schema test and observe RED**

Run: `pnpm --filter @worklingo/api exec vitest run test/integration/teacher-ai-schema.integration.spec.ts`

Expected: FAIL because the models and migration do not exist.

- [ ] **Step 3: Implement the additive Prisma schema and migration**

Add explicit enums and indexes for queue scans, learner evaluation reads, retention cleanup, and draft expiry. Generalize `Job` without dropping existing Increment 2 job data; backfill existing job idempotency keys deterministically in SQL before applying the unique constraint. Keep provider/model/config fields non-secret strings or JSON.

- [ ] **Step 4: Generate Prisma client and verify both migration paths**

Run: `pnpm --filter @worklingo/api prisma generate && pnpm --filter @worklingo/api exec vitest run test/integration/teacher-ai-schema.integration.spec.ts test/integration/content-schema.integration.spec.ts test/integration/content-audio.integration.spec.ts`

Expected: PASS on empty and current-schema fixtures.

- [ ] **Step 5: Commit the persistence slice**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations apps/api/test/integration/teacher-ai-schema.integration.spec.ts docs/DATA_MODEL.md
git commit -m "feat: add durable Teacher AI persistence"
```

---

### Task 3: Rubrics, Provider Ports, Fake Adapters, and Golden Fixtures

**Files:**
- Create: `apps/api/src/ai-gateway/domain/speech-to-text.port.ts`
- Create: `apps/api/src/ai-gateway/domain/language-evaluation.port.ts`
- Create: `apps/api/src/ai-gateway/domain/provider-errors.ts`
- Create: `apps/api/src/ai-gateway/domain/language-evaluation.schema.ts`
- Create: `apps/api/src/ai-gateway/infrastructure/fake-speech-to-text.adapter.ts`
- Create: `apps/api/src/ai-gateway/infrastructure/fake-language-evaluation.adapter.ts`
- Create: `apps/api/src/teacher-ai/domain/foundation-rubrics.ts`
- Create: `apps/api/src/teacher-ai/domain/foundation-rubrics.spec.ts`
- Create: `apps/api/src/ai-gateway/infrastructure/fake-provider-contract.spec.ts`
- Create: `packages/test-fixtures/src/teacher-ai.fixture.ts`
- Modify: `packages/test-fixtures/src/index.ts`

**Interfaces:**
- Consumes: immutable activity payload, lesson level, required phrases, recording metadata, and shared Teacher AI contracts.
- Produces: `SpeechToTextPort.transcribe(input): Promise<SpeechTranscription>`, `LanguageEvaluationPort.evaluate(input): Promise<LanguageEvaluation>`, normalized `ProviderError`, `resolveRubric(activity, level)`, and `aggregateEvaluation(rubric, language, speech?)`.

- [ ] **Step 1: Write failing rubric and fake-provider contract tests**

Assert exact Foundation weights from the spec; all scores remain in `0..1`; speaking cannot finalize without speech-derived pronunciation/fluency; writing never accepts a pronunciation score; feedback rejects more than three improvements or unbounded text; identical fake inputs are deterministic; prompt-injection fixture text is treated as data; silent/invalid fake audio maps to a normalized non-retryable error.

- [ ] **Step 2: Run the tests and observe RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/teacher-ai/domain/foundation-rubrics.spec.ts src/ai-gateway/infrastructure/fake-provider-contract.spec.ts`

Expected: FAIL because the ports, rubrics, schemas, fixtures, and adapters do not exist.

- [ ] **Step 3: Implement the pure domain and deterministic adapters**

Keep Zod parsing and score aggregation pure. Fake adapters consume versioned fixtures/checksums and return production-shaped normalized values without network access. They must not inspect environment credentials.

- [ ] **Step 4: Run focused tests and type checks**

Run: `pnpm --filter @worklingo/api exec vitest run src/teacher-ai/domain/foundation-rubrics.spec.ts src/ai-gateway/infrastructure/fake-provider-contract.spec.ts && pnpm --filter @worklingo/test-fixtures typecheck && pnpm --filter @worklingo/api typecheck`

Expected: PASS.

- [ ] **Step 5: Commit the domain/fake-provider slice**

```bash
git add apps/api/src/ai-gateway apps/api/src/teacher-ai/domain packages/test-fixtures/src
git commit -m "feat: add versioned rubrics and fake AI providers"
```

---

### Task 4: Durable PostgreSQL Job Dispatcher and Worker

**Files:**
- Create: `apps/api/src/jobs/domain/job-dispatcher.port.ts`
- Create: `apps/api/src/jobs/domain/job-handler.port.ts`
- Create: `apps/api/src/jobs/application/job-runner.service.ts`
- Create: `apps/api/src/jobs/application/job-runner.service.spec.ts`
- Modify: `apps/api/src/jobs/application/jobs.service.ts`
- Modify: `apps/api/src/jobs/jobs.module.ts`
- Modify: `apps/api/src/jobs/jobs.controller.ts`
- Create: `apps/api/test/integration/jobs-worker.integration.spec.ts`

**Interfaces:**
- Consumes: generalized Prisma `Job`/`JobAttempt`, validated retry settings, and registered `JobHandler` implementations.
- Produces: `JobDispatcher.enqueue(input): Promise<JobReference>`, `JobsService.claimNext(workerId, now): Promise<ClaimedJob | null>`, `JobRunnerService.runOnce(): Promise<boolean>`, and admin retry/status behavior.

- [ ] **Step 1: Write failing unit tests for retry decisions**

Assert timeout/429/5xx back off with bounded jitter for at most three attempts; invalid/refused/incomplete structured output retries once; auth/consent/invalid-audio does not retry automatically; public errors contain safe codes only.

- [ ] **Step 2: Write failing PostgreSQL concurrency tests**

Assert two runners cannot claim the same row; an expired lease is reclaimable; a live lease is not; one crashed run followed by reclaim creates one terminal result transition; retry preserves the same job identity; existing fake-audio jobs remain readable.

- [ ] **Step 3: Run the focused tests and observe RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/jobs/application/job-runner.service.spec.ts test/integration/jobs-worker.integration.spec.ts`

Expected: FAIL because the dispatcher, lease claim, retry scheduling, and runner do not exist.

- [ ] **Step 4: Implement claim, lease, dispatch, and bounded retry**

Use a short PostgreSQL transaction with `FOR UPDATE SKIP LOCKED` for claim. Commit the lease before external work. Persist one `JobAttempt` per invocation. Register handlers by explicit job type and reject unknown types safely. Do not expose generic learner job access.

- [ ] **Step 5: Add the in-process polling lifecycle**

Start one interval-driven worker only when configured, prevent overlapping polls in one process, and stop cleanly on module shutdown. Unit tests use `runOnce()` and fake time rather than real sleeps.

- [ ] **Step 6: Run focused and existing job/audio regressions**

Run: `pnpm --filter @worklingo/api exec vitest run src/jobs test/integration/jobs-worker.integration.spec.ts test/integration/content-audio.integration.spec.ts`

Expected: PASS.

- [ ] **Step 7: Commit the durable job slice**

```bash
git add apps/api/src/jobs apps/api/test/integration/jobs-worker.integration.spec.ts
git commit -m "feat: add leased PostgreSQL job processing"
```

---

### Task 5: Microsoft Speech and OpenAI-Compatible Adapters

**Files:**
- Create: `apps/api/src/ai-gateway/infrastructure/microsoft-speech.adapter.ts`
- Create: `apps/api/src/ai-gateway/infrastructure/microsoft-speech.adapter.spec.ts`
- Create: `apps/api/src/ai-gateway/infrastructure/openai-language-evaluation.adapter.ts`
- Create: `apps/api/src/ai-gateway/infrastructure/openai-language-evaluation.adapter.spec.ts`
- Create: `apps/api/src/ai-gateway/infrastructure/provider-http-client.ts`
- Create: `apps/api/src/ai-gateway/ai-gateway.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: Task 1 provider configuration and Task 3 ports/schemas/errors.
- Produces: Microsoft `SpeechToTextPort`, OpenAI-compatible `LanguageEvaluationPort`, and configuration-selected dependency-injection bindings.

- [ ] **Step 1: Write failing Microsoft fake-HTTP contract tests**

Using a local fake HTTP server, assert request locale/audio headers and pronunciation context; normalize transcript and pronunciation/fluency; map timeout, 429 with retry hint, 5xx, bad credentials, malformed JSON, silence/no-match, and unsupported audio without leaking the key.

- [ ] **Step 2: Write failing OpenAI-compatible fake-HTTP contract tests**

Assert the Responses API request uses strict Structured Outputs and delimits lesson/transcript/response as untrusted data; parse valid output; reject out-of-range scores and excessive feedback; map refusal, incomplete response, malformed output, timeout, 429, 5xx, and bad credentials.

- [ ] **Step 3: Run adapter tests and observe RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/ai-gateway/infrastructure/microsoft-speech.adapter.spec.ts src/ai-gateway/infrastructure/openai-language-evaluation.adapter.spec.ts`

Expected: FAIL because real adapters and HTTP client do not exist.

- [ ] **Step 4: Implement adapters with Node's backend `fetch`**

Use an abort timeout, read bounded response bodies, redact upstream diagnostics, and pass only normalized contracts across the port. Do not add provider SDKs unless the REST contract cannot satisfy a tested requirement.

- [ ] **Step 5: Run adapter tests and API typecheck**

Run: `pnpm --filter @worklingo/api exec vitest run src/ai-gateway && pnpm --filter @worklingo/api typecheck`

Expected: PASS with no real network or credentials.

- [ ] **Step 6: Commit the real-adapter slice**

```bash
git add apps/api/src/ai-gateway apps/api/src/app.module.ts
git commit -m "feat: add Microsoft Speech and OpenAI evaluation adapters"
```

---

### Task 6: Recording Upload, Consent, and Speaking Submission

**Files:**
- Create: `apps/api/src/media/domain/audio-upload-policy.ts`
- Create: `apps/api/src/media/domain/audio-upload-policy.spec.ts`
- Create: `apps/api/src/media/application/recordings.service.ts`
- Create: `apps/api/src/media/application/recordings.service.spec.ts`
- Create: `apps/api/src/media/dto/create-recording.dto.ts`
- Create: `apps/api/src/media/recordings.controller.ts`
- Create: `apps/api/src/media/media.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/learning-sessions/application/learning-sessions.service.ts`
- Modify: `apps/api/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/api/test/integration/speaking-submission.integration.spec.ts`

**Interfaces:**
- Consumes: `ObjectStorage`, learning-session ownership/current-checkpoint rules, Task 4 `JobDispatcher`, and configured upload/retention limits.
- Produces: `RecordingsService.submit(input, file): Promise<RecordingSubmissionResult>` and `POST /activities/:activityId/recordings` multipart endpoint.

- [ ] **Step 1: Write failing upload-policy tests**

Assert consent is mandatory and versioned; empty, over-10-MB, over-two-minute, extension-only spoofed, or unsupported MIME uploads fail before storage/provider use; the exported WebM/Opus, Ogg/Opus, and WAV/PCM allowlist has valid signature fixtures; storage keys are server-generated. Browsers without one of these recordable types use the unscored fallback rather than uploading an incompatible MP4/AAC file.

- [ ] **Step 2: Write failing speaking integration tests**

Assert owned current speaking activity creates attempt, recording, and `TRANSCRIBE_SPEECH` job atomically and returns `202`; session advances after save; checkpoint evidence remains pending; foreign/non-current/non-speaking targets fail; DB failure deletes the staged object; duplicate same-target `clientAttemptId` returns the original and deletes newly staged different bytes; cross-target key reuse returns `409`.

- [ ] **Step 3: Run focused tests and observe RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/media/domain/audio-upload-policy.spec.ts src/media/application/recordings.service.spec.ts test/integration/speaking-submission.integration.spec.ts`

Expected: FAIL because Media module and endpoint do not exist.

- [ ] **Step 4: Implement staged storage plus transactional metadata/job creation**

Stream/limit multipart input, validate signature and measured duration with the pinned `music-metadata` package before accepting, write to a server-generated `recordings/` key, then create attempt/recording/job and advance the checkpoint in one database transaction. On transaction failure or duplicate replay, compensate by deleting only the newly staged object.

- [ ] **Step 5: Run media, ownership, and storage regressions**

Run: `pnpm --filter @worklingo/api exec vitest run src/media test/integration/speaking-submission.integration.spec.ts test/integration/session-ownership.integration.spec.ts src/storage`

Expected: PASS.

- [ ] **Step 6: Commit the speaking-submission slice**

```bash
git add apps/api/src/media apps/api/src/app.module.ts apps/api/src/learning-sessions/application/learning-sessions.service.ts apps/api/package.json pnpm-lock.yaml apps/api/test/integration/speaking-submission.integration.spec.ts
git commit -m "feat: persist consented speaking recordings"
```

---

### Task 7: Teacher AI Evaluation Pipeline and Exactly-Once Mastery

**Files:**
- Create: `apps/api/src/teacher-ai/application/transcribe-speech.handler.ts`
- Create: `apps/api/src/teacher-ai/application/evaluate-attempt.handler.ts`
- Create: `apps/api/src/teacher-ai/application/evaluation.service.ts`
- Create: `apps/api/src/teacher-ai/application/evaluation.service.spec.ts`
- Create: `apps/api/src/teacher-ai/teacher-ai.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/learning-sessions/application/learning-sessions.service.ts`
- Modify: `apps/api/src/mastery/application/mastery.service.ts`
- Create: `apps/api/test/integration/teacher-ai-pipeline.integration.spec.ts`

**Interfaces:**
- Consumes: Task 3 rubrics/ports, Task 4 job handlers, Task 6 recordings, immutable lesson activity, and `MasteryService.recordAttemptEvaluation`.
- Produces: handlers for `TRANSCRIBE_SPEECH` and `EVALUATE_ATTEMPT`, writing-job enqueue on submission, immutable `EvaluationResult`, and evaluated attempt/mastery projection.

- [ ] **Step 1: Write failing service tests**

Assert speaking persists transcript/provenance before enqueueing evaluation; retry after transcription skips STT; writing enqueues evaluation directly; unsupported-browser text practice advances as explicitly unscored and does not enqueue an official speaking evaluation; provider output is schema-validated; Foundation feedback is Vietnamese and bounded; official scores use exact rubric weights; attempts move through queued/processing/evaluated/failed states.

- [ ] **Step 2: Write failing exactly-once integration tests**

Assert a crash/reclaim after provider success creates one `EvaluationResult`; concurrent duplicate handlers create one result and one mastery event per skill/block; failed provider work leaves the saved raw response and advanced session intact; a successful retry changes pending checkpoint evidence to genuine evaluated evidence without mutating prior checkpoint-assessment snapshots.

- [ ] **Step 3: Run focused tests and observe RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/teacher-ai/application/evaluation.service.spec.ts test/integration/teacher-ai-pipeline.integration.spec.ts`

Expected: FAIL because processors and evaluation persistence do not exist.

- [ ] **Step 4: Implement orchestration and transactional finalization**

Resolve the rubric from immutable activity/version data, call the selected ports outside the final transaction, then insert the unique result and update attempt, mastery, and job completion transactionally. Treat unique-conflict replay as already completed only after verifying the same rubric/input hash.

- [ ] **Step 5: Run Teacher AI, mastery, and progression regressions**

Run: `pnpm --filter @worklingo/api exec vitest run src/teacher-ai test/integration/teacher-ai-pipeline.integration.spec.ts test/integration/mastery.integration.spec.ts test/integration/progression.integration.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit the evaluation slice**

```bash
git add apps/api/src/teacher-ai apps/api/src/app.module.ts apps/api/src/learning-sessions/application/learning-sessions.service.ts apps/api/src/mastery/application/mastery.service.ts apps/api/test/integration/teacher-ai-pipeline.integration.spec.ts
git commit -m "feat: evaluate speaking and writing asynchronously"
```

---

### Task 8: Learner Evaluation, Retry, Draft, Deletion, and Versioned Audio APIs

**Files:**
- Create: `apps/api/src/teacher-ai/evaluations.controller.ts`
- Create: `apps/api/src/teacher-ai/dto/evaluation-response.dto.ts`
- Create: `apps/api/src/learning-sessions/application/activity-drafts.service.ts`
- Create: `apps/api/src/learning-sessions/application/activity-drafts.service.spec.ts`
- Create: `apps/api/src/learning-sessions/dto/save-activity-draft.dto.ts`
- Modify: `apps/api/src/learning-sessions/learning-sessions.controller.ts`
- Modify: `apps/api/src/learning-sessions/learning-sessions.module.ts`
- Modify: `apps/api/src/media/recordings.controller.ts`
- Modify: `apps/api/src/media/application/recordings.service.ts`
- Create: `apps/api/test/integration/teacher-ai-api.integration.spec.ts`
- Create: `apps/api/test/integration/versioned-learner-audio.integration.spec.ts`

**Interfaces:**
- Consumes: persisted evaluation/recording/draft/job data, `ObjectStorage`, and immutable lesson-version audio references.
- Produces: learner-safe evaluation GET/retry, recording DELETE, revision-checked draft PUT/DELETE, and version-bound learner audio stream endpoints.

- [ ] **Step 1: Write failing API ownership and state tests**

Assert learners can access only their attempts, recordings, drafts, and session audio; generic job/provider payloads are absent; retry accepts only failed retryable work with required source data; early deletion cancels queued retries and is idempotent; an already-running request cannot recreate audio; expired recording returns `RECORDING_EXPIRED`.

- [ ] **Step 2: Write failing draft and version-boundary tests**

Assert revision 1 create/update behavior, stale revision conflict preserving newest text, successful writing submit removes the draft, 30-day cleanup eligibility, and a version-N session streams version-N audio after version N+1 publish.

- [ ] **Step 3: Run focused tests and observe RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/learning-sessions/application/activity-drafts.service.spec.ts test/integration/teacher-ai-api.integration.spec.ts test/integration/versioned-learner-audio.integration.spec.ts`

Expected: FAIL because the learner APIs and draft service do not exist.

- [ ] **Step 4: Implement learner-safe projections and commands**

Return normalized status, transcript, scores, bounded feedback, retryability, and retention metadata. Never return storage keys, provider payloads, job-attempt rows, raw provider diagnostics, or another learner's existence.

- [ ] **Step 5: Run API, ownership, content-version, and session regressions**

Run: `pnpm --filter @worklingo/api exec vitest run test/integration/teacher-ai-api.integration.spec.ts test/integration/versioned-learner-audio.integration.spec.ts test/integration/session-ownership.integration.spec.ts test/integration/content-publish.integration.spec.ts test/integration/learning-sessions.integration.spec.ts`

Expected: PASS.

- [ ] **Step 6: Commit the learner API slice**

```bash
git add apps/api/src/teacher-ai apps/api/src/learning-sessions apps/api/src/media apps/api/test/integration/teacher-ai-api.integration.spec.ts apps/api/test/integration/versioned-learner-audio.integration.spec.ts
git commit -m "feat: expose learner evaluation and media controls"
```

---

### Task 9: Configurable TTS and Retention Cleanup

**Files:**
- Move: `apps/api/src/content-authoring/domain/text-to-speech.port.ts` to `apps/api/src/ai-gateway/domain/text-to-speech.port.ts`
- Move: `apps/api/src/content-authoring/infrastructure/fake-tts.adapter.ts` to `apps/api/src/ai-gateway/infrastructure/fake-tts.adapter.ts`
- Move: `apps/api/src/content-authoring/infrastructure/fake-tts.adapter.spec.ts` to `apps/api/src/ai-gateway/infrastructure/fake-tts.adapter.spec.ts`
- Create: `apps/api/src/ai-gateway/infrastructure/microsoft-tts.adapter.ts`
- Create: `apps/api/src/ai-gateway/infrastructure/microsoft-tts.adapter.spec.ts`
- Create: `apps/api/src/media/application/retention-cleanup.handler.ts`
- Create: `apps/api/src/media/application/retention-cleanup.handler.spec.ts`
- Modify: `apps/api/src/content-authoring/application/audio-generation.service.ts`
- Modify: `apps/api/src/content-authoring/content-authoring.module.ts`
- Modify: `apps/api/src/ai-gateway/ai-gateway.module.ts`
- Modify: `apps/web/src/features/admin-content/audio-preview.tsx`
- Modify: `apps/web/src/features/admin-content/audio-preview.test.tsx`
- Create: `apps/api/test/integration/recording-retention.integration.spec.ts`

**Interfaces:**
- Consumes: provider-selected `TextToSpeechPort`, durable jobs, `ObjectStorage`, recording retention metadata, and existing audio artifact lifecycle.
- Produces: optional Microsoft TTS, durable TTS generation/retry, and idempotent expired-recording/draft cleanup.

- [ ] **Step 1: Write failing Microsoft TTS fake-HTTP tests**

Assert reviewed script/voice mapping, returned MIME/bytes/provider metadata, timeout/429/5xx/auth/malformed-body mapping, and secret redaction.

- [ ] **Step 2: Write failing retention tests**

Assert pending/processing recordings are retained; terminal recordings become due seven days later; due object deletion records `deletedAt`; already-missing objects succeed idempotently; early deletion plus running-job completion never restores the file; non-due/unrelated audio artifacts are untouched; stale drafts older than 30 days are removed.

- [ ] **Step 3: Run focused tests and observe RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/ai-gateway/infrastructure/microsoft-tts.adapter.spec.ts src/media/application/retention-cleanup.handler.spec.ts test/integration/recording-retention.integration.spec.ts`

Expected: FAIL because real TTS, selected port wiring, and cleanup handler do not exist.

- [ ] **Step 4: Move the shared TTS boundary and integrate durable jobs**

Update imports without changing fake adapter output compatibility. Reuse the generalized job runner for generation retry and preserve published audio immutability. Implement scheduled cleanup as a durable idempotent handler rather than a filesystem sweep.

- [ ] **Step 5: Run TTS, retention, authoring, and publish regressions**

Update the Admin preview to show adapter, voice, generation state, and the existing simulated-audio warning. Then run: `pnpm --filter @worklingo/api exec vitest run src/ai-gateway src/media test/integration/recording-retention.integration.spec.ts test/integration/content-audio.integration.spec.ts test/integration/content-publish.integration.spec.ts && pnpm --filter @worklingo/web exec vitest run src/features/admin-content/audio-preview.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit the TTS/retention slice**

```bash
git add apps/api/src/ai-gateway apps/api/src/media apps/api/src/content-authoring apps/api/test/integration/recording-retention.integration.spec.ts apps/web/src/features/admin-content/audio-preview.tsx apps/web/src/features/admin-content/audio-preview.test.tsx
git commit -m "feat: configure TTS and recording retention"
```

---

### Task 10: Web Evaluation Client and Structured Writing Experience

**Files:**
- Modify: `apps/web/src/lib/api/api-client.ts`
- Modify: `apps/web/src/lib/api/api-client.learner.test.ts`
- Create: `apps/web/src/features/learning-session/use-evaluation.ts`
- Create: `apps/web/src/features/learning-session/use-evaluation.test.tsx`
- Modify: `apps/web/src/features/learning-session/activity-renderers/writing-activity.tsx`
- Create: `apps/web/src/features/learning-session/activity-renderers/writing-activity.test.tsx`
- Create: `apps/web/src/features/learning-session/evaluation-feedback.tsx`
- Create: `apps/web/src/features/learning-session/evaluation-feedback.test.tsx`
- Modify: `apps/web/src/features/learning-session/activity-renderer.tsx`
- Modify: `apps/web/src/features/learning-session/session-shell.tsx`
- Modify: `apps/web/src/features/learning-session/session-shell.test.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Consumes: Task 1 shared schemas and Task 8 learner API contracts.
- Produces: typed API methods for evaluation/retry/drafts/audio, `useEvaluation(attemptId)`, autosaving writing editor, and reusable feedback UI.

- [ ] **Step 1: Write failing API-client and polling tests**

Assert strict response parsing, credentials/cookie use, multipart separation, queued/processing polling with bounded interval, polling stop on terminal state/unmount, retry command, and no call to generic `/jobs` for learners.

- [ ] **Step 2: Write failing writing/autosave/feedback tests**

Assert objective/minimum/Language Blocks/word count render; debounce saves one revisioned draft; refresh restores server draft; stale conflict fetches/preserves newest text; submit clears draft; processing survives rerender; feedback exposes score dimensions, strengths, at most three improvements, corrected example, and retry action.

- [ ] **Step 3: Run web tests and observe RED**

Run: `pnpm --filter @worklingo/web exec vitest run src/lib/api/api-client.learner.test.ts src/features/learning-session/use-evaluation.test.tsx src/features/learning-session/activity-renderers/writing-activity.test.tsx src/features/learning-session/evaluation-feedback.test.tsx src/features/learning-session/session-shell.test.tsx`

Expected: FAIL because the contracts, hook, autosave, and feedback view are not wired.

- [ ] **Step 4: Implement the writing and evaluation UI**

Keep server state in the typed client/hook, local editor state as an immediate buffer, and accessible status announcements for saving/processing/errors. Session submission advances on saved writing while evaluation remains visible after navigation/refresh.

- [ ] **Step 5: Run focused tests, web typecheck, and existing session regressions**

Run: `pnpm --filter @worklingo/web test -- src/features/learning-session src/lib/api/api-client.learner.test.ts && pnpm --filter @worklingo/web typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the writing UI slice**

```bash
git add apps/web/src/lib/api apps/web/src/features/learning-session apps/web/src/app/globals.css
git commit -m "feat(web): add structured writing evaluation feedback"
```

---

### Task 11: Accessible Speaking Recorder and Learner Audio Playback

**Files:**
- Create: `apps/web/src/features/learning-session/use-audio-recorder.ts`
- Create: `apps/web/src/features/learning-session/use-audio-recorder.test.tsx`
- Modify: `apps/web/src/features/learning-session/activity-renderers/speaking-activity.tsx`
- Create: `apps/web/src/features/learning-session/activity-renderers/speaking-activity.test.tsx`
- Modify: `apps/web/src/features/learning-session/activity-renderers/listening-activity.tsx`
- Create: `apps/web/src/features/learning-session/activity-renderers/listening-activity.test.tsx`
- Modify: `apps/web/src/features/learning-session/activity-renderer.tsx`
- Modify: `apps/web/src/features/learning-session/session-shell.tsx`
- Modify: `apps/web/src/lib/api/api-client.ts`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Consumes: browser `MediaRecorder`, Task 6 multipart submission, Task 8 evaluation/deletion/versioned-audio APIs, and Task 10 feedback/polling components.
- Produces: `useAudioRecorder()` state machine and speaking/listening learner UI.

- [ ] **Step 1: Write failing recorder-hook tests**

With fake `getUserMedia`/`MediaRecorder`, assert idle → permission → recording → preview; no automatic microphone/playback; stop closes tracks; re-record revokes the old object URL; permission denial is actionable; unmount releases resources; unsupported browser enables a clearly unscored text fallback.

- [ ] **Step 2: Write failing component/session tests**

Assert preview/re-record/discard, explicit versioned consent, upload progress, refresh-safe processing, retry without re-recording while retained, early delete messaging, expired-recording handling, text fallback never displays a score, and listening uses the session-bound audio endpoint without autoplay.

- [ ] **Step 3: Run focused tests and observe RED**

Run: `pnpm --filter @worklingo/web exec vitest run src/features/learning-session/use-audio-recorder.test.tsx src/features/learning-session/activity-renderers/speaking-activity.test.tsx src/features/learning-session/activity-renderers/listening-activity.test.tsx src/features/learning-session/session-shell.test.tsx`

Expected: FAIL because recorder and playback behavior do not exist.

- [ ] **Step 4: Implement the recorder and playback UI**

Select the first browser MIME type accepted by the server contract, create a Blob only after stop, require consent before upload, and expose semantic controls plus `aria-live` state. Keep the one-column mobile flow and avoid sticky controls that cover the keyboard.

- [ ] **Step 5: Run all web tests, lint, and typecheck**

Run: `pnpm --filter @worklingo/web test && pnpm --filter @worklingo/web lint && pnpm --filter @worklingo/web typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the speaking/listening UI slice**

```bash
git add apps/web/src/features/learning-session apps/web/src/lib/api/api-client.ts apps/web/src/app/globals.css
git commit -m "feat(web): add speaking recorder and versioned audio"
```

---

### Task 12: Golden Harness, End-to-End Journeys, Documentation, and Final Gate

**Files:**
- Create: `apps/api/src/teacher-ai/evaluation-harness.ts`
- Create: `apps/api/src/teacher-ai/evaluation-harness.spec.ts`
- Modify: `apps/api/package.json`
- Create: `apps/web/e2e/teacher-ai-learning.spec.ts`
- Create: `docs/AI_CALIBRATION.md`
- Create: `docs/INCREMENT_4_DEMO.md`
- Modify: `docs/API_CONTRACTS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/LOCAL_DEVELOPMENT.md`
- Modify: `docs/REQUIREMENTS.md`
- Modify: `docs/TEST_STRATEGY.md`
- Modify: `docs/IMPLEMENTATION_ROADMAP.md`

**Interfaces:**
- Consumes: the complete fake-provider pipeline, optional live adapters, seeded Foundation curriculum, and all prior task contracts.
- Produces: repeatable `ai:calibrate` command, honest calibration report, desktop/mobile E2E proof, local operating guide, and Increment 4 completion record.

- [ ] **Step 1: Write the failing golden-harness tests**

Assert fixture/rubric/config versions are recorded; fake runs are deterministic; expected-range disagreements fail the command; live mode is opt-in; no credential produces an explicit skipped-live result; missing human scores render `human calibration pending` rather than invented ratings.

- [ ] **Step 2: Write failing desktop and mobile Playwright journeys**

Cover speaking record/preview/consent/upload → processing → feedback, writing autosave/refresh/submit → feedback, refresh while processing, recoverable fake 429 then learner retry, early recording deletion, session-version listening audio, and checkpoint changing from pending only after evaluated evidence.

- [ ] **Step 3: Run focused tests and observe the first RED failure**

Run: `pnpm --filter @worklingo/api exec vitest run src/teacher-ai/evaluation-harness.spec.ts && pnpm --filter @worklingo/web e2e -- teacher-ai-learning.spec.ts`

Expected: FAIL until harness, deterministic provider controls, and final E2E wiring are complete.

- [ ] **Step 4: Implement only the missing harness/E2E wiring**

Add deterministic fake-provider delay/error controls available only in test configuration. Do not add production-only bypass endpoints or fake evaluated scores outside the configured fake adapter.

- [ ] **Step 5: Produce calibration and operating documentation**

Run the fake golden set and record date, fixture version, rubric versions, results, and limits in `docs/AI_CALIBRATION.md`. If no human ratings or real credentials are supplied, state both facts explicitly. Document fake startup, optional provider variables, storage/retention, retries, cleanup, consent, and local demo steps without secret values.

- [ ] **Step 6: Run focused E2E and integration gates**

Run: `pnpm --filter @worklingo/api test:integration && pnpm --filter @worklingo/web e2e -- teacher-ai-learning.spec.ts`

Expected: PASS on desktop and mobile projects with isolated test schemas/storage.

- [ ] **Step 7: Run the complete repository verification gate**

Run: `pnpm verify`

Expected: formatting, lint, typecheck, unit tests, integration tests, builds, and all Playwright projects PASS.

- [ ] **Step 8: Inspect final scope and sensitive-data hygiene**

Run: `git diff --check main...HEAD`, inspect `git diff --stat main...HEAD`, confirm `AGENTS.md`, `.env`, runtime audio, database dumps, build output, and provider secrets are not staged, and scan changed files for credentials/raw transcript logging.

- [ ] **Step 9: Request independent multi-axis review**

Use `code-review-and-quality` plus `superpowers:requesting-code-review` against `main...HEAD`. Resolve every Critical and Important finding with a new failing regression test, focused fix, and rerun of the affected gate. Repeat review until clean.

- [ ] **Step 10: Commit final verification and documentation**

```bash
git add apps/api/src/teacher-ai/evaluation-harness.ts apps/api/src/teacher-ai/evaluation-harness.spec.ts apps/api/package.json apps/web/e2e/teacher-ai-learning.spec.ts docs/AI_CALIBRATION.md docs/INCREMENT_4_DEMO.md docs/API_CONTRACTS.md docs/ARCHITECTURE.md docs/DECISIONS.md docs/LOCAL_DEVELOPMENT.md docs/REQUIREMENTS.md docs/TEST_STRATEGY.md docs/IMPLEMENTATION_ROADMAP.md
git commit -m "test: verify Increment 4 Teacher AI journey"
```

- [ ] **Step 11: Push, open the pull request, attach it, and merge only after clean checks**

Push the feature branch, create a PR summarizing provider mode, privacy behavior, calibration status, and verification evidence, attach the PR to this task, verify the remote checks, then merge without force-pushing or rewriting shared history. Preserve any explicit `human calibration pending` limitation in the PR and roadmap.
