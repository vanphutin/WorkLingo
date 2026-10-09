# Increment 4: Speech, TTS, and Teacher AI Design

**Date:** 2026-10-07

**Status:** Approved conversational design, pending written-spec review

**Scope:** Local-first speaking recording, structured writing evaluation, configurable speech/TTS providers, durable background jobs, consent, retention, and learner feedback

## 1. Outcome

Increment 4 lets a learner record a Foundation shadowing response or submit a structured workplace-writing response, continue the learning session after the submission is durably saved, and receive asynchronous rubric-bound feedback. Provider outages must not lose the submission or corrupt session progress.

The complete local journey is:

```text
speaking recording or writing response
→ persist learner submission first
→ enqueue durable PostgreSQL job
→ transcribe speaking when needed
→ evaluate against the immutable activity and rubric
→ persist an immutable evaluation result
→ update mastery exactly once
→ expose feedback and retry state to the learner
```

Local development, automated tests, and the product demo use deterministic fake providers without external credentials. Microsoft Speech and an OpenAI-compatible evaluation provider are optional runtime adapters selected through validated configuration.

## 2. Product decisions

- The default runtime mode is local-first with fake speech, language-evaluation, and TTS adapters.
- Real provider credentials are optional. Their absence must not prevent the API from starting in fake-provider mode.
- The backend is the only component allowed to call external AI providers.
- A learner submission is committed before any provider call. Provider failure cannot roll it back or move the session checkpoint backward.
- A saved speaking or writing submission may advance the session, but checkpoint progression remains `pending_evaluation` until genuine evaluated evidence exists.
- Teacher AI evaluates only against a versioned rubric, the immutable lesson activity, and relevant Language Blocks.
- OpenAI-compatible evaluation receives text and cannot claim to assess pronunciation from text. Pronunciation evidence comes only from a speech provider that supports pronunciation assessment.
- Foundation feedback is concise Vietnamese with English examples. It identifies at most three improvements and does not replace the learner's entire response.
- Raw recordings are retained until processing reaches a terminal state and are then deleted after seven days. The learner may delete audio earlier. Transcript and structured evaluation history remain.
- The current `workplace-checkpoint-v1` threshold of `0.7` remains an initial product rule, not a CEFR, B2, IELTS, TOEIC, or employment-readiness certification.
- Human calibration and automated provider evaluation are reported separately. Missing human ratings must be labeled `human calibration pending` and blocks a pilot-ready claim, not local development.

## 3. Architecture

```text
Next.js learner UI
  ├── Speaking Recorder
  ├── Writing Editor
  └── Evaluation Feedback
            │
            ▼
NestJS Learning Sessions API
  ├── persist attempt / draft / recording
  ├── enforce ownership and consent
  └── enqueue job in the same transaction
            │
            ▼
PostgreSQL-backed worker
  ├── TRANSCRIBE_SPEECH ──► SpeechToTextPort
  ├── EVALUATE_ATTEMPT ──► LanguageEvaluationPort
  ├── GENERATE_AUDIO ──► TextToSpeechPort
  └── DELETE_EXPIRED_RECORDING ──► ObjectStorage
            │
            ▼
EvaluationResult + ActivityAttempt projection + MasteryEvent
```

The API remains a modular monolith. New modules have narrow responsibilities:

| Module | Responsibility |
|---|---|
| AI Gateway | Provider-neutral ports, provider configuration, normalized errors, schemas, and adapters |
| Teacher AI | Rubric resolution, evaluation orchestration, score aggregation, feedback persistence, and mastery handoff |
| Media | Recording upload, metadata, consent, streaming rules, deletion, and retention |
| Jobs | Durable claiming, leases, retries, idempotency, and job-attempt audit |
| Learning Sessions | Submission ownership, checkpoint behavior, draft lifecycle, and learner-facing orchestration |

Business services depend on ports rather than provider SDKs or HTTP response shapes. The in-process worker can later be deployed as a separate process without changing job data or learner API contracts.

## 4. Provider ports and configuration

### 4.1 Ports

```text
SpeechToTextPort.transcribe(recording, assessmentContext)
  → transcript, words, locale, provider confidence, pronunciation metrics, provider metadata

LanguageEvaluationPort.evaluate(evaluationContext)
  → schema-validated dimension scores and bounded feedback

TextToSpeechPort.synthesize(script, voiceConfig)
  → audio bytes, MIME type, provider metadata
```

Provider DTOs contain only normalized data. Provider response types do not cross the adapter boundary.

### 4.2 Runtime selection

Validated environment configuration selects each adapter independently:

- `WORKLINGO_STT_PROVIDER=fake|microsoft`
- `WORKLINGO_LANGUAGE_EVALUATION_PROVIDER=fake|openai-compatible`
- `WORKLINGO_TTS_PROVIDER=fake|microsoft`
- `MICROSOFT_SPEECH_KEY`, `MICROSOFT_SPEECH_REGION`, speech locale, and voice
- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL`
- provider timeout, maximum attempts, and retention days with safe bounds

Selecting a real adapter without its required configuration fails startup with a redacted configuration error. Secrets are never returned by health, job, attempt, or admin APIs and are never written to logs.

### 4.3 Real adapters

- Microsoft Speech uses the supported speech-recognition/pronunciation-assessment request for the uploaded locale and audio format. The adapter maps recognition and assessment fields into the normalized contract.
- The OpenAI-compatible adapter uses the Responses API shape with strict Structured Outputs. It explicitly handles refusal, incomplete output, invalid schema, timeout, rate-limit, authentication, and upstream server errors.
- Microsoft TTS is the initial optional real TTS adapter. It uses only admin-reviewed scripts and writes output through `ObjectStorage` using server-generated keys.

## 5. Persistence model

### 5.1 ActivityAttempt

`ActivityAttempt` remains the canonical submitted response and fast read projection. Its evaluation status expands to:

```text
SUBMITTED | QUEUED | PROCESSING | EVALUATED | EVALUATION_FAILED
```

`clientAttemptId` remains unique per learner. Reuse for the same session/activity returns the original attempt; reuse for a different target returns `409 IDEMPOTENCY_KEY_REUSED`.

### 5.2 Recording

One recording belongs to one speaking attempt. It stores:

- learner, session, activity, and attempt ownership;
- server-generated storage key, MIME type, byte size, checksum, and optional duration;
- consent policy version, consent scope, and accepted time;
- normalized transcript and speech-provider provenance after transcription;
- retention deadline, deletion-request time, and deletion-completed time.

Audio bytes never enter PostgreSQL, a job payload, or an application log.

### 5.3 EvaluationResult

An evaluation result is immutable after completion and contains:

- attempt and immutable lesson-version identity;
- rubric ID/version and input hash;
- provider, model, non-secret config version, and completion time;
- per-dimension scores, aggregate score, structured feedback, and redacted provider diagnostics;
- speech-metric provenance when speaking is evaluated.

A uniqueness constraint on attempt plus rubric version prevents duplicate official results. Re-evaluation under a new rubric is outside Increment 4 and requires a separate explicit workflow.

### 5.4 ActivityDraft

A writing draft is unique by learner, session, and activity. It stores text, revision, and update time. Autosave uses optimistic revision checks so an older tab cannot overwrite a newer draft. Successful submission removes the active draft. Abandoned drafts expire after 30 days.

### 5.5 Job and JobAttempt

The existing `Job` model is generalized with:

- job type, resource reference, status, and globally unique idempotency key;
- attempt count, maximum attempts, available time, lease owner, and lease expiry;
- normalized error code, safe error summary, retryable flag, result summary, and timestamps.

`JobAttempt` is an append-only audit entry for each provider invocation. It stores provider/model/config version, timing, outcome, normalized error code, and HTTP status when available. It does not store credentials, raw audio, transcript, or learner writing.

## 6. Durable job processing

Job states are:

```text
PENDING → RUNNING → COMPLETED
              └──→ RETRY_WAIT → RUNNING
              └──→ FAILED
```

The worker claims available jobs in a short PostgreSQL transaction using row locking with skip-locked semantics. It records a lease before performing external I/O. Another worker can reclaim a job only after the lease expires.

Retry policy:

- timeout, HTTP 429, and HTTP 5xx use exponential backoff with jitter, up to three provider attempts;
- malformed/refused/incomplete provider output retries once, then becomes manually retryable;
- provider authentication, invalid audio, missing consent, or deleted/expired recording does not retry automatically;
- manual retry is accepted only for a learner-owned failed attempt with `retryable=true` and remaining source data;
- completion writes the evaluation, attempt projection, mastery event, and job state transactionally.

Speaking uses two idempotent jobs:

```text
TRANSCRIBE_SPEECH
  → persist normalized transcript and speech metrics
  → enqueue EVALUATE_ATTEMPT

EVALUATE_ATTEMPT
  → validate language-provider output
  → aggregate speech and language dimensions
  → persist result and mastery evidence exactly once
```

Writing creates `EVALUATE_ATTEMPT` directly. A retry after successful transcription reuses the persisted transcript and does not resend audio to Microsoft.

## 7. Rubrics and scoring

### 7.1 Provider output schema

The language-evaluation adapter must produce strict structured data:

```text
scores:
  taskCompletion: number 0..1
  meaningAndLogic: number 0..1
  targetLanguage: number 0..1
  clarity: number 0..1
feedback:
  summary: bounded string
  strengths: bounded string[]
  improvements: bounded string[] with at most three items
  correctedExample: bounded string | null
```

The provider does not supply the final aggregate score. The backend validates all bounds and computes the score deterministically from the rubric version.

### 7.2 Foundation speaking shadowing rubric

The initial `foundation-speaking-shadowing-v1` aggregate is:

| Dimension | Weight | Source |
|---|---:|---|
| Task completion | 0.25 | Language evaluation |
| Meaning and logic | 0.15 | Language evaluation |
| Target Language Blocks | 0.25 | Deterministic checks plus language evaluation |
| Clarity | 0.15 | Language evaluation over transcript |
| Pronunciation and fluency | 0.20 | Microsoft pronunciation assessment or fake speech fixture |

A speaking evaluation cannot become official without the speech-derived pronunciation/fluency dimension. Plain transcript confidence is diagnostic and is not silently converted into pronunciation quality.

### 7.3 Foundation workplace-writing rubric

The initial `foundation-workplace-writing-v1` aggregate is:

| Dimension | Weight |
|---|---:|
| Task completion | 0.30 |
| Meaning and logic | 0.25 |
| Target Language Blocks | 0.25 |
| Grammar and clarity | 0.20 |

Minimum word count and required-phrase checks are deterministic rubric inputs. They are not exposed as keyword shortcuts before submission.

### 7.4 Prompt boundary

Lesson content, transcript, and learner writing are delimited as untrusted data. They cannot replace system instructions, output schema, level, rubric, or feedback language. Output is rejected unless it conforms to the strict schema and bounded lengths.

## 8. API contracts

### 8.1 Speaking

`POST /activities/{activityId}/recordings` accepts multipart audio plus `sessionId`, UUID `clientAttemptId`, consent policy version, and consent scope. The server verifies session ownership, current checkpoint, activity type, consent, MIME allowlist, and size before storage.

Response `202`:

```json
{
  "attemptId": "uuid",
  "recordingId": "uuid",
  "jobId": "uuid",
  "status": "processing"
}
```

The maximum initial recording is two minutes and 10 MB. The exact supported MIME list is derived from formats accepted by both the browser recorder and configured speech adapter; unsupported content is rejected before a provider call.

### 8.2 Writing and deterministic activities

`POST /activities/{activityId}/attempts` preserves the existing contract. Reading/listening finish synchronously. Writing creates the attempt and evaluation job atomically and returns the saved attempt with `evaluationStatus=queued`.

### 8.3 Evaluation and retry

- `GET /attempts/{attemptId}/evaluation` returns the learner-safe processing state, transcript when available, scores, feedback, retryability, and recording-retention metadata.
- `POST /attempts/{attemptId}/evaluation/retry` schedules a retry or returns a stable conflict/error explaining why it cannot retry.
- `DELETE /recordings/{recordingId}` deletes audio early and cancels queued work that still requires it. Completed transcript/evaluation data is not deleted by this endpoint.

Learners never receive generic job payloads or provider internals. The existing generic `/jobs/{id}` endpoint remains administrative.

### 8.4 Drafts and published audio

- `PUT /learning-sessions/{sessionId}/activities/{activityId}/draft` writes a revision-checked writing draft.
- `DELETE /learning-sessions/{sessionId}/activities/{activityId}/draft` discards it.
- `GET /learning-sessions/{sessionId}/activities/{activityId}/audio` streams the ready audio artifact referenced by that session's immutable `LessonVersion`.

## 9. Learner experience

The speaking recorder state machine is:

```text
idle → requesting_permission → recording → preview
     → uploading → processing → feedback
                              └→ failed_retryable
                              └→ failed_terminal
```

- The browser never starts recording or playback automatically.
- The learner can listen, re-record, or discard before upload.
- Consent text explains purpose, local storage, external processing when configured, seven-day audio retention, transcript retention, and early deletion.
- A browser without `MediaRecorder` offers a clearly labeled text-practice fallback. It may advance the session as an unscored submission but cannot satisfy speaking mastery or checkpoint evidence.
- Processing and feedback survive refresh because the attempt state is server-backed.
- The writing editor shows task objective, minimum words, Language Blocks, word count, autosave state, and feedback without covering the editor on mobile.
- Recorder controls use semantic buttons, visible focus, screen-reader status announcements, and usable touch targets.

## 10. TTS and audio lifecycle

The existing fake TTS port and artifact workflow remain the baseline. Increment 4 adds provider selection, normalized provider metadata, robust job retry, and an optional Microsoft TTS adapter.

Admin preview displays adapter, voice, generation state, and whether output is simulated. Published lesson audio remains immutable by lesson version. Learner playback resolves the artifact through the session's stored version so a later publish cannot change active-session audio.

## 11. Retention and deletion

- A recording has no deletion deadline while an active transcription/evaluation job requires it.
- Reaching `EVALUATED` or terminal `EVALUATION_FAILED` sets `retentionUntil` to seven days later.
- A periodic durable cleanup job deletes due objects and records `deletedAt`; retries are idempotent when a file is already absent.
- Early learner deletion removes the object promptly and prevents future transcription retries. A provider request already in flight cannot be recalled; this limitation is stated in consent copy.
- Transcript, structured feedback, score, and mastery evidence remain after audio deletion.
- Writing drafts older than 30 days and no longer associated with an active submission are deleted.
- Provider raw responses are not retained. Only normalized structured data and redacted diagnostics are stored.

## 12. Error handling

Provider and media failures map to stable application codes:

- `RECORDING_CONSENT_REQUIRED`
- `AUDIO_TYPE_UNSUPPORTED`
- `AUDIO_TOO_LARGE`
- `RECORDING_EXPIRED`
- `PROVIDER_TIMEOUT`
- `PROVIDER_RATE_LIMITED`
- `PROVIDER_RESPONSE_INVALID`
- `PROVIDER_AUTH_FAILED`
- `EVALUATION_NOT_RETRYABLE`

Learner responses contain actionable language and retry state, not provider stack traces. Logs contain correlation IDs and safe error codes but never secrets, audio, transcripts, or writing content.

## 13. Golden set and calibration

The version-controlled golden set contains synthetic or explicitly permitted fixtures for:

- complete and incomplete shadowing;
- missing required Language Blocks;
- clear and unclear permitted test audio;
- strong, weak, too-short, and off-topic workplace writing;
- empty/silent audio and unsupported formats;
- prompt-injection strings in lessons, transcripts, and learner responses;
- provider refusal and malformed Structured Outputs.

The harness can run deterministically against fake providers and, with explicit credentials, against real adapters. `docs/AI_CALIBRATION.md` records fixture version, rubric version, provider/model/config, automated scores, human scores when supplied, disagreement analysis, and decision status. Automated expected values are not described as human ratings.

## 14. Verification gates

Increment 4 is implementation-complete only when all applicable checks pass:

1. Fake speech, language-evaluation, and TTS contract tests.
2. Fake HTTP provider tests for timeout, 429, 5xx, invalid schema, refusal, incomplete output, bad credentials, and unsupported audio.
3. PostgreSQL integration tests for atomic attempt/job creation, duplicate client attempts, concurrent job claims, lease recovery, retry, exactly-once evaluation/mastery updates, ownership, and retention.
4. Web component tests for microphone permission, record/preview/re-record, consent, upload, processing refresh, retry, writing autosave, and feedback.
5. Desktop and mobile E2E for speaking, writing, listening version isolation, refresh during processing, and recoverable provider failure.
6. Golden-set harness results and an honest calibration report.
7. Migration from the current schema and setup from an empty database.
8. Full repository `pnpm verify`.
9. Independent multi-axis code review with all Critical and Important findings resolved.

Real-provider live tests are opt-in and skipped with an explicit reason when credentials are unavailable. Fake HTTP contract tests still verify the complete mapping behavior. The project cannot claim human calibration or pilot readiness until the report contains actual human ratings.

## 15. Delivery boundaries

Increment 4 includes the complete local fake-provider journey, production-shaped real adapters, durable processing, learner UI, documentation, and verification described above.

The following remain outside Increment 4:

- generalized admin observability dashboards and provider-health UI;
- production rate limiting and broader security hardening owned by Increment 5;
- cloud object storage, Redis, a distributed queue, or a separate worker deployment;
- conversational real-time voice chat with Teacher AI;
- automatic content generation or rubric rewriting;
- regrading successful attempts under a newer rubric;
- claims that the product is CEFR/B2 certified or ready for a public pilot.

## 16. Documentation deliverables

Implementation updates:

- `docs/API_CONTRACTS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/DECISIONS.md`
- `docs/LOCAL_DEVELOPMENT.md`
- `docs/TEST_STRATEGY.md`
- `docs/AI_CALIBRATION.md`
- `.env.example` without secrets

The local operations guide explains fake-provider startup, optional real-provider configuration, recording storage/cleanup, retry behavior, calibration commands, and how to verify that logs and backups do not expose secrets or raw recordings unintentionally.
