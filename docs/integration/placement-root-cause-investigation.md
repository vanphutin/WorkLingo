# GR-PLACEMENT-001: demonstrated harness eligibility assumption

Start: clean integration/worklingo-release-candidate `010f31d5262bfbc80d71b302b43a7940a66ba5fe`, D:/Projects/WorkLingo-Integration. Previous qualified test source ef27185. Main7a5e383 and Liquid Glasscc09a75 remain protected. Old full failure logs,582 historical artifacts and481 recovery artifacts are immutable.

## Reproduction and actual cause

The original placement test asserted that `runner.runOnce()` must immediately return true after recording202. `JobRunnerService.runOnce(now = new Date())` passes that captured instant to `JobsService.claimNext`. The query requires PENDING/RETRY_WAIT with `availableAt <= now` and `attemptCount < maxAttempts`, or RUNNING with `leaseExpiresAt <= now`; it uses FOR UPDATE SKIP LOCKED. It may legitimately return false if nothing is eligible.

The first bounded four-cell matrix reproduced19 failed placement journeys in the failure-only parallel child. All19 failed at the first speaking claim, as in the historical error. Each retained trace shows one TRANSCRIBE_SPEECH row PENDING, attemptCount0, maxAttempts3, leaseOwner null, and availableAt later than the exact supplied claim time:18 cases by1ms, one by2ms. `dueAtCapturedNow=false`, no claim/attempt was created, and the post-claim observation recorded no granted competing queue locks. Example: captured19:39:34.101Z, availableAt19:39:34.102000, null claim returned19:39:34.104Z. Captured now remains fixed while SQL executes; a job becoming due later does not change that argument.

This establishes a **test harness bug triggered by environment-dependent timing**: the test assumed that a host wall-clock instant after HTTP202 must already be at/after a persisted queue timestamp. It does not establish a product ownership/race defect. Returning false before eligibility is correct. The timer-based product worker may try on its subsequent poll; its polling, lease, retry and deadline behavior are unchanged.

The schema/migration declares availableAt TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP; enqueue does not explicitly supply it. Sixty-four independent bounded send/receive clock samples on the fixed matrix record PostgreSQL clock values3.313–4.772ms beyond the host receive Date value. These measurements characterize the current host/DB clock domains and millisecond precision. They do not establish an NTP cause, a precise drift history, or which precision mechanism produced every individual timestamp. No clock correction or timestamp tolerance was added to product code.

**Historical limitation:** the destroyed historical database has no job/clock/lock snapshot. Its exact state cannot be reconstructed. The same assertion/site and future-eligibility failure have now been reproduced naturally and deterministically, and the unsafe test assumption is removed. This is not retrospective proof of every detail of the old event.

## Alternative hypotheses and controls

| Hypothesis | Evidence and practical limit |
| --- | --- |
| Uncommitted transaction | RecordingsService awaits the transaction containing recording/attempt, enqueue and advanceSubmittedActivity before returning202. TranscribeSpeechHandler awaits its transaction enqueueing EVALUATE_ATTEMPT. A new two-client promise-barrier test proves invisible-before-commit, claimable-after-commit behavior; cleanup awaits the transaction even on failed assertions. Natural failed rows were committed/visible after claim. No visibility defect reproduced. |
| SKIP LOCKED contention | Existing two-client held-row control shows a granted competing lock, due PENDING row, zero waiters and null claim; release allows claim. Zero waiting locks alone never rules out contention. Natural failing rows were already ineligible under captured now; their later empty lock observations are not an atomic historical lock trace. |
| Worker race / ownership | Vitest forces workerEnabled=false; helper additionally asserts the actual injected JOB_RUNNER_OPTIONS.enabled=false. Unique UUID schemas per context/process prevent cross-worker ownership. Existing competing claimant, lease expiry, stale completion, retry and manual retry assertions remain. |
| Setup / cleanup / data readiness | Awaited migrations, curriculum seeds and resetLearners; job deletion precedes user deletion, app closes before its unique schema is dropped. Parallel processes share only the owned disposable PG server. No learner/schema is shared. |
| Deadline/time behavior | There is no generic Job deadline field. Actual fields here are availableAt and leaseExpiresAt; attemptCount/maxAttempts determine eligibility/expiry. No invented schema field or IELTS deadline change. |

## TDD fix and assertion strength

The controlled regression creates a real queued job, freezes only host Date at job.availableAt minus1ms, and calls the real runner. Negative control requires false and zero JobAttempt rows. The old helper's default-time run then fails its true assertion (retained clock-regression-red). The one-line fix passes the persisted availableAt explicitly to runOnce. This supplies a logical test instant at the inclusive eligibility boundary, rather than asserting wall-clock immediacy. No production class is mocked, slept, retried or changed.

`runPlacementJob` requires exactly one PENDING job of the expected type, attemptCount0 and no owner, then requires true and a terminal COMPLETED row with attemptCount1 and owner cleared. All recommendation, ordinary evidence isolation, progress and onboarding-block assertions remain. The new future-availability control separately proves null at minus1ms and success exactly at availableAt, preventing removal/loosening of the product due predicate from making the tests pass.

## Bounded matrix and provenance

Each primary matrix uses one owner-labelled localhost-only postgres17-alpine/tmpfs server, with unique schemas per Vitest process. Cells run sequentially, children within a cell concurrently. Thirty placement journeys per child, six placement children total:180 journeys/540 intended business claims. Two load children each run31 tests across six real queue/onboarding/IELTS integration files. Every child has its own log and wall/monotonic start/end interval; the load and placement process intervals overlap. This demonstrates overlap under integration load, not constant saturation during every placement claim.

- Before fix: single31/31; parallel43pass/19fail; single+load62/62; parallel+load93/93. All19 unexpected nulls retained. Total229pass/19fail, including six ordinary-learning cases and62 load tests.
- After fix: single32/32; parallel64/64; single+load63/63; parallel+load95/95. Total254/254, including180 complete journeys, six controlled clock cases, six ordinary-learning cases and62 load tests. Zero unexpected nulls; intentional clock negative controls remain false.
- Focused real PostgreSQL placement/worker suite15/15. Controlled clock RED1fail (other two excluded by name filter, not release skips) → GREEN. API lint and typecheck exit0.
- Reviewer-driven launcher preservation/deadline fixes receive their own RED2/2fail → GREEN2/2pass Node tests. An additional reviewed-launcher matrix is recorded separately; it does not replace either retained primary matrix.

Research invocations began at010f31d with uncommitted test variants. Their exact SHA manifests are retained, and reconstructed source variants are hash-checked before archival. The fixed app/test bytes match committed4577379. The final full backend run starts at4577379 with no subsequent apps/packages edits. Launcher-only review changes are distinct from the unchanged run-phase6-live.cjs full-suite harness. `qualification-input.json` proves that only two API integration specs differ from ef27185; all application runtime, frontend, contracts, migrations and package bytes match its seal.

Diagnostics `boundary`/`failure` measure the real claim with no diagnostic SQL before it. Observations are explicitly after-claim and non-atomic. `hostNow` is a legacy alias for the supplied runner instant, **not host wall time after the fix**; enteredAt/returnedAt are wall values (deliberately frozen within the clock control), claimDurationNs uses monotonic time. Minor deferred: unused legacy `true` mode records timing before its actual claim, so its timing fields must not be used for durations. Neither primary matrix uses that mode. No payloads, credentials or real learner content are recorded.

Full qualification, final readiness and the twelve-point handoff are in placement-root-cause-report.md after all gates finish. A PASS of this investigation does not authorize merge, push or deploy.
