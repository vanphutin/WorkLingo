# R2 full platform — independent review record

Initial whole-branch review: d7a213e779c9fd4daac70e80f1e73ad545638833..70810ebd269284ece29b9287d1883ddd10f6be10. Final scoped re-review: 70810ebd269284ece29b9287d1883ddd10f6be10..2f139a2d59c4931f861a66c3584b0c4523f03c41. Retained verbatim reviewer outputs follow; initial findings are resolved only as stated in the subsequent scoped re-review.

## Initial whole-branch review

# Independent whole-branch review — 2026-11-01

Base d7a213e779c9fd4daac70e80f1e73ad545638833; head70810ebd269284ece29b9287d1883ddd10f6be10. Reviewer r2_full_branch_review; ReadyToMergeNo;0Critical/3Important/2Minor. No mutations/broad reruns byreviewer; actualhelpers exercised using syntheticinmemorydependencies, notHTTPqualification.

## Important findings (complete)

1. Publication accepts lessons authored learners cannot start. program-release-snapshot.ts:91 validates source IDs/objectives but not authored planner duration/requiredcoverage reachability. program-session-durations.ts:15 requires speaking+writing in everyrespondblock; supported legacy content may placewriting inactivate and speakinginrespond. Reviewer actualvalidateProgramSnapshot+foundationfixture withallwritingmovedtoactivate: publicationValidationPassedtrue,legacyPlayableDurations[60,90],authoredDurations[]. Immutableenrollableunstartablerelease. Fix shared actualplannercompatibility/publication validation: supportlayoutor rejectbeforepublicationactionably; HTTPregression publish→availability/start or actionablerejection.

2. Comprehension score qualified for unrelatedskilltags. program-progress.service.ts:155 determines qualification byactivityType then copies intoeveryactivity.skills. Supportedreadingtag['reading','speaking'] producesQUALIFIEDspeaking1 fromMCanswers despiteactualspeakingAI/PENDING. UIprogram-progress-view.tsx:22 andanalytics reportqualifiedspeaking. Probeactualevidenceadapter+pureprojection outputreading-derivedspeaking{sourceDETERMINISTIC,qualificationQUALIFIED,score1};actualspeaking{AI,PENDING,null};dimensionPENDINGscore1qualifiedAttempts1. Qualifyonlyactuallyassessedreading/listeningskill; additionalinstructionaltagsunqualified/pendingunlessindependentlyassessed. Preservecompletion. Actualadapter/HTTP+analyticsregressionmultiskillrequired.

3. Inactive currentlyselectedenrollment preventsnewselfenrollment. program-enrollments.service.ts:41 requirescurrent.statusACTIVE beforedifferenteligibleprogram. Probeactiveactor/onboarded/availablegenericB/noexistingB/currentrevision7,input7: allCOMPLETED/SUSPENDED/WITHDRAWN→409PROGRAM_CONTEXT_STALE. Refreshcannotfixmatchingrevision. Validatecurrentidentity/revisionindependentstatuswhenenteringdifferentB; preservetargetreactivationrestriction/actor/onboarding/locks/pins. HTTPregressionsall3statesandrealstalerevision.

## Minor findings (complete, nonblocking)

- E2Er2-full-learning-program-platform.spec.ts:165 stopsatpausedURL; extendactualResumebuttonandpersistedIN_PROGRESS+unchangedcheckpoint. ControllerCUAalreadyprovescurrentbehavior.
- Expecteduniterror/warningnoise in safe-exception.filter.spec.ts:202 andjob-runner.service.spec.ts:128; capture/assertexpectedemissions so unexpectedremainvisible. Notproductfailures.

## Review strengths/evidence

Databaseimmutablepublishedbindings/appendonlyhistory; authorizedtransactionalpinpreservingcommands; sessionownership+exactplan/evidencechecks; boundedaggregateanalytics; actualUI+retainedqualification evidence;15commitinventoryreviewed. RetainedAPI1154/web978/R2DB31logs+mixed-siblingmutation/CUAinspected. gitdiffcheckrangePASS,treeclean70810eb.

## Declined to judge — controller dispositions

All are accepted scope boundaries or limitations, not unresolved engineering promises: productiondeployment/livemigrationexcluded; realprovider/human/pronunciationqualificationdeferred; legalpermissionauthenticityuserattestedonly; freshprimarycontentsnotqueried; unchangedBeginner/IELTSnotexhaustivelyrerun(affectedseamsretainedregressions); productionscalelatencyunbenchmarked; fullWCAGcertificationnotclaimed; archivedhierarchyrollbackcreatesdraftsubjecttocurrentvalidation; newLEGACY_PIN_BACKFILLadmissiondisallowedwhileoldpinsretained. Finalreportmustpreservealllimitations.

Single complete fix wave and one scoped re-review next. No main integration before Important defects resolved.


## Single final scoped re-review

- **Important 1: Publication accepts lessons authored learners cannot start** - ADDRESSED. `apps/api/src/learning-programs/application/program-release-snapshot.ts:94` rejects an incompatible lesson before publication with HTTP 422, `PROGRAM_LESSON_UNPLAYABLE`, its exact lesson version, and corrective guidance. `apps/api/src/learning-programs/domain/program-session-durations.ts:15` executes the canonical pure planner with the authored productive-pair policy; `:28` advances the shortest supported plan until every pinned activity is covered or rejects a dead end. The same helper supplies learner availability at `apps/api/src/learning-programs/application/program-progress.service.ts:174`. The new HTTP cases at `apps/api/test/integration/r2-final-review-regressions.integration.spec.ts:43` reject both writing-in-activate and an unreachable reading activity in respond, assert no published release and unchanged development availability. The supported fixture at `:58` publishes, starts recommended sessions, submits actual answers, reaches completion and checks the exact covered activity set. Retained RED shows both unsupported layouts previously returned 200; GREEN shows all three publication/evidence regressions pass. This fixes the specified defect by rejecting unsupported authored layouts, without changing canonical Beginner/IELTS planning.

- **Important 2: Comprehension score qualifies unrelated skill tags** - ADDRESSED. `apps/api/src/learning-programs/application/program-progress.service.ts:156` requires `skill === activity.activityType` as well as verified comprehension evidence; `:157` emits PENDING/null for additional instructional tags while retaining their activity-completion evidence. Reading/speaking and listening/writing combinations are exercised through real submissions at `apps/api/test/integration/r2-final-review-regressions.integration.spec.ts:58`; learner checks at `:81` and persisted admin-analytics checks at `:87` require zero qualified productive attempts and null productive scores, while reading/listening remain scored and completion reaches 100%. Retained RED shows the original false speaking score/qualified attempt; GREEN and the full retained R2 run cover the amended adapter. EvaluationService is absent from the fix diff and remains unchanged.

- **Important 3: Inactive selected enrollment prevents new self-enrollment** - ADDRESSED. `apps/api/src/learning-programs/application/program-enrollments.service.ts:42` now checks current context existence/revision independently of the source enrollment status. Existing inactive destination protection at `:35`, learner locking/eligibility, release selection and pin-preserving assignment remain in place. `apps/api/test/integration/r2-platform-lifecycle.integration.spec.ts:51` covers COMPLETED, SUSPENDED and WITHDRAWN generic source programs; it checks stale-revision rejection, successful destination selection, stable receipt replay, increased context revision, exact destination pins, an unchanged source row and explicit reactivation required when returning to that inactive source. Retained mutation output restores the old ACTIVE guard and fails all three cases at the successful-selection assertion; exact restoration passes 3/3, and the retained full lifecycle run passes 16/16.

- **Minor 1: Resume E2E stops at paused URL navigation** - ADDRESSED. `apps/web/e2e/r2-full-learning-program-platform.spec.ts:166` checks paused state, `:168` clicks the actual Resume session button, `:169` polls persisted API state to `in_progress`, and `:171` compares the checkpoint, lesson version, curriculum revision and complete plan to the paused session. The retained final trace confirms successful click `pw:api@433`, POST `/learning-sessions/cd1e1d17-9eb1-4ca7-af2a-f7423c754337/resume` returning 200, successful polling `expect@434`, and successful pin/checkpoint assertion `expect@442`. Early poll samples remaining paused are normal retries; the final poll succeeds. The timestamped receipt and retained SQL output agree on session `cd1e1d17-9eb1-4ca7-af2a-f7423c754337`, IN_PROGRESS, checkpoint 0 and the same lesson/curriculum pins. The final browser log records 1/1 passing.

- **Minor 2: Expected unit error/warning noise** - NOT ADDRESSED, explicitly deferred and nonblocking. `apps/api/src/common/http/safe-exception.filter.spec.ts:206` still invokes the expected error without capturing that emission; `apps/api/src/jobs/application/job-runner.service.spec.ts:135` still exercises expected provider failure without capturing the warning. Neither file is modified by this fix range, and the retained API unit output still contains the expected error and PROVIDER_TIMEOUT/STORAGE_CLEANUP_FAILED warnings. `docs/qualification/r2-full-learning-program-platform-final-report.md:358` accurately records the deferral. This is test-output hygiene, not a product failure, and must not be reported as addressed.

### New Breakage in the Fix Diff

None found. Reviewed the supplied `70810ebd269284ece29b9287d1883ddd10f6be10..2f139a2d59c4931f861a66c3584b0c4523f03c41` package across correctness, readability, architecture, security and performance. The availability helper removes the approximate planner duplicate, progresses monotonically through a finite activity set, and performs no database writes or added queries. Actual authored session creation uses the same completion IDs and productive-pair setting; its curriculum path supplies no competing review priority. The qualification edit narrows assessed evidence without removing completion evidence. The enrollment edit removes only the inappropriate source-status gate. No dependency, schema, published-snapshot mutation, evaluator alteration or production action appears in the fix diff.

### Out-of-Scope Observations

None. No fresh whole-branch review was performed. Existing accepted limits remain limits: production deployment/live migration excluded; real-provider, human and pronunciation qualification deferred; vocabulary permission authenticity user-attested; primary content not freshly queried; affected legacy seams covered but Beginner/IELTS journeys not exhaustively rerun; production-scale latency unbenchmarked; full WCAG certification not claimed; archived-hierarchy rollback remains a draft subject to validation; new LEGACY_PIN_BACKFILL admission prohibited while existing pins remain. Existing historical progression evidence is not retroactively rewritten or requalified by this review.

### Verification Checks

- Read the binding re-review brief, all five original findings, full fix package, covering test bodies, implementation and immediate canonical-planner/session-creation context. Read retained raw outputs rather than accepting the implementer's resolution prose alone.
- Inspected retained publication/evidence RED (3 failures) and GREEN (3 passes), enrollment RED, strengthened mutation (3 failures, 13 excluded), restored focused GREEN (3 passes, 13 excluded), full lifecycle GREEN (16 passes), and full R2 integration output (9 files / 43 passes).
- Inspected the final browser receipt, trace directly in the ZIP without extraction, its successful resume response body, final browser log (1 pass), and retained disposable SQL read. The earlier browser casing failure is recorded separately and is not passed off as successful evidence. The old overwritten trace is not used as historical evidence.
- Inspected retained supporting results: API units 167 files / 1,154 passes; legacy integrations 6 files / 30 passes; evaluator 2 files / 60 passes; contracts 35 files / 176 passes; affected UI 14 files / 67 passes; API typecheck/build and scoped lint outputs; secret-scan result. Empty lint output is consistent with the implementer's stated successful exit, not an independently rerun lint claim. Full prior web/parser/workspace-build results remain historical, not fresh fix-head verification.
- Checked the no-env R2 configuration and named isolated endpoint guard by reading the file. Ran no tests, migrations, services, database queries, mutation experiments or Git commands during this re-review. Existing output answers the scoped doubts. Only this expressly requested review artifact was written; source checkout files, index, HEAD, service and database state were not changed.

### Verdict

**Fix round: Findings remain open - only Minor 2, expected logger-emission test hygiene, explicitly deferred/nonblocking.** All three Important findings and the Resume Minor are addressed. No new Critical, Important or Minor breakage found in the fix diff. **Ready for controller's normal integration gate: YES, with the single Minor deferral carried forward.** This verdict grants no production deployment, live migration, provider/human qualification or governance transition; the reviewer performed no integration/push.

### SKILL AUDIT

Used: `code-review-and-quality` -> tests-first five-axis review and verification of the verification story; supplied scoped re-review prompt -> per-finding verdicts, fix-diff boundary and output structure.

Verification: retained RED/GREEN/mutation logs, covering tests, source lines, browser trace/receipt and SQL receipt inspected as detailed above; no suite reruns. The explicit read-only brief takes precedence over the review skill's mutation experiment and the general verification skill's fresh-execution requirement. All test results in this report are attributed to retained runs, not new reviewer executions.

Not used: `using-superpowers` was read and explicitly excludes dispatched subagents; `verification-before-completion` was read but its fresh rerun requirement is displaced by the binding scoped-review instructions; `nestjs-expert` was read and declares implementation scope, so no unrelated implementation/lint/DI workflow was invoked. Git/worktree, brainstorming/planning/TDD, mandate management, frontend design and delegation workflows are outside this read-only review. Global/repository skill names and frontmatter and the environment's native/plugin catalog were inspected; no installations changed.
