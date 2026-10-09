# Increment 5A: Onboarding, Placement, and Engagement Design

**Date:** 2026-10-09

**Status:** Approved

**Scope:** Local-first learner onboarding, self-placement, a four-skill placement journey, explainable level recommendation and confirmation, weekly consistency goals, and evidence-of-progress

## 1. Outcome

Increment 5A closes the missing journey between account creation and the first learning session. A new learner chooses either self-placement or an internal four-skill placement assessment, sees an explainable recommendation, confirms an eligible level, and then reaches the normal dashboard. Returning learners keep their current level and are not forced through onboarding again.

The same slice adds supportive engagement signals without turning them into the source of truth for learning:

- a learner-selected weekly study-day goal;
- a weekly consistency streak based on meeting that goal, not on perfect daily attendance;
- evidence-of-progress derived from evaluated work and mastery records;
- honest insufficient-evidence states when comparison would be misleading.

This slice does not claim CEFR, B2, TOEIC, IELTS, employment readiness, or human-calibrated AI quality. It prepares the learner workflow for a controlled Foundation pilot while preserving those explicit limits.

## 2. Delivery boundary

Increment 5 is split into four independently reviewable slices:

1. **5A — Onboarding, Placement, and Engagement**: this specification.
2. **5B — Admin Curriculum Operations**: path/level/mission operations, curriculum relationships, archive rules, and audit UI.
3. **5C — Security, Observability, and Privacy-Safe Analytics**: rate limits, redaction, failed-job/provider UI, and pilot event metrics.
4. **5D — Pilot Qualification**: accessibility, performance, backup rehearsal, complete MVP E2E, security review, and release checklist.

5A adds the audit events required for its own level confirmations, but generalized audit browsing belongs to 5B. It exposes placement state through owner-scoped operational APIs only; no pilot analytics event store is added until 5C.

## 3. Product decisions

- Registration creates a learner whose onboarding status is `PENDING`. Login routes pending learners to `/onboarding` and completed learners to `/dashboard`.
- Existing learner profiles are migrated to `COMPLETE` so the release does not interrupt current users.
- Content and system administrators never enter learner onboarding.
- Self-placement and assessed placement can select only a level that is currently playable: its path is published and it has at least one published learning mission that can form a canonical 60-minute four-skill session.
- A placement recommendation is never applied automatically. The learner must see the skill evidence and confirm it.
- The assessment uses the existing immutable lesson, learning-session, recording, draft, and Teacher AI pipelines. It does not create a second submission engine.
- Placement work is assessment evidence, not learning practice. It does not update mastery, Error Bank, review scheduling, weekly study days, or ordinary learning progress.
- The first committed placement policy can recommend only levels for which a reviewed policy threshold and playable curriculum exist. With the current seed, `FOUNDATION_1` is the only eligible recommendation.
- A weekly goal is two to five distinct learning days. The default is three days.
- The consistency streak counts consecutive completed calendar weeks in which the learner met that week's goal. The current week cannot break the streak before it ends, and no missed-day warning or guilt language is shown.
- Changing the weekly target affects the current week only before its first counted learning day; otherwise it takes effect next week. Historical weeks are immutable.
- Evidence-of-progress is computed from existing durable evidence. It must show sample counts and must not state that a skill improved unless both comparison windows contain enough evaluated evidence.

## 4. Architecture

```text
Next.js onboarding UI
  ├── choose self-placement or placement assessment
  ├── select an eligible level
  ├── launch/resume placement session
  ├── wait/retry Teacher AI evaluation
  └── review recommendation and confirm
                │
                ▼
NestJS Onboarding module
  ├── eligible-level policy
  ├── placement-attempt lifecycle
  ├── recommendation policy
  └── transactional level confirmation + audit
                │
                ├────────► existing Curriculum module
                ├────────► existing Learning Sessions module
                ├────────► existing Teacher AI / Jobs pipeline
                └────────► PostgreSQL

Completed ordinary learning session
                │
                ▼
Engagement module
  ├── idempotent local study-day projection
  ├── immutable weekly target snapshot
  ├── consistency streak calculation
  └── evidence-of-progress read model
                │
                ▼
Learner dashboard
```

The API remains a modular monolith. `OnboardingModule` owns selection, placement state, recommendation, and confirmation. `EngagementModule` owns consistency projections and evidence-of-progress. Curriculum remains the authority for whether a level is published and playable; progression remains the authority for changes after onboarding.

## 5. Curriculum and session purpose

### 5.1 Mission purpose

Add a `MissionPurpose` enum:

- `LEARNING`: normal curriculum mission; default for all existing and authored missions.
- `PLACEMENT`: hidden assessment mission used only through onboarding.

Every existing mission is migrated to `LEARNING`. Normal mission selection, progression, mastery-map curriculum scans, and dashboard mission summaries must explicitly filter to `LEARNING`. Placement selection must explicitly filter to `PLACEMENT`.

### 5.2 Placement fixture

Seed one immutable `PLACEMENT` mission with a 45-minute lesson containing reading, listening, speaking, and writing. It uses the same activity schemas as learning content and has playable local fake-TTS audio. The lesson is version-bound exactly like every other published lesson.

The fixture is diagnostic and workplace-focused. It samples comprehension, reasoning, shadowing/response, and a short workplace message. Its content and policy version are recorded on the placement attempt so a later seed or policy cannot rewrite an existing result.

### 5.3 Learning-session behavior

`LearningSession` remains the execution container. Its learner response DTO adds `purpose: 'learning' | 'placement'`, derived from the bound mission.

Placement sessions reuse:

- checkpoint and refresh recovery;
- ownership and idempotency rules;
- immutable lesson-version binding;
- recording consent and retention;
- writing draft revisions;
- asynchronous evaluation and safe retries.

The following consumers must ignore placement sessions:

- mastery and Error Bank writes;
- review scheduling;
- checkpoint progression;
- ordinary progress counts;
- weekly study-day projection;
- next-learning-mission selection.

The placement result service may read evaluated attempts from the placement session but does not alter those immutable attempts.

## 6. Data model

### 6.1 Learner profile

Extend `LearnerProfile` with:

| Field | Meaning |
|---|---|
| `onboardingStatus` | `PENDING` or `COMPLETE` |
| `onboardingMethod` | nullable `SELF_SELECTED`, `PLACEMENT`, or `MIGRATED` |
| `onboardedAt` | confirmation time |
| `weeklyTargetDays` | preferred target for future weeks, integer 2–5, default 3 |

`currentLevelCode` remains the single current-level authority. It is not changed until onboarding confirmation succeeds.

### 6.2 Placement attempt

Add `PlacementAttempt`:

| Field | Meaning |
|---|---|
| `id` | UUID |
| `learnerId` | owner |
| `clientAttemptId` | learner-scoped idempotency key |
| `learningSessionId` | unique placement session |
| `lessonVersionId` | immutable diagnostic content |
| `policyVersion` | recommendation policy, initially `workplace-placement-v1` |
| `status` | `IN_PROGRESS`, `PROCESSING`, `ACTION_REQUIRED`, `RECOMMENDED`, `CONFIRMED` |
| `skillResults` | normalized reading/listening/speaking/writing scores plus evidence counts |
| `recommendedLevelCode` | nullable until recommendation |
| `explanation` | bounded structured reasons, never raw responses |
| `confirmedAt` | nullable confirmation time |
| timestamps | lifecycle audit |

Constraints:

- unique `(learnerId, clientAttemptId)`;
- unique `learningSessionId`;
- unique `CONFIRMED` attempt per learner is enforced by service transaction and profile state;
- the referenced session, lesson version, and learner must match;
- raw transcript, writing, recording bytes, and provider response are not copied into `PlacementAttempt`.

### 6.3 Engagement projection

Add `LearnerStudyDay`:

| Field | Meaning |
|---|---|
| `learnerId` | owner |
| `dateKey` | learner-local `YYYY-MM-DD` |
| `timezone` | timezone used to derive the date |
| `completedSessionCount` | idempotently incremented ordinary learning sessions |
| `firstCompletedAt` / `lastCompletedAt` | evidence timestamps |

The unique key is `(learnerId, dateKey)`. Only a transition of a `LEARNING` session to `COMPLETED` can update it, and replaying the same completion must not increment twice.

Add `LearnerStudySession` as the idempotency relation between a completed learning session and its study day. `sessionId` is unique, and the row stores `learnerId`, `studyDayId`, and `completedAt`. Session completion creates this row and increments `completedSessionCount` in one transaction; a duplicate completion observes the existing row and performs no second increment.

Add `LearnerEngagementWeek`:

| Field | Meaning |
|---|---|
| `learnerId` | owner |
| `weekStartKey` | Monday in the stored timezone |
| `timezone` | immutable timezone snapshot |
| `targetDays` | immutable target for this week |
| `status` | `ACTIVE`, `MET`, or `MISSED` |
| `metAt` | first time distinct study days reach the target |

The unique key is `(learnerId, weekStartKey)`. Missing week rows count as missed gaps when calculating a streak; the service does not need a scheduled job to materialize inactivity.

## 7. Onboarding API contracts

All routes are under `/api/v1/me/onboarding` and require a learner session.

### `GET /me/onboarding`

Returns:

- onboarding status and method;
- eligible self-placement levels with availability reasons;
- active/latest placement attempt summary;
- confirmed current level when complete;
- next action: `choose_method`, `resume_placement`, `wait_for_evaluation`, `retry_evaluation`, `review_recommendation`, or `open_dashboard`.

### `POST /me/onboarding/self-placement`

Input:

```json
{
  "clientConfirmationId": "uuid",
  "selectedLevelCode": "FOUNDATION_1"
}
```

The transaction locks the learner profile, rechecks that the level is playable, sets the level and onboarding fields, writes an audit log, and stores an idempotent mutation receipt. Reusing the UUID with different input returns `409`.

### `POST /me/onboarding/placement-attempts`

Input contains a `clientAttemptId`. The service returns the existing same-target attempt on replay, otherwise creates a `PLACEMENT` learning session bound to the current published placement lesson version.

Only one non-confirmed active placement attempt is allowed per learner. A learner may leave and resume it. Creating another while one is active returns `409` with the existing attempt identifier.

### `GET /me/onboarding/placement-attempts/:id`

Returns ownership-scoped attempt state, its session ID, per-skill evaluated/pending/failed state, recommendation when ready, explanation, and actionable retry references. It never returns another learner's attempt or raw provider diagnostics.

When the session is complete:

- any pending speaking/writing evaluation produces `PROCESSING`;
- a terminal retryable evaluation failure produces `ACTION_REQUIRED`;
- four available skill results cause the recommendation to be calculated once and persisted as `RECOMMENDED`.

### `POST /me/onboarding/placement-attempts/:id/confirm`

Input contains `clientConfirmationId`. The transaction locks the learner profile and attempt, verifies `RECOMMENDED`, rechecks that the recommended level is still playable, marks the attempt `CONFIRMED`, updates the profile, writes the audit log, and stores an idempotent receipt.

If curriculum was withdrawn after recommendation, confirmation returns `409` with a safe explanation and keeps the recommendation snapshot intact. The learner can then self-select from currently eligible levels.

## 8. Recommendation policy

`workplace-placement-v1` is deterministic and versioned.

1. Reading and listening use the normalized deterministic activity score.
2. Speaking and writing require a persisted successful Teacher AI evaluation. Missing or pending evidence never becomes zero and never silently passes.
3. Each skill result is normalized to `[0, 1]` and includes an evidence count.
4. Candidate levels are ordered by curriculum order and restricted to levels that are playable at calculation time.
5. The policy selects the highest candidate whose configured minimum is met separately by all four skills. An overall average cannot compensate for a weak or missing skill.
6. `FOUNDATION_1` is the safe floor for the first policy and does not claim a CEFR equivalence. Higher candidates cannot be added to the policy until their curriculum, fixtures, and reviewed thresholds exist.
7. The persisted explanation lists each skill result, the selected policy version, why the selected candidate is eligible, and why a higher candidate was unavailable or not met. It contains no raw learner answer.

The policy is a pure function with fixture-based boundary tests. Human calibration is required before any threshold is described as real-world level certification.

## 9. Engagement API and semantics

### `GET /me/engagement`

Returns:

- current week start, timezone, target days, completed distinct days, and remaining days;
- current consistency streak and best streak;
- whether a target change applies immediately or next week;
- evidence-of-progress summary.

### `PATCH /me/engagement/weekly-target`

Accepts an integer from 2 through 5. If the current week has no study day, the current weekly snapshot and profile preference change together. Otherwise only the profile preference changes and the response states the next effective week.

### Weekly consistency

- Weeks start Monday in the learner profile timezone.
- Distinct completed `LEARNING` days count; number of sessions in one day does not add days.
- A week becomes `MET` immediately when its target is reached.
- A past week below target is `MISSED` when read or when a later week is opened.
- The current active week does not reset a streak before Sunday ends in its stored timezone.
- The UI uses neutral language: “2 of 3 learning days” and “2-week consistency”, never “you lost” or “you failed”.

### Evidence-of-progress

The read model compares the most recent 28 days with the preceding 28 days using existing evaluated attempts, mastery records/events, completed learning sessions, and study days. It returns:

- completed learning sessions and distinct study days;
- Language Blocks with new evaluated evidence;
- current per-skill average, sample count, and optional change;
- number of due reviews completed;
- a status of `IMPROVING`, `STEADY`, `NEEDS_ATTENTION`, or `INSUFFICIENT_EVIDENCE` per skill.

A numeric skill change requires at least two evaluated samples for that skill in both windows. Otherwise `change` is null and the UI reports the available sample count. Placement attempts are excluded.

## 10. Web experience

### 10.1 Routing

The authenticated user summary adds nullable learner onboarding state. Post-authentication routing becomes:

```text
admin role                         → /admin/content
learner + onboarding PENDING      → /onboarding
learner + onboarding COMPLETE     → /dashboard
```

Learner route protection redirects a pending learner away from dashboard, mastery, and ordinary learning sessions. It still permits the placement session referenced by that learner's active attempt.

### 10.2 Onboarding screens

The onboarding page is a resumable state-driven workspace:

1. choose self-placement or assessment;
2. self-placement: select an eligible level, review the explanation, confirm;
3. assessment: review consent/provider notice, launch or resume the placement session;
4. processing: show each skill as evaluated, pending, or action required;
5. recommendation: show all four skill results, bounded explanation, and confirm;
6. completion: continue to dashboard.

The UI must not display unavailable higher levels as achievable choices. It may explain that additional levels become available when reviewed curriculum is published.

### 10.3 Dashboard engagement cards

The existing progress card is extended rather than replaced:

- weekly mission progress and target control;
- consistency streak with neutral copy;
- evidence-of-progress by skill;
- explicit insufficient-evidence states;
- a link to the existing Mastery and Memory page for details.

Desktop and mobile use the same information hierarchy. All controls meet the 44px touch-target rule, work keyboard-only, expose text labels in addition to color, and preserve a 16px mobile input font.

## 11. Concurrency, idempotency, and recovery

- Every placement creation and confirmation mutation uses a client UUID and the existing mutation-receipt pattern.
- Profile confirmation is serialized with a row lock so two tabs cannot confirm different methods or levels.
- Session completion and study-day projection are committed atomically or through an idempotent outbox/receipt consumed by the same local process. A crash cannot count one session twice.
- Placement recommendation is immutable once persisted. A repeated status read returns the same snapshot.
- Refreshing any onboarding state reconstructs it from the server. Browser storage is not the source of truth.
- Provider timeout, rate limit, and malformed output preserve the attempt and expose the existing safe retry path.
- An abandoned placement session remains resumable; this slice does not add destructive deletion of assessment history.

## 12. Authorization, privacy, and audit

- All onboarding and engagement resources are owner-scoped. Foreign IDs return `404`.
- Only the backend calls AI providers; placement pages receive no provider credentials or raw diagnostics.
- Placement explanations and engagement projections exclude raw recordings, transcript text, writing text, and provider payloads.
- Recording consent and retention rules remain unchanged.
- Self-placement and placement confirmation create `AuditLog` records with actor, method, from/to level, policy/content version when applicable, and no raw answer.
- Logs use IDs, state transitions, safe error codes, and correlation IDs. They do not include answers, transcript, email, cookies, tokens, or recording bytes.

## 13. Migration and compatibility

The migration sequence is:

1. add new enums/tables and nullable profile fields;
2. mark all existing learner profiles `COMPLETE` with `MIGRATED` and preserve their current level;
3. set the new-profile default to `PENDING`;
4. mark every existing mission `LEARNING`;
5. seed the versioned placement mission, lesson, audio, and policy fixture idempotently.

Existing sessions, attempts, mastery evidence, progress, and content versions are not rewritten. Existing API response changes are additive. A clean database setup and an upgrade from the current schema must both be tested.

## 14. Error contract

Stable safe cases include:

| HTTP | Code | Meaning |
|---:|---|---|
| 404 | `NOT_FOUND` | foreign or missing attempt/session |
| 409 | `ONBOARDING_ALREADY_COMPLETE` | another method already confirmed |
| 409 | `PLACEMENT_ATTEMPT_ACTIVE` | resume existing active attempt |
| 409 | `PLACEMENT_NOT_READY` | evaluation still pending or requires retry |
| 409 | `LEVEL_NO_LONGER_AVAILABLE` | curriculum withdrawn before confirmation |
| 409 | `IDEMPOTENCY_CONFLICT` | client UUID reused with different input |
| 422 | `LEVEL_NOT_PLAYABLE` | selected level lacks canonical published content |
| 422 | `INVALID_WEEKLY_TARGET` | target outside 2–5 |

Unexpected errors use the existing global safe-error response and never expose stack traces or provider bodies.

## 15. Testing strategy

### Domain tests

- playable-level eligibility, including missing path, mission, lesson version, skill, or 60-minute plan;
- placement policy boundaries, null evidence, per-skill thresholds, and highest eligible candidate;
- week boundaries in `Asia/Ho_Chi_Minh`, year rollover, target changes, missing weeks, current-week protection, and streak calculation;
- evidence windows, minimum sample rules, and placement exclusion.

### Integration tests

- registration creates `PENDING`; existing-profile migration produces `COMPLETE`;
- self-placement authorization, idempotency, concurrent confirmation, audit, and withdrawn curriculum;
- placement creation/resume, immutable version binding, four-skill processing, retry state, recommendation persistence, and confirmation;
- placement attempts do not update mastery, Error Bank, progression, progress counts, or engagement;
- ordinary session completion counts exactly one local study day under replay/concurrency;
- engagement isolation between learners;
- clean migration/seed and upgrade migration.

### Web tests

- role/onboarding-aware routing;
- each resumable onboarding state;
- level availability explanation;
- pending/failed/evaluated skill presentation;
- recommendation confirmation and curriculum-withdrawn recovery;
- weekly target immediate/next-week behavior;
- evidence-of-progress and insufficient-evidence copy.

### E2E

Desktop and mobile journeys cover:

1. register → self-place → confirm → dashboard → complete learning session → weekly mission updates;
2. register → placement → refresh/resume → complete four skills → wait/retry evaluation → confirm recommendation → dashboard;
3. existing learner login bypasses onboarding;
4. placement work is absent from normal progress and Mastery UI.

The repository gate remains `pnpm verify`.

## 16. Acceptance criteria

Increment 5A is accepted when:

1. New learners cannot enter normal learning before confirming self-placement or an assessment recommendation.
2. Existing learners continue directly to their current dashboard after migration.
3. Self-placement rejects any level without published playable four-skill curriculum.
4. The placement journey persists every response before evaluation, resumes after refresh, and remains bound to its original lesson version.
5. Recommendation waits for all four genuine skill results, explains the decision, and requires explicit confirmation.
6. Placement evidence does not contaminate learning mastery, review, progression, engagement, or ordinary progress.
7. Weekly consistency counts distinct completed learning days exactly once and respects the learner timezone and immutable weekly target.
8. Evidence-of-progress reports sample counts and never invents an improvement from insufficient data.
9. Owner isolation, idempotency, concurrency, provider failure, mobile, keyboard, and responsive cases are covered.
10. `pnpm verify` passes and an independent multi-axis review has no unresolved Critical or Important findings.

## 17. Non-goals

- Public-pilot readiness or human calibration approval.
- B2, TOEIC, IELTS, academic, or employment certification.
- Placement above levels with reviewed playable curriculum and committed policy thresholds.
- Adaptive computer-based testing or AI-generated assessment content.
- Manual admin override of placement scores.
- Social leaderboards, XP economy, badges, push notifications, or punitive daily streaks.
- Generalized admin curriculum UI, operations dashboard, rate limiting, analytics storage, or release qualification owned by 5B–5D.
- Cloud deployment, multi-device offline synchronization, native mobile applications, or payments.
