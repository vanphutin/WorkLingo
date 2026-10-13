# IELTS Phase 4 — Orientation Design

**Status:** Approved for implementation
**Date:** 2026-10-13
**Owner:** WorkLingo

## Outcome

After passing a Foundation checkpoint, a learner can complete a short, narrated, data-driven IELTS orientation. Content Admins can author, preview, validate, publish, archive, and version the presentation. A learner is pinned to the published version they started, can resume after refresh, and receives a durable completion record that Phase 5 can use as a prerequisite.

This phase extends the existing local-first monolith. It does not introduce a second lesson engine, cloud storage, or an IELTS scoring claim.

## Product boundaries

### Included

- One active IELTS orientation presentation with any number of ordered slides.
- Admin draft editing: title, slide add/remove/reorder, body, image, narration transcript, uploaded audio, and an optional single-choice knowledge check.
- Local media upload and authorized range streaming.
- Draft validation, preview, immutable publish, archive, audit log, and optimistic concurrency.
- Learner eligibility derived from persisted Foundation checkpoint evidence.
- Version-bound start/resume, previous/next navigation, answer feedback, progress, and completion.
- Uploaded narration when present; otherwise free browser speech synthesis from the authored transcript.
- Playback controls for play/pause, replay, volume, speed, captions/transcript, and accessible keyboard/button navigation.
- Responsive desktop/mobile journeys.

### Deferred

- IELTS Bridge lessons and question-type training (Phase 5).
- IELTS curriculum activation and band progression (Phases 5–7).
- Official IELTS scoring or certification claims.
- Cloud object storage, CDN, third-party image search, and paid TTS.
- Timeline-level audio/animation synchronization; Phase 4 changes slides only by learner action.

## Domain model

### `IeltsOrientation`

Logical presentation and mutable authoring head.

- `slug` is stable and unique.
- `draftContent` stores the validated contract shape without duplicating slide rows.
- `draftRevision` provides optimistic concurrency.
- `status`: `DRAFT`, `VALIDATED`, `PUBLISHED`, or `ARCHIVED`.
- `currentPublishedVersionId` points to the release used by new learners.

### `IeltsOrientationVersion`

Immutable release snapshot.

- Unique `(orientationId, version)`.
- `content` is a complete presentation snapshot.
- `sourceHash` enables deterministic identity and audit.
- Publishing archives the previous current version atomically.

### `OrientationMediaAsset`

Immutable local object metadata.

- Kind is `AUDIO` or `IMAGE`.
- Allowed audio: WAV, MP3, OGG, WebM; allowed image: PNG, JPEG, WebP, GIF.
- Size is bounded and filename is metadata only, never a storage path.
- An asset belongs to the logical orientation and may be referenced by drafts and immutable versions.

### `OrientationProgress`

One durable learner attempt per version.

- `(learnerId, orientationVersionId)` is unique.
- `currentSlideIndex` is the furthest unlocked slide, not browser-local UI state.
- `answers` stores question slug, selected option, correctness, and timestamp.
- `revision` protects concurrent tabs.
- `completedAt` is set only after the learner has unlocked the final slide and answered all required checks correctly.
- Starting after a new publish resumes an existing incomplete pinned version; a completed learner remains completed rather than being reset by content publication.

## Contracts

### Presentation content

Each slide has a stable UUID, kebab-case slug, title, concise body, optional image asset, narration transcript, optional uploaded audio asset, and optional single-choice question. A transcript is required for every slide so captions and browser speech remain available even when uploaded audio fails.

Questions contain 2–6 options, a valid zero-based answer index, and authored feedback. Publishing requires unique slide IDs/slugs and valid referenced media owned by the same orientation.

### Admin API

- `GET /api/v1/admin/ielts-orientation`
- `PUT /api/v1/admin/ielts-orientation/draft`
- `POST /api/v1/admin/ielts-orientation/validate`
- `POST /api/v1/admin/ielts-orientation/publish`
- `POST /api/v1/admin/ielts-orientation/archive`
- `POST /api/v1/admin/ielts-orientation/media`
- `GET /api/v1/admin/ielts-orientation/media/:assetId/content`

All mutations require Content/System Admin role. Publish is idempotent and records an audit event. Published snapshots are never edited.

### Learner API

- `GET /api/v1/me/ielts-orientation`
- `POST /api/v1/me/ielts-orientation/start`
- `PUT /api/v1/me/ielts-orientation/progress`
- `GET /api/v1/me/ielts-orientation/media/:assetId/content`

The status response is one of `locked`, `available`, `in_progress`, or `completed`. Locked responses include safe reason codes and never expose answer keys. Learner presentation payloads omit correct answer indexes and include feedback only after an answer submission.

## Eligibility and checkpoint integration

Orientation becomes available when all conditions hold:

1. learner onboarding is complete;
2. learner has an Intermediate enrollment;
3. the latest relevant Foundation checkpoint assessment is `passed`;
4. every skill in that immutable assessment passed with no pending evaluations;
5. a published orientation version exists.

An existing pinned progress record remains readable even if eligibility or the current release later changes. This preserves version isolation and avoids losing learner work.

## Authoring and publishing invariants

- Draft writes use `expectedRevision`; stale writes return `409`.
- Validation returns field-addressable issues and moves only a valid current draft to `VALIDATED`.
- Any draft edit after validation returns it to `DRAFT`.
- Publish repeats validation, verifies media ownership, creates the immutable version, archives the prior version, updates the current pointer, and writes audit/idempotency records in one transaction.
- Archive clears the current pointer but does not delete versions, media, progress, or audit history.
- At least 3 and at most 20 slides are allowed to keep cognitive load bounded.

## Learner interaction rules

- A learner may move backward freely.
- Moving forward past a question slide requires a correct answer.
- Wrong answers return authored explanatory feedback without exposing the answer index.
- Progress is saved server-side before the UI advances.
- Refresh restores the pinned version and current slide.
- Completion is idempotent and cannot be revoked by publishing a newer version.
- Uploaded narration is preferred. Browser speech synthesis is an explicit free fallback controlled by the existing learner audio preference.

## Security, accessibility, and performance

- Media routes authorize ownership/reference before parsing range requests.
- Uploads use MIME allowlists, byte limits, generated storage keys, and do not trust filenames.
- API responses never expose storage keys, answer keys, or internal errors.
- Player buttons have names, focus states, and disabled states; slide changes announce through a polite live region.
- Transcript remains available independently from sound.
- Reduced-motion users get no animated transition dependency.
- Presentation payload is one compact version snapshot; media is loaded only for the active slide.

## Acceptance evidence

1. Admin creates/reorders slides, uploads media, validates, previews, and publishes.
2. Invalid questions, duplicate slugs, missing transcripts, or foreign media cannot publish.
3. A learner without a passing Foundation checkpoint remains locked.
4. An eligible learner starts, hears uploaded or browser narration, sees transcript, answers a check, navigates, refreshes, and resumes.
5. Publishing version N+1 does not move a learner pinned to N.
6. Final completion is durable and exposed as the future Phase 5 prerequisite.
7. Desktop and mobile Playwright journeys pass without regressing existing Foundation flows.
