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

## Automated acceptance

```powershell
$env:TEST_DATABASE_URL='postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo'
pnpm --filter @worklingo/web exec playwright test e2e/onboarding-placement.spec.ts
pnpm verify
```

Playwright uses an isolated PostgreSQL schema and temporary local data directory. It covers desktop
and mobile, keyboard activation, 44px controls, route guards, refresh/resume, deterministic fake
provider retries, confirmation and placement/mastery isolation.

## Recovery and limitations

- Network uncertainty: retry with the same client UUID; do not generate a new UUID until a definitive
  409 or successful response establishes the outcome.
- Provider delay: leave and return later; session and jobs are durable in PostgreSQL.
- Terminal evaluation failure: use the exposed retry action only while source recording is retained.
- Missing placement content: reseed locally or publish a complete `PLACEMENT` mission; the server does
  not fabricate activities.
- Human calibration and live-provider calibration remain required before pilot or proficiency claims.
