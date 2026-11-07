# R2.2 browser engineering verification

Status: TESTED / VERIFIED for the synthetic workflows below. AI_QUALIFIED: NOT_ESTABLISHED. HUMAN_VALIDATED: NOT_RUN.

## Environment and provenance

Executed 2026-11-07 with the actual Next.js application on 127.0.0.1:3002, NestJS on 127.0.0.1:4002 and the explicitly owned disposable PostgreSQL database on 127.0.0.1:55452/worklingo_r22. Credentials stayed in the existing temporary credential file and were not copied into this report. Foundation seed content, synthetic learner accounts and a local HTTP structured-output provider fixture were used. Every fixture assessment provider is marked synthetic. No production learner data or external paid provider calls were used.

Harness: `apps/api/test/integration/r22-browser-bootstrap.spec.ts`, explicitly excluded from normal Vitest. `vitest.r22.config.ts` selects it only with `WL_R22_BROWSER=1`. The bootstrap overrides the assessment provider through the real application dependency graph, uses the actual HTTP provider serializer and persists results through application services. This is an engineering fixture, not a benchmark of a real AI model. The long-running bootstrap's completion establishes clean lifecycle/shutdown, not scoring quality.

## Final browser command and results

`pnpm --filter @worklingo/web exec playwright test -c playwright.r22.config.ts`

Final run after restarting the API with the latest assessment fixes: **3 passed**, approximately 1.5 minutes. Desktop 1440×1000: 30.6s; mobile 390×844: 24.4s; tablet 768×1024: 28.3s. Reduced motion was enabled.

Each viewport registered a unique synthetic learner, completed onboarding, and submitted the real five-activity foundation session using the UI: two Writing responses, one Reading response, one Listening response, and one Speaking recording. The browser selected the published-audio preference; listening playback called the actual media element's `play()` and waited for `ended`. No injected media events were used in the final run. The seeded audio is a synthetic tone, so this does not validate listening comprehension against real speech. Speaking used Chromium's actual fake microphone device, MediaRecorder, consent checkbox, multipart upload and owner-scoped retained recording playback UI; it does not establish pronunciation quality.

The first persisted response of each skill was assessed through the learner UI. Reading, Listening and Writing returned synthetic 100/100 engineering fixtures. The final rerun additionally verified the corrected no-transcript recording policy: Speaking displayed **Not scored / Not scorable**, unknown confidence, and **Evidence needed** for all eight criteria. Every criterion level/raw score was null, the provider list was empty, and neither the UI nor public evidence contained upload mimeType metadata. No provider was called to grade upload JSON as speech. This retains a null total and avoids inventing linguistic or pronunciation evidence. Writing's UI Re-evaluate action appended a second result, and the actual history endpoint confirmed the previous-evaluation link. The admin view loaded authorized stored history and audit data after the synthetic account received its test-only CONTENT_ADMIN role in the owned database.

No page errors were observed. Automated horizontal-overflow checks passed for all four feedback views at all three widths. Light panel and full-page captures plus dark Writing panel captures were generated. Visual inspection included the mobile Speaking panel, desktop dark Writing history and tablet admin audit, plus the final corrected desktop Speaking panel: content remained within its container, scores/statuses were distinct, and long criterion/audit content remained readable through vertical scrolling. The admin provider-operations endpoint was not separately exercised in this browser run.

## Evidence files

Evidence root: `C:/Users/ASUS/AppData/Local/Temp/worklingo-r22-20261107/browser/`.

- `results.json`: final Playwright report.
- `{r22-desktop,r22-mobile,r22-tablet}-{writing,reading,listening,speaking}.png`: full learner pages (12).
- `{r22-desktop,r22-mobile,r22-tablet}-{writing,reading,listening,speaking}-panel.png`: feedback crops (12).
- `{r22-desktop,r22-mobile,r22-tablet}-writing-dark.png`: dark Writing history crops (3).
- `{r22-desktop,r22-mobile,r22-tablet}-admin.png`: authorized admin audit pages (3).

Total final screenshots: 30. Earlier failed traces exposed and preserved the Next source-export resolution problem before its correction; final results overwrite the active results.json with the passing run. Historical errors were not recast as successful AI calibration.

Five selected synthetic final screenshots are retained in this report's `evidence/` directory: desktop Writing dark history, mobile Speaking null-score criteria, tablet Listening feedback, desktop Reading feedback and tablet admin audit. The root agent independently inspected the final mobile Speaking panel. Full 30-image evidence and results.json remain in the temporary local directory above.

## Frontend race/recovery checks

Panel tests first reproduced the missing ability to cancel a slow initial POST and an obsolete action appearing after attempt change. The implementation now discovers pending runs by polling history while a POST is in flight, permits cancellation independently, locks duplicate actions, and fences obsolete action/history completions on cancellation, attempt change, refresh and unmount. A deferred history-poll test confirms a late EVALUATING response cannot replace CANCELLED. An initial history failure disables new evaluation until trusted history is loaded. Client network retry tests confirm reuse of an unresolved idempotency key. The scoped panel/shell/client verification passed 43 tests before the final browser pass; independent whole-branch verification remains the release gate.

Both API4002 and Next3002 processes were stopped after the final screenshots to permit a clean production build. The disposable database was preserved for the root agent's remaining gates. No commits or deployment were performed by this workstream.
