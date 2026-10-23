# Intermediate AI lesson generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Admin selects a topic, duration, vocabulary difficulty and one of Discovery/OpenAI, then receives a complete Intermediate lesson in the JSON import buffer for explicit review/apply.

**Architecture:** Add a role-protected, rate-limited generation endpoint using existing provider transport. Reuse IntermediateTopicJson validation and the existing editor/save/review/publication pipeline. Generation never saves or approves; selected duration is saved with source and seeds the human review.

**Tech Stack:** NestJS, Zod, Prisma read-only topic lookup, React/Next, existing OpenAI/Discovery HTTP clients.

**Spec:** User clarification 2026-10-23: "admin chọn chủ đề, chọn số phút ... 2 con ai ... chọn 1 trong 2"; full lesson shown for administrator editing before saving.

## Global Constraints
- Existing feature worktree; branch codex/intermediate-ai-lessons; no main, merge/push/deploy/production changes.
- Two existing providers: discovery and openai. Exact selection, no silent fallback or simulation content. Missing credentials surfaced clearly.
- Durations 45/60/90/120/150 minutes, matching supported session durations. Default B1, option B2.
- Full topic: activation, target language, reading, listening from same passage, speaking and writing; answer/evidence validation.
- No migration, AI credential changes, vocabulary bulk transfer, or automatic publication.

## Review Focus
- Selected AI cannot be overridden by account default or failure fallback; test both transports and errors.
- Malformed, empty or truncated AI content cannot replace a draft; test schema and evidence validation.
- Unsaved edits and in-flight changes cannot be silently overwritten; test explicit apply and stale result invalidation.
- Missing provider or deleted topic never produces an invented successful lesson; test unavailable and 404.
- Selected duration survives save/reload and initializes review instead of resetting to 60; test editor conversion and review.

### Task 1: Contracts and generation API
**Files:** contracts/intermediate-topic-generation.contracts + export/tests; api/intermediate-topics/topic-generation service/controller/tests/module/DTO; app-config schema.
**Interfaces:** request {topicGroupId, durationMinutes, provider, level: B1|B2, difficulty: easy|medium|hard}; response {topicGroupId, topic: IntermediateTopicJson, plan: TopicPlan, provider, model}.
- [x] Write failing contract/service/controller tests for selection, valid complete output, invalid output, configuration, authorization and no writes.
- [x] Run tests RED; implement bounded provider calls and strict validation; run GREEN/typecheck.
- [x] Commit verified API/contracts slice.

### Task 2: Editor integration and duration preservation
**Files:** intermediate-topic-client; new topic-ai-generator component/tests; intermediate-lesson-editor/tests; topic-review-panel/tests; localized generation messages.
**Interfaces:** generator receives topicGroupId, busy/dirty/disabled and a JSON handoff callback; calls generation endpoint, previews the candidate and explicitly fills the JSON buffer without applying or saving the lesson.
- [x] Write failing UI tests for provider+duration request, preview/apply, errors, stale/dirty protection and initial review duration.
- [x] Run RED; implement using existing visual styles/accessibility/async feedback; run GREEN.
- [x] Run package tests, lint/typecheck/build and isolated browser smoke; fresh branch review; fix material regressions and commit.

## Execution ledger
- Existing isolated worktree clean at 26f5462; new branch created. Baseline JSON-repair service tests 6/6.
- Ruling: implement inline to retain the user's minimum-token preference; one fresh final reviewer. Provider keys are absent in test configuration, so live paid generation cannot be verified without configuration.

## Confirmed scope updates and results
- User clarified AI fills JSON import buffer, then explicit Apply JSON; implemented buffer handoff and duration in JSON.
- User added easy/medium/hard vocabulary from the library. Selected source levels A1 / A1–A2 / A1–B1; ceilinglevel must be represented. Bounded source selection and generated-expression validation added.
- Actual isolated DB read-only probe: easy40 A1, medium39 A2/A1, hard37 B1/A2/A1; max40 enforced.
- Review findings: nonempty grammar/commonerror/collocations, expression boundaries and multiline attribution covered RED→GREEN.
- Ruling: vocabulary IDs are transient generation metadata in JSON; no curriculum binding change. Word content remains in course source. Cost if a future feature needs these IDs: add explicit persistence/link adapter.
- Broad pnpm test was attempted on separate worklingo_intermediate_ai_test DB and interrupted by host/session restart before completion; do not claim that whole run passed. Full Web868 and content-format135 passed before final bounded difficulty changes; latest relevant suites cover the final diff.
- Provider credentials absent: live paid generation unverified. Mocked provider transports and browser generation are explicitly labelled in evidence.
- Final checks: API157, Web148, contracts138 tests pass; workspace lint/i18n, package types, API/Web builds pass. API test fixture type error fixed and API typecheck rerun successfully. Browser JSON handoff/apply and read-only vocabulary pool checks pass.
