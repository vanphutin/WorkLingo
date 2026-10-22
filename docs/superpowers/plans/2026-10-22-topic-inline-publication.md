# Topic Inline Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Complete publication in step 4 of the topic lesson editor without navigating to Content.

**Architecture:** Compose the existing validation, audio and vocabulary-aware publication panels in a topic publication section. The topic editor owns the current record and unsaved state; revision/hash changes reset the publication session. Keep the Content workspace available for other authoring formats.

**Tech Stack:** Next.js, React, TypeScript, Vitest, Playwright, existing Liquid Glass tokens.

**Spec:** User request in this chat: integrate publication into the existing four steps, after session approval, instead of switching to Content.

## Global Constraints

- Existing API, permissions, optimistic revision checks, audio selection, vocabulary review and idempotent publication remain authoritative.
- No automatic publication; an explicit Publish action is required.
- Unsaved source, JSON or plan changes block publication; in-flight publication blocks editing.
- VI/EN, keyboard, mobile, Light/Dark and reload retain truthful state.
- Work only in an isolated feature branch. Do not push, merge, deploy or publish user content.

## Review Focus

- An edited source/JSON/plan must never use prior readiness to publish.
- Slow validation/preview/publication responses must not overwrite a newer record or unmounted editor.
- Invalid content, missing audio, unresolved vocabulary and stale revisions must fail closed with visible feedback.
- Successful publication must make the topic editor read-only immediately and remain so after reload.
- Step 4 and its next-step link must stay in the current route and be keyboard accessible.

### Task 1: Complete the topic publication flow in place

**Files:**
- Create: `apps/web/src/features/admin-intermediate/topic-publication-panel.tsx`
- Modify: `intermediate-lesson-editor.tsx`, `topic-review-panel.tsx`, shared `admin-content/publish-panel.tsx`, paired topic/group messages and scoped CSS.
- Test: new `topic-publication-panel.test.tsx`, topic editor/review tests and existing browser approval fixture spec.

**Interfaces:**
- Consumes: `ContentImportDto`, existing `apiClient.validateContentImport/getContentPreview/publishContentImport`, `ValidationPanel`, `AudioPreview`, `PublishPanel`.
- Produces: `TopicPublicationPanel({record, approved, blocked, onRecordChange, onBusyChange})`; review callback `onApprovalChange(approved)` and optional `publicationHref`; publication busy callback for the existing shared panel.

- [x] Write failing integration tests using real panels and mocked HTTP client boundaries: clean saved drafts can validate before approval; valid source/audio/vocabulary and approval enable explicit publish; success updates editor; edits block; conflict/error permits safe recovery; reload uses persisted status.
- [x] Run `pnpm --filter @worklingo/web test -- src/features/admin-intermediate/topic-publication-panel.test.tsx src/features/admin-intermediate/topic-editor.test.tsx` and inspect expected RED failures.
- [x] Implement the inline section and state callbacks. Keep forms mounted, reset readiness on identity/revision/hash changes, use existing controls and translated copy. Point the approval link to the local section, update the current workflow step from approval and record status, and show validation issues locally.
- [x] Run targeted tests for topic editor/review/publication plus shared validation/audio/publish. Expected: all pass.
- [x] Extend isolated browser fixtures to approve, validate, select audio and publish without a route change; reload published state; verify desktop/mobile and VI/EN screenshots. Expected: all pass; no real API mutations.
- [x] Run full frontend regression, lint, typecheck, i18n and production build. Expected: zero failing checks.
- [x] Request independent review, fix material findings with regression tests, inspect final diff, and commit explicit files. Refresh the local preview with the tested build.
