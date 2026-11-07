# R2.2 assessment API

Status: IMPLEMENTED routes inspected. API end-to-end verification is root-owned; live AI qualification BLOCKED. HUMAN_VALIDATED: NOT_RUN.

Paths below are relative to the application's existing API prefix. Existing authentication guards apply; learner methods use request.authUser.id rather than a supplied learner identity.

| Method/path | Behavior |
|---|---|
| GET /attempts/:attemptId/assessments | Owner-scoped history, latest 50; learner-safe projection |
| POST /attempts/:attemptId/assessments | UUID idempotencyKey, optional UUID previousEvaluationId; returns assessment result, HTTP 202 |
| POST /assessments/:runId/cancel | Cancel owned nonterminal run; terminal result returned unchanged, HTTP 200 |
| GET /me/assessment-mastery | Separate four-skill evidence/recommendation summary |
| GET /admin/assessments?attemptId=UUID | CONTENT_ADMIN audit/history view |
| POST /admin/attempts/:attemptId/assessments | CONTENT_ADMIN append re-evaluation, same request body, HTTP 202 |

Request admission is limited to 15/user-operation/minute; admin re-evaluation to 10/minute. Current controller does not add an independent cancellation rate-limit decorator. No teacher override permission or mutate-original action is introduced.

Idempotency is attempt+request UUID; mismatched context/input/previous linkage rejects with conflict. New re-evaluation links a terminal prior row. Expired lease replay increments generation. Primary, verifier, conditional adjudicator and isolated feedback can require up to four calls. Provider execution is currently awaited in the request despite HTTP 202; this is not a queued asynchronous-job acceptance guarantee. A later identical replay can recover an expired run; no scheduled recovery worker is claimed.

Learner history redacts private passage/transcript references and sensitive feedback phrases; admin audit includes authorized private context and decisions. Public evidence IDs are remapped to evidence-N identifiers. UUID validation and owner checks apply to route/query/body identities. Missing exact context/source evidence fails closed on assessment POST, including replay admission. Historical GET and cancellation do not require presently available listening audio assets; stored decisions remain readable after source revocation. A terminal run replays its decision only when POST admission context is still available; a new key creates a new run.

Existing /attempts/:attemptId/evaluation and /retry routes remain compatible with legacy speaking/writing jobs/results. New result totals use 0–100 versus legacy 0–1. Clients must use the corresponding contract schema.

| Additional method/path | Behavior |
|---|---|
| GET /admin/assessment-providers | CONTENT_ADMIN; configured capabilities and process-local health, no provider probe |
| GET /recordings/:recordingId/audio | Owner only; retained audio integrity/deletion/expiry checks, byte ranges, private no-store cache |

Provider capabilities distinguish configured identity/model from observed response metadata, semantic support from acoustic support, strict-schema request from prompt-only JSON, and explicit role routing with no silent assessment fallback. Health returns invocation counters plus at most 20 safe timestamp/latency/outcome/error-code entries, reset on process restart; it is not a billing counter or external uptime monitor. An unimplemented adapter capability/health method yields null.

Semantic execution normally invokes primary, verifier and stateless learner-feedback roles (three calls); disagreement invokes the wired adjudicator before feedback, making up to four calls. Objective-only evaluation makes no AI call. Unknown cost remains null, and speech processing and retries require separate accounting. Feedback role serialization excludes private reference context. Recording playback is limited to 60 owner-operation requests per minute and never supplies private storage keys to the learner.
