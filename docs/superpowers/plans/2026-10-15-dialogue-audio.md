# Dialogue Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox tracking.

**Goal:** Read only dialogue lines, with stable distinct voices matching declared speaker gender.
**Architecture:** Share a deterministic text parser between author validation, browser turn playback and Azure SSML generation. Retain existing text storage and publication lifecycle.
**Tech Stack:** TypeScript, content-format, React Web Speech, NestJS/Azure SSML, Vitest, Edge/Playwright.
**Spec:** `docs/superpowers/specs/2026-10-15-dialogue-audio-design.md`.

## Global Constraints
- No guessing gender from character names; actual voices only; report missing compatible voices.
- More than two characters requires explicit gender for each.
- Preserve published content and learner sessions. No paid synthesis calls during tests.
- Preserve existing unrelated audio/dashboard changes; no merge/push.

## Review Focus
- Single-colon narration must survive auto detection.
- Two male speakers plus a female speaker require three distinct compatible voices.
- Canceled/late turn callbacks must not resurrect speech.
- Voice disappearance/failure must not change another character's assignment.
- SSML labels and XML injection must never be spoken/interpreted as markup.

### Task 1: Shared dialogue parsing and author validation
**Files:** content-format `dialogue.ts`, tests, `index.ts`, `validator.ts`, foundation template, author-format help/docs.
**Interfaces:** Produces the exact parseDialogue/types contract in the spec; existing AST stays unchanged.
- [x] Write parser/validation regressions, run RED.
- [x] Implement parser, error checks and template instructions; run content-format full suite/typecheck.

### Task 2: Browser voices, turn queue and recovery
**Files:** web audio voice-gender/voice allocation helper + tests, use-browser-speech hook/tests, messages, LessonAudioPlayer/listening renderer.
**Interfaces:** Consumes parseDialogue; BrowserSpeechController remains compatible.
- [x] Write gender allocation, dialogue lifecycle/replay and recovery tests; run RED.
- [x] Implement sequential speech with one owner, per-speaker assignments and bounded failover.
- [x] Run web suite/typecheck/lint and real Edge dialogue probe.

### Task 3: Azure multi-voice generation
**Files:** API Microsoft TTS adapter/helper/tests, synthesis metadata and generation configuration/handler as needed.
**Interfaces:** Consumes parseDialogue; preserve configured narration voice; add actual speaker voice audit metadata.
- [x] Write SSML and invalid-script/no-network tests; run RED.
- [x] Implement escaped per-turn SSML, stable catalog allocation and configuration versioning.
- [x] Run affected API tests/typecheck and whole suite once.

### Task 4: Review and delivery
- [x] Independent review of only this feature, address important findings with regressions.
- [x] Validate translations, whitespace, runtime health; record exact results and limitations.
- [x] Update this plan and existing audio documentation; leave app running.

## Final verification

- Content-format: 108 tests / 8 files passed.
- Web: 446 tests / 89 files passed. Browser replay/recovery review cases were verified RED then GREEN; an isolated gender-filter mutation was caught by three tests.
- API: broad run 806 passed, 1 failed, 7 skipped / 161 files. `auth.integration` failed during migration setup; `error-bank-schema.integration` timed out in setup; `placement-isolation.integration` failed an immediate worker-run assertion. All three affected files then passed unchanged in a focused run (9/9). No second full API run was performed.
- Actual native Edge engine: three utterances completed with David/Zira/David, labels omitted and Stop verified. No paid service invocation.
- Workspace lint/typecheck, translations (zero errors), API build and isolated-output web production build passed. Next route types were regenerated for normal development output after the build.
- Root page and API proxy health returned HTTP 200 after verification. Existing dev servers remain running.
- Independent final browser review: no actionable findings after regression-backed fixes. Existing published versions and active learner snapshots were not rewritten.
