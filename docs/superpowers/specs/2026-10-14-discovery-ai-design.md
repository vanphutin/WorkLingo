# WorkLingo Discovery AI design

## Human scope

2026-10-14: the user requested Discovery integration into existing AI features, explicitly deferred chatbot development, requested learner and admin AI settings, Discovery priority with bidirectional provider fallback, and OpenAI retention for tasks Discovery cannot perform. No publishing, shared Git operations, or curriculum changes are authorized.

## Behavior

- Reuse LanguageEvaluationPort for Foundation speaking transcript and writing assessment. Scores remain aggregated by versioned server rubrics; never ask a model for pronunciation or a final aggregate score.
- Add Discovery Chat Completions using `qwen3.8-27b` by default after its synthetic schema check completed in 5058 ms. `intern-s2` timed out at 30/90 seconds and Agents-A1 at 30 seconds. Validate JSON against the existing strict language evaluation schema, reject truncated/refused/invalid output, and cap output at 2048 tokens.
- Keep OpenAI Responses evaluation configured independently. Use one attempt on the selected provider and at most one attempt on the other per evaluation invocation. Fallback applies to transport/provider failures and malformed output, never to refusals or arbitrary application errors. No loops, parallel duplicate calls, or fake production fallback.
- A trusted server capability constraint can require OpenAI. Such a request cannot downgrade to Discovery. No current text evaluation task has a demonstrated OpenAI-only requirement; STT/pronunciation/TTS remain Microsoft because neither implemented LLM adapter supports these audio functions.
- Persist account preference (`system-default`, `discovery`, `openai`) and account fallback opt-in; new accounts inherit system preferences. Admins can inspect system defaults; SYSTEM_ADMIN alone can update global cost policy. Global fallback false prevents any account enabling paid fallback. Availability means credentials configured, not verified health or calibration.
- Persist actual provider/model provenance per result without shared mutable last-provider state. Preserve immutable evaluation/idempotency and existing fake test mode.
- Expose only provider/model/configuration availability, never keys or arbitrary provider URLs. Settings mutation uses authenticated owner and account identity guard.
- Backend mode stays fake by default in source; local .env can select Discovery after a synthetic provider check. Existing OpenAI key remains private and available for fallback.

## Architecture and persistence

AiGatewayModule owns evaluation adapters, AiSettingsService and the routing adapter. The service resolves account plus system preference from AiRoutingSetting. One system row and per-account rows; account rows reference User with cascade deletion. Settings controllers reuse existing auth/role/rate-limit infrastructure. Learner and admin pages reuse existing settings panel styles and VI/EN catalogs.

## Model selection and operational constraints

Discovery docs inspected on 2026-10-14 list intern-s2, Agents-A1 and Atria-Dawn-Preview as temporarily free; intern-s2 supports Chat, not Responses. qwen3.8-27b costs 0.1/0.8/2.7 ink points per million cached input/uncached input/output tokens; deepseek-v4-flash-0731 costs 0.02/1/4. These are platform ink points, not USD/VND. Use Qwen after the synthetic compatibility check; consider Flash for more complex reasoning after calibration. Scientific/agent/Pro models add no verified value to current short rubric feedback. Prices and free availability can change.

Environment bounds request time and output tokens. Existing job maxAttempts bounds total retries (up to two provider calls per attempt); prefer one attempt locally for cost control. Token caps are not a monthly monetary budget. Monthly billing cap and calibrated scoring require separate evidence. Provider refusal never bypasses to another model. No learner IDs, emails or audio in outbound text payload; response text/lesson rubric are necessary provider input.

## Audit and future features

Existing: Teacher AI evaluation, Microsoft transcription/pronunciation, Microsoft TTS, deterministic curriculum/progression/admin import and IELTS review workflows. Future chatbot, retrieval-grounded FAQ, explanatory hints and admin draft support are deferred; none may publish content or make qualification decisions automatically. Current IELTS mocks explicitly retain human reviews. No new LLM needed for navigation, dashboards, scheduling, locale switching or rule-based progress.

## Acceptance and rollback

Tests cover strict Discovery transport/output, routing in both directions, disabled/unavailable fallback, OpenAI-only fail-closed behavior, actual provenance under concurrent calls, owner/role boundaries, settings persistence and localized UI. Run focused tests first, API/web types and lint, then package suites; report existing i18n baseline failures separately. Live check uses synthetic text only, no real learner content. Human calibration remains a gate before claiming live grading qualified.

Rollback: set WORKLINGO_LANGUAGE_EVALUATION_PROVIDER to openai-compatible AND AI_ROUTING_ENABLED=false, then restart API; settings rows are ignored and settings mutations locked. Fake mode always bypasses live adapters. Migration adds a table/relation and preserves lesson/session/evaluation data. Retain the table on rollback; do not destructively reset the database.
