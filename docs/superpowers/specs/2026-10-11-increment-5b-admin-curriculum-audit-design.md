# Increment 5B: Admin Curriculum Operations and Audit Design

**Date:** 2026-10-11

**Status:** Proposed for review

**Scope:** Local-first administration of paths, levels, missions and their lesson relationships, plus a privacy-safe audit browser

## 1. Outcome

Content Admin can understand which curriculum is playable, create and arrange future curriculum, connect published lessons to missions, and archive obsolete curriculum without rewriting learner history. The same workspace exposes immutable audit events so an operator can answer who changed what and when without exposing learner answers or provider secrets.

## 2. Boundaries

5B owns curriculum metadata and relationships. Lesson source parsing, immutable `LessonVersion` publication and audio candidate binding remain in the existing Content Authoring module. Placement scoring, progression policy, engagement, user management and generalized operations monitoring are not changed.

## 3. Decisions

- Add `revision` to mutable `LearningPath`, `Level`, `Mission` and `MissionLesson` records. Every mutation supplies `expectedRevision`; stale writes return `409 CURRICULUM_REVISION_CONFLICT`.
- Stable identifiers (`slug`, level `code`, mission `purpose`) become immutable after first publication or first historical reference.
- Published curriculum may change descriptive metadata and lesson relationships only through expected-revision commands with atomic audit. Stable slug/code/purpose/parent identity is immutable after publication, published `LessonVersion` content remains immutable, and archived records cannot be edited.
- Archiving never cascades implicitly. A resource with active published children returns blockers. Archived records remain readable through historical session/audit relations but disappear from future selection.
- Reordering is a single transaction over one sibling set, locks that set, validates every ID exactly once and persists contiguous order values starting at one.
- A mission may reference only logical `Lesson` records that have a current `PUBLISHED` version. Removing a relationship is blocked while it would make a published mission unplayable.
- Placement missions are visible and labeled but cannot be converted to learning missions or vice versa.
- Every successful mutation writes an `AuditLog` in the same transaction. Failed validation and authorization do not create misleading success events.

## 4. Architecture

Add `AdminCurriculumModule` rather than widening learner-facing `CurriculumService`. It owns command/query services, DTO validation and Content Admin controllers. It consumes the existing playable-level/session-planner policies to calculate readiness; it does not duplicate them.

Add `AuditQueryModule` with an Admin-only cursor API. Audit rows remain append-only. A serializer applies an allowlist per action/resource type and rejects unsafe metadata at write time; the browser never receives arbitrary JSON copied from database rows.

## 5. APIs

All endpoints require `CONTENT_ADMIN`.

- `GET /api/v1/admin/curriculum`: path tree with revisions, status, purpose, lesson relationships, blockers and computed playability reasons.
- `POST /api/v1/admin/curriculum/paths`
- `PATCH /api/v1/admin/curriculum/paths/:id`
- `POST /api/v1/admin/curriculum/paths/:id/publish` and `POST /api/v1/admin/curriculum/paths/:id/archive`
- Equivalent create/update/publish/archive routes for levels and missions.
- `PUT /api/v1/admin/curriculum/paths/:id/level-order`
- `PUT /api/v1/admin/curriculum/levels/:id/mission-order`
- `PUT /api/v1/admin/curriculum/missions/:id/lessons`: full ordered relationship replacement with `expectedRevision`.
- `GET /api/v1/admin/audit-events?cursor=&limit=&actorId=&action=&resourceType=&resourceId=&from=&to=`

Mutation inputs use client UUID idempotency keys and existing `MutationReceipt` semantics. Page size defaults to 25 and is capped at 100. Audit cursors encode `(createdAt,id)` and are opaque to clients.

## 6. Audit safety

Allowed fields are identifiers, status transitions, revisions, order changes, level/path/mission codes and policy/version references. Forbidden fields include password hashes, cookies, tokens, credentials, raw source text, learner response, transcript, writing, recording/storage bytes, provider payload and unredacted provider error. Audit list responses expose actor display name and stable ID, not email.

## 7. Web experience

Add `/admin/curriculum` and `/admin/audit`. Curriculum uses a desktop-first tree with a mobile stacked fallback, explicit readiness/blocker text, focused edit forms and confirmation only for publish/archive. Audit uses filter controls and cursor pagination. No drag-only interaction: reorder has keyboard-accessible move controls. Every mutation preserves form input on recoverable failure and displays stale-revision recovery.

## 8. Error contract

- `404 NOT_FOUND` for missing resources.
- `409 CURRICULUM_REVISION_CONFLICT` for stale expected revision.
- `409 CURRICULUM_ARCHIVE_BLOCKED` with bounded blocker codes.
- `409 CURRICULUM_NOT_PLAYABLE` for publish/relationship changes that violate canonical session coverage.
- `409 IDEMPOTENCY_CONFLICT` for UUID reuse with different input.
- `422 INVALID_CURRICULUM_RELATIONSHIP` for duplicate, foreign or unordered relationship payloads.

## 9. Migration and compatibility

Existing seeded curriculum receives revision `1`. Existing learner/session/version records are untouched. New indexes support sibling order, status/playability lookup and audit cursor/filter queries. Backup/restore rehearsal includes new revision values and indexes.

## 10. Testing and acceptance

Domain/integration tests cover stale updates, concurrent reorder, complete sibling payloads, archive blockers, no implicit cascade, purpose immutability, session/version isolation, idempotent replay, owner/role authorization, audit atomicity, cursor stability and metadata redaction. Desktop/mobile E2E covers create → arrange → attach lesson → publish → learner availability, archive blocker, keyboard reorder and audit discovery.

Accepted when Admin can operate future curriculum without changing an existing session or published lesson snapshot, every successful command has one safe audit event, foreign roles are denied, `pnpm verify` passes and no Critical/Important review finding remains.

## 11. Non-goals

Bulk curriculum import, learner management, manual score overrides, destructive deletion, social roles, cloud CMS integration and audit export are excluded.
