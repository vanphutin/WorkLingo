# Reviewed audio narration implementation plan

> **For agentic workers:** Use superpowers:executing-plans inline. Steps track implementation and focused verification.

**Goal:** Let admins review a separate spoken rendition without changing the original passage or questions.
**Architecture:** Optional `spoken_text` and `speech_review` fields on AUDIO_SCRIPT; preserve canonical script. A review stamp binds the source, rendition and listening evidence. All synthesis and browser playback use the reviewed rendition. Existing published versions remain immutable.
**Tech Stack:** TypeScript, content-format, NestJS, React/Next.js, Vitest.
**Spec:** User-approved description in this conversation (email/dialogue/prose/tables, unknown inputs retain original, explicit admin review, evidence protection).

## Global constraints
- No automatic AI rewrite, question generation, paid synthesis or publication.
- No changes to canonical reading text, questions, speaker selection or existing published versions.
- Unknown formats retain original; suggestions require review. Never silently normalize numeric values.
- Work in the existing audio-dashboard-v2 worktree; preserve unrelated changes.

## Review focus
- Email-like prose without a definite header boundary must not lose text.
- Removed evidence, blank speech and malformed speaker labels block publication.
- Changing source, speaker, listening questions or speech invalidates review; rendering changes invalidate old artifacts.
- Browser fallback must match generated speech while the reading/transcript source remains available.
- Editing via the Intermediate form must preserve speech configuration or explicitly invalidate it.

### Task 1: Narration model and rules
Files: content-format `audio-narration.ts`, parser/AST/normalizer/validator/index, focused tests.
Interface: `spokenScript`, `audioScriptFingerprintText`, `narrationReviewInput`, `narrationEvidenceIssues`, `suggestEmailBody`, `setAudioNarration`.
- [x] Write and run failing tests: conservative email extraction; parser round trip; removed evidence rejected; original text preserved.
- [x] Implement optional fields, projection, source patch and warnings without automatic destructive edits.
- [x] Run content-format tests/typecheck; include in the cohesive feature commit.

### Task 2: Backend enforcement and playback snapshot
Files: content-authoring narration review helper, imports/generation/handler/publisher; activity/snapshot schema, session mapping.
Interface: SHA-256 of `narrationReviewInput`; SHA-256 of `audioScriptFingerprintText`; optional `payload.audioText` frozen with the activity, projected as learner DTO `audioText` for browser playback.
- [x] Add failing tests for stale review, changed rendition artifact, synthesis input and learner fallback projection.
- [x] Enforce review before generation/publication; check stale jobs and artifact listing; freeze activity-specific spoken text.
- [x] Run targeted API regressions/types/lint; include in the cohesive feature commit.

### Task 3: Admin review UI and learner fallback
Files: new admin narration editor/tab, audio preview, listening/shadowing renderers, EN/VI messages, Intermediate source preservation.
- [x] Add failing component tests for explicit confirmation, evidence blocking and playback projection.
- [x] Add original/spoken comparison, conservative email suggestion, editable speech, cautions and review action; no automatic saving before confirmation.
- [x] Run focused web tests/types/lint; attempt browser QA (blocked as recorded below); complete independent review and include in the cohesive feature commit.

## Verification record
- Tasks 1–3 implemented. One cohesive commit preserves the shared parser/API/UI contract; unrelated concurrent work remains unstaged.
- Content-format: 135 tests passed, including RED→GREEN for direct audio evidence, prompt changes, and literal closing tokens in original prose.
- API: 45 focused tests passed, including real isolated PostgreSQL/HTTP generation/publication and curriculum consistency; 4 additional session service tests passed. No live paid-provider requests.
- Web: 69 focused tests passed (explicit confirmation, evidence blocking, read-only publication, browser speech, JSON/form round trip and existing authoring flow). Contracts: 5 tests passed.
- API/web/content-format/contracts typechecks and touched-file lint passed. API build passed. Full repository suite and web production build intentionally not run for quota efficiency.
- Independent read-only review found 3 important issues; each reproduced by a failing test and fixed. No deferred review findings.
- Ruling: store spoken text in existing activity JSON payload, rather than a new top-level snapshot-only field, so materialized curriculum records remain consistent; integration reproducer passed after correction.
- Ruling: suggestions are deterministic and optional; no automatic AI rewrites or guessing of numeric pronunciation. Unknown formats retain original until an admin supplies and confirms speech. Missing/unresolvable evidence requires explicit manual confirmation; resolvable evidence must remain verbatim (apart from speaker labels/whitespace).
- Ruling: the review stamp is a freshness digest supplied by an authorized admin, not a cryptographic identity attestation. Existing authoring permissions and source revision controls apply.
- UI visual QA could not be completed: local browser use is disabled in Work settings; the active browser session also uses a learner account. Temporary sample page removed. Component behavior verified; no screenshot claimed.
- Existing published lessons/audio remain immutable and were not regenerated or republished. Changing narration requires a new draft and fresh audio; topic duration approval follows the existing source-revision rule.
