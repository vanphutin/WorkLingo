# Intermediate JSON review and conservative repair

> **For agentic workers:** Use superpowers:executing-plans inline. The user delegated implementation choices and authorized AI-assisted format repair, not question generation.

**Goal:** Auto-fill valid admin JSON, explain actionable errors and offer a bounded AI repair proposal without changing lesson meaning.
**Architecture:** Share the topic JSON schema across client/server. Detailed diagnostics retain field paths or syntax positions. A role-protected, rate-limited repair endpoint asks the configured provider for literal text patches once, validates the resulting topic and proves primitive tokens are preserved. Admin reviews and explicitly applies the proposal.
**Tech Stack:** TypeScript, Zod, React, NestJS, configured AI HTTP adapter, Vitest.
**Spec:** User instructions in this chat: JSON defines the exact questions; AI only supports duration decisions plus explicitly requested JSON formatting repairs. Difficult/ambiguous cases must stop with an error.

## Constraints and review focus

- No auto-save, approval, publication, new fields/questions, changed answers or changed reading/evidence line layout.
- Valid JSON auto-fills untouched form state; manual edits, including edits during file reads, require explicit replacement confirmation.
- Invalid input preserves the form and reports field paths or line/column; actual user fixture fails at multi-line `writingModel`, not JSON syntax.
- Repairs may only change JSON punctuation/formatting and whitespace of scalar strings. Preserve decoded primitive order/content; readingText retains its line structure.
- Reject incomplete strings, ambiguous edits, changed content/counts, missing required data and invalid output. One provider attempt, no retries, no fake repairs and no provider secrets in errors.
- Repair proposals remain separate until explicit application; cancel stale work on input/record changes and protect unsaved edits.

## Tasks

- [x] Reproduce missing auto-fill; test paste/file review and manual-edit protection; implement auto-fill and review jump.
- [x] Add outline current-section regression and correction discovered during browser verification.
- [x] Move strict topic JSON validation into contracts with exact field paths; add syntax diagnostics and caret navigation.
- [x] Implement/test conservative patch validation and protected AI repair endpoint using existing provider settings.
- [x] Add proposal/review/apply UI, preserving original input and form until accepted; test manual edits and unsafe/error cases.
- [x] Verify web/contracts/API checks, actual browser fixtures and the user's attachment; document, review and commit explicit files.

Safety choice: bracket structure is preserved rather than reconstructed. Missing or mismatched brackets, incomplete strings and duplicate keys are treated as ambiguous and require manual correction. This deliberately supports fewer repair cases to avoid silent content loss.
