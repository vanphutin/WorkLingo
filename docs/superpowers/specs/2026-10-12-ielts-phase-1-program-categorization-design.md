# IELTS Phase 1: Program Categorization Design

**Date:** 2026-10-12

**Status:** Approved on 2026-10-12

**Scope:** Introduce a backward-compatible program layer for Beginner, Intermediate, TOEIC and IELTS without rewriting the existing learning engine or learner history

## 1. Outcome

WorkLingo exposes four data-driven English-learning programs while preserving the current Workplace English experience as the available Intermediate program. Learners can understand which programs are available, in development or coming soon. The schema can later hold multiple curriculum paths per program, including the IELTS hierarchy, without overloading `LearningPath` or changing immutable lesson/session history.

Phase 1 is a categorization and navigation increment. It does not yet implement IELTS lessons, band scoring, program enrollment or IELTS-specific question types.

## 2. Verified baseline

The current architecture already provides reusable foundations:

- `LearningPath -> Level -> Mission -> MissionLesson -> Lesson -> LessonVersion` curriculum hierarchy.
- Immutable published lesson versions and version-bound session snapshots.
- Four-skill session planning for 45, 60, 90, 120 and 150 minutes.
- Content authoring, audio lifecycle, mastery, progression, onboarding, placement and Admin curriculum operations.
- Next.js responsive learner/Admin surfaces and a NestJS modular monolith backed by PostgreSQL.

The local database audit on 2026-10-12 contained 1 learning path, 1 level, 3 missions, 4 lessons, 11 lesson versions, 16 learning sessions and 23 activity attempts. These records are migration-sensitive and must retain their identifiers and relationships.

Current constraints that Phase 1 must not hide:

- `LearnerProfile.currentLevelCode` is global rather than program-specific.
- Existing progression assumes one active path context.
- Existing learner labels and content are workplace-oriented.
- The lesson activity schema is not yet broad enough for the full IELTS question taxonomy.

## 3. Chosen architecture

Add `LearningProgram` as a parent of `LearningPath`:

```text
LearningProgram
  └── LearningPath
        └── Level
              └── Mission
                    └── Lesson / immutable LessonVersion
```

This design was selected over two alternatives:

1. Reusing `LearningPath` as the program card would be quick but would conflate a product category with one curriculum sequence and prevent a program from owning multiple paths.
2. A configuration-only catalog would avoid a migration but could not provide durable curriculum relationships, content counts or future Admin management.

The parent entity is additive, reuses the proven curriculum/session engine and creates a stable boundary for future IELTS development.

## 4. Program model

Add a Prisma enum:

```text
ProgramAvailabilityStatus
  AVAILABLE
  COMING_SOON
  IN_DEVELOPMENT
  BETA
  DISABLED
```

Add `LearningProgram` with:

- `id`: UUID primary key.
- `slug`: unique, immutable public identifier.
- `name`: learner-facing display name.
- `description`: concise learner-facing explanation.
- `learningGoal`: the outcome the program trains toward.
- `proficiencyLabel`: honest orientation text, not a guaranteed certification equivalence.
- `iconKey`: closed design-system key; never an arbitrary URL or executable markup.
- `availabilityStatus`: `ProgramAvailabilityStatus`.
- `displayOrder`: unique deterministic catalog order.
- `createdAt` and `updatedAt`.
- `paths`: one-to-many relation to `LearningPath`.

Add non-null `LearningPath.programId`, its relation and an index on `(programId, status)`. Existing `LearningPath.id`, slug, status, revisions and descendants remain unchanged.

The initial idempotent catalog is:

| Slug | Name | Initial status | Phase 1 behavior |
|---|---|---|---|
| `beginner` | Beginner | `COMING_SOON` | Visible, unavailable CTA |
| `intermediate` | Intermediate | `AVAILABLE` | Opens the existing dashboard |
| `toeic` | TOEIC | `COMING_SOON` | Visible, unavailable CTA |
| `ielts` | IELTS | `IN_DEVELOPMENT` | Visible, unavailable CTA with active-development explanation |

Status semantics are closed and server-owned:

- `AVAILABLE`: visible and selectable.
- `BETA`: visible and selectable with an explicit Beta label.
- `COMING_SOON`: visible but not selectable.
- `IN_DEVELOPMENT`: visible but not selectable.
- `DISABLED`: omitted from learner catalog responses; historical relations remain readable.

## 5. Migration and data preservation

Use one reviewed additive migration with this order:

1. Create the enum and `LearningProgram` table.
2. Insert/upsert the four stable program rows by slug.
3. Add nullable `LearningPath.programId`.
4. Backfill every existing path to `intermediate` using a set-based update.
5. Assert no path remains unassigned.
6. Make `programId` non-null, add the foreign key with `ON DELETE RESTRICT`, and add indexes.

The migration must not recreate, renumber or update IDs for paths, levels, missions, lessons, lesson versions, sessions, attempts, mastery records or audit history. It must work for zero, one or many pre-existing paths rather than assuming the current local count.

The Prisma seed uses idempotent upserts by slug and does not reset operator-edited descriptive fields on ordinary reruns unless the seed explicitly owns that field. Migration data is the compatibility guarantee; seed execution is not required to make an upgraded database valid.

Rollback during development removes only the new relation/catalog after proving no non-Intermediate program content was created. Production-style rollback will be forward-fix because dropping the program relation after new content exists would lose categorization.

## 6. Backend boundaries and API

Add a learner-facing `LearningProgramsModule` rather than widening progression or session-planning responsibilities. It owns catalog queries and availability policy. Curriculum services continue to own paths, levels and missions.

Add an authenticated learner endpoint:

```text
GET /api/v1/learning-programs
```

Response items are ordered by `displayOrder` and contain:

- `slug`, `name`, `description`, `learningGoal`, `proficiencyLabel`, `iconKey`.
- `availabilityStatus`.
- `isSelectable`, derived only from the closed status policy.
- Safe aggregate metadata such as published path/level counts; never learner-specific history.
- `destination`, returned only for selectable programs and restricted to a closed application route mapping.

The API must never accept a client-supplied destination URL. Unknown icon or status values fail server validation rather than being rendered as arbitrary content.

Expected errors follow the existing safe API contract:

- `401` for unauthenticated requests.
- `403` for unauthorized roles where applicable.
- `503 PROGRAM_CATALOG_UNAVAILABLE` only when the catalog cannot be loaded safely; internal database details stay redacted.

Admin path creation gains an optional `programId`/program selection. The new Admin UI sends it explicitly. During Phase 1, omitted program assignment defaults to the seeded Intermediate program so existing clients and tests remain compatible. Program metadata CRUD is not included.

## 7. Learner experience

Add authenticated route `/programs` with a responsive catalog of four semantic cards. Every card includes name, goal, proficiency orientation and a visible status. Availability must not be conveyed by color alone.

Behavior:

- Intermediate `AVAILABLE` opens `/dashboard` and uses the current workplace learning flow unchanged.
- A future `BETA` program is selectable but clearly labeled.
- Beginner and TOEIC show Coming soon and cannot navigate into an unfinished flow.
- IELTS shows In development and cannot navigate into an unfinished flow.
- Keyboard, screen-reader and pointer users receive the same status and action behavior.

Add a Programs link to the authenticated learner navigation and a discovery link on the dashboard. Preserve existing auth/onboarding redirects to `/dashboard`; changing the default entry point is deferred until program enrollment exists. Existing routes `/dashboard`, `/onboarding`, `/sessions/:id`, `/mastery` and `/settings/audio` remain valid.

The page uses the existing design system and responsive shell. Loading, empty and retryable error states are explicit. The frontend parses the response through a closed Zod schema and does not infer availability from labels.

## 8. Admin compatibility

The Admin curriculum tree exposes each path's program and allows selection from the existing catalog when creating a path. It does not add program creation, deletion, status editing or arbitrary icon management in Phase 1.

Existing Admin operations retain revision, idempotency, audit and archive behavior. A path cannot move between programs after it has published descendants or historical learner references; Phase 1 may treat program identity as immutable after path creation to avoid an unsafe partial policy.

Audit metadata for path creation includes only stable `programId`/slug identifiers and existing safe fields.

## 9. Backward compatibility

- Existing sessions remain bound to the same `LessonVersion` and plan snapshot.
- Existing attempts, mastery, Error Bank, engagement and analytics continue to resolve through unchanged IDs.
- Existing progression and `LearnerProfile.currentLevelCode` remain Intermediate-scoped in practice until program enrollment is introduced.
- Existing workplace copy remains on the Intermediate dashboard; only generic navigation/catalog copy is added.
- No external certificate is accepted as a substitute for internal assessment.
- No unavailable program can create a learner session.

## 10. Testing strategy

Development follows targeted test execution to keep feedback fast:

- Prisma/migration integration test: four rows exist, every old path is Intermediate, record IDs/counts and historical foreign keys are preserved, and rerun behavior is idempotent.
- API unit/integration tests: deterministic order, status-to-selectability mapping, `DISABLED` omission, safe aggregates, authentication and redacted failure.
- Admin contract tests: explicit program assignment plus omitted-field Intermediate fallback.
- Web component/client tests: closed schema, four cards, status text, enabled/disabled actions, loading/error states and keyboard semantics.
- Focused Playwright journey on desktop and mobile: catalog discovery, Intermediate navigation, unavailable IELTS/TOEIC/Beginner behavior, and existing dashboard/session URL regression.

During implementation, run only the affected test files/packages after each red-green cycle. Run the complete `pnpm verify` gate once the phase is functionally complete and immediately before final review/commit; rerun it only if final fixes invalidate that evidence.

## 11. Acceptance criteria

Phase 1 is accepted when:

1. A migrated database exposes exactly the four seeded program categories with the approved initial statuses.
2. All pre-existing path, lesson-version, session and attempt identifiers and relationships are preserved.
3. The learner sees an accessible responsive four-program catalog sourced from the API.
4. Only `AVAILABLE` and `BETA` programs are selectable; Intermediate reaches the existing dashboard.
5. Existing learner and Admin URLs continue to work.
6. Admin path creation remains backward compatible and assigns a valid program.
7. Targeted tests and the final `pnpm verify` pass.
8. No unresolved Critical or Important review finding remains.

## 12. Explicit non-goals

- IELTS curriculum content, band descriptors, scoring or mock exams.
- Generalized IELTS question-bank/activity schema.
- Per-program learner enrollment, active-program switching or program-specific progression.
- Program metadata CRUD, deletion or merchandising controls.
- Payment, subscriptions, cloud infrastructure or external certification verification.
- Rewriting the current Workplace English curriculum.

## 13. Next architectural increment

After Phase 1, Phase 2 can add `LearnerProgramEnrollment` and an active-program context before any learner enters IELTS content. The IELTS curriculum can then create one or more paths under the existing `ielts` program while reusing immutable lesson versions, session checkpoints, audio and Teacher AI. IELTS-specific activity contracts and band-oriented evidence should be designed as separate versioned capabilities rather than added to Phase 1.
