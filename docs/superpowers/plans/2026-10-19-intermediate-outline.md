# Intermediate lesson outline

> **For agentic workers:** Use superpowers:executing-plans inline; the user has delegated implementation choices and requested economical execution.

**Goal:** Add a right-hand outline for long topic lessons, preserving the exact administrator-authored questions.
**Architecture:** The outline derives counts and links from the current form arrays. Stable section/question targets support native anchors and focus. A bounded sticky column appears on desktop; a collapsible outline precedes the form on smaller screens.
**Tech Stack:** React, TypeScript, CSS, Vitest, browser smoke fixtures.
**Spec:** Latest chat instruction: JSON with 10 questions means 10 questions. AI supports duration decisions only; it must not generate or insert questions.

## Constraints and review focus

- No backend, question generation, duration policy, JSON format or publication changes.
- Counts update with import/add/remove without truncation, duplication or hidden generated questions.
- Unique targets for each reading/listening question; jump opens a collapsed target and transfers keyboard focus.
- Existing save, conflict, dirty-navigation and human approval rules remain intact. Within-page jumps must not prompt to discard edits.
- Outline remains usable with many questions, reduced motion, mobile layouts and published read-only records.

## Task: Outline and exact counts

Files: new `apps/web/src/features/admin-intermediate/topic-lesson-outline.tsx`; existing topic editor, questions, CSS, translations and tests.

- [x] Write tests importing 10 reading questions, checking all fields/counts and a working last-question anchor; verify failure.
- [x] Add unique, focusable targets and a responsive outline derived from the form.
- [x] Test import/add/remove updates, JSON expansion and within-page navigation preserving edits.
- [x] Run Intermediate/navigation tests, web lint/types/i18n and browser checks at desktop/mobile with long content; review diff.
- [x] Document the behavior, verify and commit explicit files.

Verification: `../reports/2026-10-19-intermediate-outline-verification.md`.
