# Increment 5A1 Demo — Learner Onboarding and Placement

## Scope

This local-first slice makes onboarding mandatory for new learners and supports two paths:

1. Self-select a published, playable Foundation level.
2. Complete a version-bound 45-minute workplace placement assessment covering reading, listening,
   speaking and writing, then explicitly confirm the recommendation.

Placement evidence is intentionally excluded from ordinary mastery, Error Bank, review scheduling and
progression. `workplace-placement-v1` is an uncalibrated local heuristic, not a CEFR, TOEIC or IELTS
claim. Human calibration is pending.

## Start locally

```powershell
pnpm setup:local
pnpm --filter @worklingo/api prisma migrate deploy
pnpm --filter @worklingo/api prisma db seed
pnpm dev
```

Open `http://127.0.0.1:3000/register`. Keep `JOB_WORKER_ENABLED=true` in the ignored `.env` so local
fake speaking/writing jobs can complete. No cloud provider or key is required.

## Demo A — Self-placement

1. Register a new learner and verify redirect to `/onboarding`.
2. Choose **Choose my starting level**, select an available level and confirm.
3. Verify redirect to `/dashboard`.
4. Return to `/onboarding`; a completed learner is redirected back to the dashboard.

Expected safety behavior: direct navigation to dashboard, mastery or ordinary session routes before
confirmation returns the pending learner to onboarding. Repeating the same confirmation UUID is safe.

## Demo B — Placement assessment

1. Register another learner, choose **Take a placement assessment**, then start.
2. Complete one activity, reload the page and verify the persisted checkpoint is restored.
3. Finish reading, listening, speaking and writing. Recording requires explicit consent.
4. Follow **Review assessment status**. While jobs are active, the page shows that Teacher AI is
   processing and that leaving is safe. Retry appears only for a terminal retryable failure.
5. Review the four separate skill results and policy explanation, then confirm the recommended level.
6. Open `/mastery` and verify placement-only skills remain **Unassessed**.

The session keeps the `LessonVersion` selected at creation even if an Admin publishes newer content.
Refreshing `/onboarding` reconciles the attempt so a completed session cannot incorrectly return to
the resume step.

## Demo C — Weekly engagement, target adjustment, and progress evidence (Increment 5A2)

1. Navigate to `/dashboard` after completing onboarding.
2. Verify the **Weekly Consistency & Progress** panel displays:
   - This Week: `0 of 3 learning days` (or chosen target).
   - Consistency: `0-week consistency` (neutral language, never guilt or punitive phrasing).
   - Weekly learning target selector with choices 2, 3, 4, 5.
   - Evidence of Progress: 4 skills (Reading, Listening, Speaking, Writing) each displaying `Insufficient evidence` with `0 recent samples`. Placement attempts are strictly excluded.
3. Change weekly learning target before completing any study days in the current week:
   - Target changes immediately (e.g. from 3 to 4) and displays `0 of 4 learning days`.
4. Complete an ordinary 60-minute session.
5. Return to `/dashboard`:
   - This Week displays `1 of 4 learning days`.
   - Evidence of Progress updates to show 1 session and 1 distinct study day.
6. Change weekly learning target after completing a study day:
   - Current week target is protected and remains 4 days.
   - An informative notice appears: `Target will update to 2 days next week`.

## Automated acceptance

```powershell
$env:TEST_DATABASE_URL='postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo'
pnpm --filter @worklingo/web exec playwright test e2e/onboarding-placement.spec.ts
pnpm --filter @worklingo/web exec playwright test e2e/engagement-progress.spec.ts
pnpm verify
```

Playwright uses an isolated PostgreSQL schema and temporary local data directory. It covers desktop
and mobile, keyboard activation, 44px controls, route guards, refresh/resume, deterministic fake
provider retries, confirmation, placement/mastery isolation, weekly mission projections, target protection, and evidence windows.

## Weekly semantics, timezones, and evidence policies

- **Timezone & Week Bounds:** Determined deterministically using learner profile timezone (`Asia/Ho_Chi_Minh` default), with Monday-start calendar weeks (`YYYY-MM-DD`).
- **Target Timing:** Profile target modifications apply immediately if 0 study days have been recorded in the active week. Once study has commenced in the active week, the current week target is locked and changes take effect the following Monday.
- **Evidence Comparison Windows:** Compares two 28-day windows (recent 28 days vs preceding 28 days). Requires a minimum of 2 evaluated samples per skill; otherwise honest `Insufficient evidence` is displayed.
- **Placement Exclusion:** Placement sessions and attempts (`purpose = 'PLACEMENT'`) are strictly excluded from ordinary mastery, review scheduling, study days, consistency streaks, and progress evidence.

## Recovery and limitations

- Network uncertainty: retry with the same client UUID; do not generate a new UUID until a definitive
  409 or successful response establishes the outcome.
- Provider delay: leave and return later; session and jobs are durable in PostgreSQL.
- Terminal evaluation failure: use the exposed retry action only while source recording is retained.
- Missing placement content: reseed locally or publish a complete `PLACEMENT` mission; the server does
  not fabricate activities.
- Human calibration and live-provider calibration remain required before pilot or proficiency claims.
- Non-certification: Progress evidence and consistency streaks represent supportive formative engagement, not certified proficiency claims (CEFR/IELTS/TOEIC). Local clock control is used only in isolated automated tests and never exposed via production endpoints.
