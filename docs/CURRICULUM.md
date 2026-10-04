# Curriculum — Foundation seed

Task 4 adds the first provider-free curriculum under `English for Work` →
`FOUNDATION_1` (Pre-A1) → `Introduce yourself to a new colleague`.

The sample lesson includes a welcome email, a desk conversation, one Word Bank,
four Language Blocks, and five activities covering all four skills. Questions
include purpose, next action, and inference, with answers, explanations, and
evidence. The final writing task reuses the same phrases in a project chat.
This is development seed content; teaching quality and lesson workload still
need product review before a learner pilot.

## Local commands

From the worktree root, with local PostgreSQL running and `DATABASE_URL` set:

```powershell
pnpm --filter @worklingo/api prisma migrate deploy
pnpm --filter @worklingo/api db:seed
pnpm --filter @worklingo/api db:seed
pnpm --filter @worklingo/api test -- curriculum-seed.integration.spec.ts
```

The Prisma CLI also loads `apps/api/.env` when present. Use the local connection
settings in `.env.example`; keep credentials outside version control.

## Content and version rules

- Seed keys are stable slugs. Reruns preserve the UUIDs created on first insert.
- Seed writes are transactional and serialized by a PostgreSQL advisory lock.
- Reusing a level, mission, or Language Block key with a different parent raises
  a conflict and rolls back the seed transaction.
- An existing version with a different source hash causes a conflict. Increment
  the lesson version instead of overwriting published content.
- `LessonVersion.parsedContent` is a validated snapshot of content, activities,
  and the Word Bank/Language Blocks as they existed at publication.
- Shared Word Banks may evolve without changing a published lesson's snapshot.
- PostgreSQL triggers reject updates/deletes of published versions and
  inserts/updates/deletes of their direct content, activities, and bank links.
- Mission–lesson and lesson-version–Word-Bank links support reuse.

`CurriculumService.getPublishedMissionForLevel(levelCode)` selects the first
published mission with published content on a published path, then its first
eligible lesson and latest published version. Missing content returns a typed
not-found error. Before returning a version, the service verifies its snapshot
matches the owned content/activity rows and Word Bank links; inconsistent
published data returns a conflict. `updateLessonVersion` supports a validated title edit on drafts
only; it updates both the title and snapshot and guards against concurrent edits.
Admin HTTP endpoints and full lesson editing belong to a later increment.

The application contract includes answer specifications for evaluation. Future
learner endpoints must project learner-safe fields and omit answers until submission.

## Current limits

Listening uses an explicit `textPlaceholder` contract; there is no playable
audio or TTS call yet. Speaking uses a shadowing prompt with a text placeholder
response; recording and Teacher AI arrive later. Session allocation, progress,
and actual spaced review are subsequent tasks, not capabilities of this seed.

The curriculum integration suite migrates a randomly named test schema from
scratch and removes only that schema afterward. It does not truncate learner
tables. `TEST_DATABASE_URL` can select another local test database.
