# Beginner learner journey qualification — R2.1

Full journeys executed 2026-11-07 against the owned restored synthetic clone. A separate bounded smoke test used the primary local runtime, as recorded below. This report records application behavior and activity completion; it does not establish external proficiency qualification or Production Qualified status.

## Scope and identities

- Browser web: `http://127.0.0.1:3001`; API: `http://127.0.0.1:4001`.
- Database boundary enforced by the browser test: `127.0.0.1:55450/worklingo_r21`, public schema only. Credentials remain in a local file/environment and are not included here.
- Published authored release exercised by the browser: `d17502e4-7f2d-49d0-a752-f3309eed270b`.
- Synthetic accounts use randomized `r21-browser-*` / `r21-focus-*` email addresses under `example.test`. The test reads exact persisted release/lesson snapshots to obtain test-only answer keys; learner API projections are not used as answer keys.
- The browser configuration has no global setup, teardown, migrations, schema reset, or database seeding. Browser setup and learner writes use authenticated application APIs. Prisma use in the browser test is read-only.
- Runtime provider configuration: language evaluation `fake`, speech recognition `fake`, TTS `fake-tts`, job worker disabled. Browser routing rejects external HTTP(S) destinations. Successful journey attachments record `external: []`.

## Actual browser results

| Viewport | Eight-lesson journey | Activity submissions | WAV checks | Run evidence |
| --- | --- | --- | --- | --- |
| Desktop 1440×1000 | Passed | 64 | 24 HTTP + browser metadata decode | Initial three-project run, 280,319 ms |
| Mobile 390×844 | Passed | 64 | 24 HTTP + browser metadata decode | Initial three-project run, 208,523 ms |
| Tablet 768×1024 | Passed on sequential rerun | 64 | 24 HTTP + browser metadata decode | Tablet rerun, 175,832 ms |

There was no single final all-three-project green invocation. The initial three-project invocation had two passes and one interrupted tablet result. The sequential tablet invocation passed both its full journey and its additional focus/pause/resume test (2 passed, 199,412 ms total).

Each full journey used the real catalog, opened native program details with the keyboard, checked the published counts (8 lessons, 64 activities), enrolled the authored Beginner release, opened Program progress, and started the server-recommended lesson through the UI. All eight lessons completed through browser radio/text inputs and Continue actions. Productive responses returned `evaluationStatus: submitted`, `score: null`, and displayed the unscored-practice disclosure; recording controls were absent. The test refreshed the first lesson and continued from the persisted checkpoint, checked the review section, and verified eight completed lessons and 100% activity completion through the authenticated progress API.

Every listening activity returned HTTP 200 with RIFF WAV bytes, a nonempty body, and an audio element that reached `readyState >= 1` after loading. This establishes retrieval and browser metadata decoding, not full-duration audible listening or a subjective sound-quality judgment.

Catalog light/dark screenshots, English-to-Vietnamese switching, `prefers-reduced-motion: reduce`, and document horizontal-overflow checks were exercised in all three viewports. Native details accepted Enter with focused summary. Separate keyboard/focus and UI pause/resume checks passed on desktop and mobile; the tablet version passed in its sequential rerun (18,301 ms). Pause disabled Continue, Resume restored the session, and Vietnamese controls remained usable.

## API integration evidence

The companion `apps/api/test/integration/r21-beginner-journey.integration.spec.ts` passed its final real isolated-application run on 2026-11-07 at 13:12:35 local time: one test, 156.06 seconds. The exact published clone release was `d17502e4-7f2d-49d0-a752-f3309eed270b`. Readback confirmed eight initial sessions, 64 persisted attempts, 24 audio HTTP 200 responses, and 16 productive submissions with null scores. A completed review added a ninth session and eight attempts: 72 total attempts, 18 unscored submissions, zero jobs, eight reviews, and SCHEDULED/COMPLETED events for review iteration 1. The test also exercised outsider privacy rejection and persisted checkpoints.

Final evidence is local under `%TEMP%/worklingo-r21-20261107/`: `api-journey-final.log`, `api-journey-final-command.ps1`, `api-journey-final.config.mts`, and `api-journey-final-readback.json`. The earlier `api-journey-wrong-storage.log` records ENOENT from an outdated storage directory. The successful rerun used the active API storage root `%TEMP%/worklingo-r21-integration-7oE0mP/data` via `WL_R21_TEST_DATA_DIR`; the isolated database boundary remained unchanged.

## Primary-runtime smoke

A bounded primary-runtime Playwright smoke passed on 2026-11-07 at 13:23 local time against web3000/API4000, exact published release `aec36350-0b9f-426a-8e87-4d4033dfdb5c`. A new synthetic learner displayed the Vietnamese default catalog, switched to English, opened the Beta details with 8 lessons and 64 activities, and enrolled the exact release (verified through its enrollment list). The real UI started the recommended MG01 L1 session, submitted three reading responses, and recovered checkpoint 1 after a refresh. The next listening activity returned HTTP 200 RIFF WAV bytes and reached browser audio metadata readiness.

The existing administrator authenticated through the local API, and the real release UI showed the exact published version with disabled authored fields. The curriculum builder opened through its link. Inspection made no admin content or lifecycle mutations. Admin UI was Vietnamese; an initial English-only version selector timed out and was corrected to match either locale. An earlier harness assertion incorrectly expected the lightweight program-context DTO to contain its release ID; the enrollment-list assertion corrected that test assumption.

Evidence is local under `%TEMP%/worklingo-r21-20261107/`: `main-runtime-smoke.json`, `main-smoke.cjs`, and separate `main-smoke-artifacts/` screenshots (default VI catalog, English catalog, listening, published admin release, and curriculum). The final synthetic enrollment is `daf372c2-caf6-42f0-bc7c-9a6fcfcabe25`; session `8e10da2a-bb95-41b9-abcf-18b181762d69`. This smoke supplements the full isolated journeys; it does not claim a full eight-lesson primary-database run.

## Failures, investigation, and fixes

1. The existing registration UI helper clicked a form before hydration and observed native GET submission to the local register page. Setup changed to the authorized register/onboarding APIs. Only synthetic credentials were involved; raw local traces are not published.
2. Early Turbopack sessions stayed on the learner loading screen. The server advertised localhost while the test used 127.0.0.1, and logs reported blocked HMR origin/handshake failures. Binding the test server to 127.0.0.1 removed those errors but did not immediately resolve loading. An authorized webpack restart, warmed compilation, and an explicit English account preference produced an interactive application. The evidence does not isolate which final factor resolved the loading symptom; no speculative production hydration fix was made.
3. The actual Beginner catalog action used the reserved-program legacy PUT activation route and received 409. A regression test first failed because enrollment was never called. The UI now uses POST enrollment for an authored Beginner release; all 13 catalog component tests passed afterward.
4. Initial test expectations used obsolete field/label names (`levels`, `Progress`, `Start`, `Session complete`). They were corrected to the actual API `eligibleLevels` and UI `Program progress`, `Start lesson`, `Session Completed!`; these were test defects.
5. An earlier desktop run reached seven lessons and then encountered local proxy/API `ECONNRESET`. A fresh frozen-runtime run passed desktop and mobile. The initial tablet run later encountered another request reset before the last lesson. It was rerun successfully; the failed result remains in `results-initial-3viewports.json`.
6. A concurrently launched focus run reused the Playwright output directory and caused tablet trace teardown ENOENT. This was a test-run coordination error. The tablet full journey and focus checks were rerun sequentially and passed. Concurrent invocations must use separate output directories.
7. Visual inspection found the catalog joining all 32 objectives into one very long goal paragraph. The backend projection now uses the first snapshot objective (description fallback) as the summary while retaining every objective in details. The service regression test failed before the change and all 11 service tests passed afterward. Desktop/mobile retained screenshots predate this readability refinement; final tablet screenshots include it.
8. The enrollment client regression expected Beginner to be rejected after the contract intentionally allowed it. The test now verifies a credentialed Beginner POST and rejects TOEIC before a POST; both client tests pass.

## Reproduction commands and environment

Run from repository root; provision/import the owned clone separately using the approved importer workflow. Do not point this harness at another database.

```powershell
$env:WORKLINGO_API_URL='http://127.0.0.1:4001'
$env:WORKLINGO_E2E_MODE='true'
# Run from apps/web for the existing isolated web runtime:
pnpm exec next dev --webpack -H 127.0.0.1 -p 3001

# From repository root, with the isolated API already running:
pnpm --filter @worklingo/web exec playwright test -c playwright.r21.config.ts
pnpm --filter @worklingo/web exec playwright test -c playwright.r21.config.ts --project=r21-tablet
pnpm --filter @worklingo/web exec playwright test -c playwright.r21.config.ts -g 'keyboard focus' --reporter=list
```

Optional portable inputs are `WL_R21_TEST_DATABASE_URL` (still checked against the exact clone boundary) and `WL_R21_BROWSER_EVIDENCE_DIR`. Defaults use the system temporary directory under `worklingo-r21-20261107/browser`; the database URL defaults to its sibling `test-database-url.txt`. No secret values belong in committed reports. Run invocations sequentially or supply distinct Playwright output directories.

Relevant local checks passed: 13 catalog tests, 85 focused session tests, 11 catalog-service tests, 2 enrollment-client tests, web/contracts type checking, scoped ESLint, localization checking, explicit TypeScript compilation of the new Playwright test/config, and `git diff --check`. A production web build also succeeded, but it was not used as this browser runtime and its default rewrite environment was not qualified for API4001.

## Retained evidence and limitations

Local raw evidence: `%TEMP%/worklingo-r21-20261107/browser/results-initial-3viewports.json`, `results.json` (final tablet), screenshots, and retained failure artifacts. These are local temporary files and may be cleaned by the operating system. Re-running Playwright can replace output artifacts. They are not an immutable shared archive; JSON attachments retain exact release/enrollment identifiers and submitted/audio counts. The three committed WebP copies below show only synthetic accounts and total 963,320 bytes.

- [Mobile catalog, light theme](evidence/r21/catalog-mobile.webp) — source `r21-mobile-catalog-light.png`.
- [Desktop completed program](evidence/r21/completed-desktop.webp) — source `r21-desktop-complete.png`.
- [Tablet Vietnamese session after pause/resume](evidence/r21/tablet-vietnamese.webp) — source `r21-tablet-pause-resume-vi.png`.

Inherited UI limitation: reading activities still show the empty Teacher AI feedback panel, although no provider work is scheduled. Speaking/writing correctly disclose unscored practice and suppress the empty grading expectation. Full-duration audio listening, screen-reader speech output, measured contrast ratios, real-provider quality, external proficiency qualification are outside the evidence claimed here.
