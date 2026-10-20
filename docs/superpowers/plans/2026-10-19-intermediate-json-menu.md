# Intermediate JSON import and menu

> **For agentic workers:** Use superpowers:executing-plans. The user has delegated implementation choices and requested economical execution.

**Goal:** Import a single Intermediate topic from JSON and make topic authoring easy to find in the sidebar.
**Architecture:** A strict, versioned JSON adapter feeds the existing topic form and source serializer. Saving, review and publication retain their existing separate actions.
**Tech Stack:** React, TypeScript, Zod, Vitest.
**Spec:** User request in chat; topic model in `../specs/2026-10-19-intermediate-topic-design.md`.

## Constraints and review focus

- One source passage; audio follows it. JSON cannot supply approval, publication, identity or duration fields.
- Invalid input must preserve the form; replacing edited content requires confirmation.
- File selection reads locally and applies only after the explicit import action. Guard pending JSON edits when leaving.
- Imported questions need valid option indexes and passage evidence lines; source delimiters remain rejected.
- Sidebar has one selected destination, keyboard-accessible groups and retained legacy routes.

## Task 1: JSON adapter and form

Files: `apps/web/src/features/admin-intermediate/topic-json.ts`, `topic-json-transfer.tsx`, their tests, existing editor and topic messages.
Interfaces: `topicJsonSchema`, `topicJsonToDraft(unknown)`, `topicDraftToJson(IntermediateLessonDraft)`, `createTopicJsonTemplate()`.

- [x] Write tests for roundtrip, wrong versions/types/unknown approval, invalid questions and source delimiters; observe failure.
- [x] Implement strict JSON conversion through the existing serializer and source reader.
- [x] Write component tests for importing into the form, invalid input preservation, replacement cancellation and file selection; observe failure.
- [x] Implement paste/file/template/export and dirty-state integration without saving or approving automatically.
- [x] Run focused tests, web checks; document the format with a usable sample and commit explicit files.

## Task 2: Sidebar

Files: `apps/web/src/features/admin-dashboard/admin-navigation.tsx`, its tests, Intermediate navigation CSS and messages.

- [x] Test grouped topic list/new links, unique selection and legacy visibility; observe failure.
- [x] Group links beneath Intermediate, open on Intermediate routes, keep old category tools nested.
- [x] Verify focused navigation and guard tests, then web suite/lint/typecheck/i18n; review final diff and commit.

Verification details: `../reports/2026-10-19-intermediate-json-menu-verification.md`.
