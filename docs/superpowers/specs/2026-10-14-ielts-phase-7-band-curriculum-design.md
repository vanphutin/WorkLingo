# IELTS Phase 7 — Band-Oriented Curriculum Design

Status: approved for implementation by the user's request to complete Phase 7 on 2026-10-14.

## Outcome

WorkLingo provides a versioned IELTS competency map and an evidence-based progression engine from
Foundation through a target of Band 9.0. Learners see their curriculum stage, chosen target band,
skill-specific proficiency descriptors, recent practice performance, gaps, and remediation. Content
Admins author, validate, and publish immutable curriculum-map versions.

## Product boundaries

- Curriculum stage, estimated proficiency, target band, practice performance, mock-test estimate,
  and official IELTS result are separate concepts and fields.
- Phase 7 does not produce a predicted IELTS band. Phase 8 owns mock tests and score reports.
- A target band is a learner goal, not a claim about current proficiency.
- Proficiency uses evidence-backed descriptors (`insufficient_evidence`, `emerging`, `developing`,
  `secure`, `advanced`) per skill, with sample counts and an explicit confidence label.
- Only completed server-evaluated practice contributes evidence. Content is original, licensed, or
  Admin-owned.

## Curriculum map

One versioned map contains seven ordered stages:

1. Foundation to 3.0
2. 3.0 to 4.0
3. 4.0 to 5.0
4. 5.0 to 6.0
5. 6.0 to 7.0
6. 7.0 to 8.0
7. 8.0 to 9.0

Every stage defines learning outcomes, prerequisite stage codes, lesson categories, competencies for
Listening/Reading/Writing/Speaking, recommended activities, assessment criteria, remediation paths,
practice formats, and exit criteria. Validation rejects missing skills, duplicate stage/competency
codes, broken prerequisites, non-contiguous ordering, impossible thresholds, and stages whose target
range does not increase.

## Versioning and ownership

- Draft updates use optimistic revisions and semantic idempotency.
- Publish creates an immutable version and archives the previous current version.
- A learner journey pins the current published version when it starts. Republishing does not change
  active journeys.
- Learners can own only one active journey. All learner reads and commands are owner-scoped.

## Progression engine

- Starting requires completed IELTS Bridge and a published seven-stage map.
- The learner chooses a target band from 3 through 9; changing it never rewrites evidence or current
  stage and cannot set a target below the current stage's upper boundary.
- Evaluation aggregates completed Integrated Practice blocks created after the journey started.
- Per skill, the engine reports sample count, recent correctness rate, descriptor, confidence, and
  unmet criteria. No numeric band estimate is returned.
- A stage advances by at most one step per explicit evaluation. Advancement requires the authored
  minimum completed sessions plus every skill's minimum samples and correctness threshold.
- If criteria are unmet, the response provides authored remediation and recommended formats. The
  final stage completes the journey without claiming an official or estimated IELTS result.

## Public seams

### Admin

- `GET /api/v1/admin/ielts-band-curriculum`
- `PUT /api/v1/admin/ielts-band-curriculum/draft`
- `POST /api/v1/admin/ielts-band-curriculum/validate`
- `POST /api/v1/admin/ielts-band-curriculum/publish`

### Learner

- `GET /api/v1/me/ielts-band-pathway`
- `POST /api/v1/me/ielts-band-pathway/start`
- `PUT /api/v1/me/ielts-band-pathway/target`
- `POST /api/v1/me/ielts-band-pathway/evaluate`

### Web

- Admin map workspace at `/admin/ielts-band-curriculum`.
- Learner pathway at `/ielts/pathway`, linked from the dashboard after Bridge completion.
- Responsive desktop/mobile rendering, keyboard-operable controls, inline errors, and no horizontal
  overflow.

## Acceptance criteria

1. Contracts distinguish all six band-related concepts and never expose a Phase 7 band estimate.
2. Exactly seven valid ordered stages seed idempotently.
3. Admin validation and immutable publishing are revision-safe, idempotent, audited, and atomic.
4. Learner journeys are owner-scoped and version-bound.
5. Progression derives only from completed Integrated Practice evidence and advances at most one stage.
6. Insufficient evidence produces skill gaps and remediation, not a score.
7. Republish leaves an existing learner on the pinned version while a new learner receives the new one.
8. Focused unit/integration/component tests and desktop/mobile E2E pass; final repository verification
   runs once at the merge gate.

