# W4 grouped comprehension authoring — execution evidence

Date: 2026-10-16 (Asia/Saigon)
Status: Bounded Format 1.2 authoring technically verified in isolated worktree after one independent review/fix pass. No whole-mandate completion, integration or release claim.
Mandate: MND-20261015-001, conditional approval scope recorded through CLI.
Execution checkout: C:/Users/ASUS/.codex/worktrees/intermediate-quality-baseline/WorkLingo.
BASE=HEAD: efa2fd99b5373a644a011af3787bf81f737a51a7. No commits/merge/push.

- [Design](../../docs/superpowers/specs/2026-10-16-intermediate-b1-content-authoring-design.md)
- [Execution plan](../../docs/superpowers/plans/2026-10-16-intermediate-grouped-authoring.md)
- [Master plan](../../docs/superpowers/plans/2026-10-16-intermediate-learning-quality.md)
- [AI content review](2026-10-16-intermediate-b1-content-review.md)
- [Readable content candidates](../../docs/content-drafts/2026-10-16-intermediate-b1-pilot.md)

## Implemented behavior

Format 1.2 supports 1–20 nested questions per comprehension activity, at most 200 per lesson. Question slugs are authored, unique across the lesson and stable when reordered. Questions include options/answers/explanations/exact bound-content evidence; optional objective references inherit from the activity. Cognition and answer entities are private editorial annotations, absent when unknown.

A separate version-specific parser handles nested grammar and source positions. Existing 1.0/1.1 branches remain. Syntax/semantic validation rejects mixed legacy MCQ fields, unknown/duplicate annotations, invalid labels/answers/refs/evidence, missing closures and out-of-parent questions. A missing item close recovers at the sibling/parent boundary rather than consuming the next activity.

Optional root pedagogy version 1 uses existing parsedContent JSON; no migration. Snapshot decoding enforces referential metadata/real skill coverage, item identity/bounds and a single provenance namespace. Publisher explicitly preserves metadata. Relational activity payloads stay the same; CurriculumService's parity checks remain effective. Learner questions contain only slug/prompt/options, retaining all items without adding private annotations.

No new executor is introduced. The synthetic fixture uses supported shadowing and four-skill execution; it is not the B1 content pack. The pack's productive speaking exercises remain non-importable until a separate supported mode/evaluation design is implemented. No catalogue/admission/planner/scoring/feedback/transcript policy changed.

## Verification recorded so far

| Check | Actual result |
| --- | --- |
| First content-format run | Expected new 1.2 tests RED; unsupported format, missing normalized draft/item range; legacy tests passed |
| Content-format final package | 81 PASS across 7 files after review fixes |
| Snapshot/publish/import/audio focused tests | 36 PASS across 4 files; the pre-implementation run had 13 expected failures from stripped/missing metadata |
| Curriculum roundtrip | New grouped fixture preview → FakeTts test artifact → idempotent publish → exact payload parity → CurriculumService readback PASS in disposable schema |
| Learner projection | 2 PASS: Reading and Listening keep both questions without private metadata |
| Reading UI | 1 PASS: two different selections retained and changing one does not erase the other |
| Whole-workspace typecheck | PASS after current code/tests |
| API/web production builds | PASS |
| Whole-workspace lint | PASS on final product code/tests |
| Root pnpm test | Exit 0: 1,378 PASS / 271 files (content-format81 + contracts87 + API840 + web370); final-root-tests.log |
| Final independent review | 0 Critical / 3 Important fixed RED→GREEN in one pass / 1 Minor deferred; no re-review |
| Mandate validate | valid=true, count=2 in both checkouts after W4 approval update |
| git diff --check | PASS; existing CRLF normalization notices only |

The initial projection test selected 45 minutes for a synthetic fixture whose Writing activity is Activate-only; the existing planner correctly reported only 60 available. The test was corrected to use 60; no planner change. An early typecheck found an unsafe readonly-to-mutable test cast; replaced it with payload narrowing. These are test construction corrections, not silently omitted product failures.

An extra literal `--` in task-done expanded a focused API invocation into the full API suite. After the already-green focused 36-test run, the redundant expansion was stopped and replaced by the required root pnpm test. The interrupted run is not claimed passing. Root completion will supply the final broad evidence.

Full logs/ledger are preserved in ignored `.superpowers/sdd/2026-10-16-intermediate-grouped-authoring/`. Final package file counts: content-format7 + contracts17 + API164 + web83 =271. The clean run has no failed/skipped tests; expected fault-injection error messages are covered negative-path tests. The earlier overlapping run's placement-isolation hook timeout is not hidden: it was rerun and passed in the clean suite. This report contains no environment secrets or raw learner records.

## Local preview requested by the user

Direct user request “chạy local lên” authorized starting the worktree application for inspection. A new schema `intermediate_preview_c552df5dccef44bba61b12f5be3d14d8` was created in the configured loopback database, migrated and seeded with existing synthetic curriculum. This is separate from public. Application storage is isolated under this plan's ignored local-preview-data directory. No candidate B1 lessons were imported or published.

- Web: http://127.0.0.1:3000
- API: http://127.0.0.1:4000
- Providers: fake STT/evaluation/TTS, routing/fallback disabled, external credentials absent from preview child environment.
- HTTP checks: web 200, API health 200 with database/storage up, Admin login through web proxy 200, Admin curriculum 200.
- Preview admin credentials are in the ignored local-preview-state.json and were delivered in chat; never copy that file into the repository/report.
- Windows helpers run hidden. Known launcher PIDs are recorded in the ignored state file; stop only that owned process tree when preview is no longer wanted.

Startup first failed because OpenAI key was blanked while its inherited model/base URL remained set. The preview wrapper now clears all three together; the original .env is unchanged. No application policy or credential file was edited to fix it.

## Rulings and limitations

1. Reuse existing managed detached worktree/dependencies and W3 baseline. Cost if wrong: environment drift; caught by final checks.
2. No commits/integration and no cleanup of uncommitted evidence. Cost: no Git savepoint until authorized integration.
3. User selected AI review; record provisional AI self-review rather than invent human expertise. Cost: undetected pedagogy issues; content remains unpublished.
4. The accidental broad API invocation was first retained for verification, then stopped as redundant and replaced by root tests. Cost: extra test time already spent; no success inferred from interrupted run.
5. Independent Task 3 characterization proceeded while the redundant Task 2 expansion was running; final root tests cover the final tree. Cost: final verification must include new tests.
6. Fresh review started after code completion while broad verification runs, with pending checks disclosed. Cost: parent must evaluate findings against the final tree.
7. Native App open_in_codex returned queued for the local browser, so HTTP reachability is verified but no claim is made that the user's tab visibly opened.

Final reviewer findings, declined-to-judge rulings and mutation evidence are recorded below. No calibrated timing, audio quality, free-speaking, independent assessment, admission, public migration or pilot claim follows from authoring tests. AI content review is separately recorded and provisional.


## Final independent review and one fix pass

Fresh reviewer: w4_authoring_final_review (gpt-6-astra/high). Read-only working-tree review of explicit 1.2 file list, tests first, five axes. No Critical; 3 Important; 1 Minor. No re-review dispatched.

1. Missing pronunciation/grammar/examples passed source validation but failed snapshot publication. Reproduced with three source tests and three source-before-snapshot tests, all RED. Shared publication-language-block validator now serves 1.1 and 1.2; all GREEN.
2. Comprehension rubric normalized into responseRubrics but snapshot rejected it. New test RED → source rejects this inappropriate field; GREEN, no silent dropping.
3. Repeated shared script/speaker/content text/type/word-bank title and second LESSON could overwrite source in 1.2. Six tests RED → version-gated duplicate tracking GREEN. Existing legacy parsing checks remain GREEN.

Focused fix evidence: content-format81/81 PASS; snapshot16/16 PASS. Mutation experiment inverted the comprehension-rubric presence check: 4 tests failed /77 passed, proving detection; exact original bytes restored. The final unique-log root suite exited0 with all1,378 tests passing after the fixes.

**Deferred Minor:** synthetic grouped fixture repeats the semantic question body. Future test improvement should use different answer indexes/evidence and assert full payload after reorder. Cost: current grouping tests could miss a copy of one item's semantic fields into another; this does not turn a failing implementation into approved content. It was not modified during the Important-only fix pass.

### Every reviewer exclusion ruled on

1. CEFR/B1 certification and candidate lesson quality are outside engineering review; retain user-selected provisional AI content review and unpublished status — cost: content may still need revision based on learner evidence.
2. Assessment independence/transcript/feedback/retry/mastery policy stays unchanged; DTO tests prevent new metadata disclosure but do not certify independent listening — cost: existing supported practice cannot be relabelled independent.
3. Free speaking remains unsupported in this slice; candidate transfer prompts stay review exercises — cost: full B1 candidates cannot yet execute as intended.
4. Duration sufficiency/real workload remain unknown; grouping proves item preservation, not minutes or pedagogy — cost: workload calibration still needed.
5. Catalogue/admission/provider/publication/rollout gates stand; local preview is isolated and synthetic per user request — cost: authoring readiness is not learner rollout readiness.
6. Unrelated W0/W3 code excluded from fresh 1.2 review; retain prior review evidence and include it in final root regression — cost: this reviewer supplies no new independent W0/W3 assurance.
7. Strict duplicate handling is version-gated to 1.2; legacy 1.0/1.1 semantics stay unchanged — cost: legacy permissive syntax remains.
8. LESSON closing tag stays optional per existing grammar; duplicate singleton is now rejected for 1.2 — cost: compatibility keeps optional close.
9. Evidence/cognition/objective annotations are structural author assertions, not semantic truth; AI review is separate and provisional — cost: editorial mistakes may remain.
10. Reviewer did not judge full-suite results, mutation sensitivity, live preview or performance benchmarks; parent runs full checks, killed a mutation and verified local HTTP; no load benchmark claim — cost: production-scale performance unmeasured.


## Final handoff details

The interrupted shell wrappers left a pnpm test subtree alive on Windows; two runs contended and collided on a log. Only the exact identified owned test subtrees were terminated. Their log/completion is invalidated in the ledger; the unique final-root-tests.log and exit0 establish the final result. A process-tree cleanup also interrupted preview unexpectedly; it was restarted using the same isolated schema/credentials and login/Admin curriculum rechecked at200. The final preview launchers are retained; no further test process cleanup is performed.

Read-only public verification after preview:37 base tables,16 applied migrations, no public LearningProgram — same legacy state as W0. No public schema migration/backfill was run. Preview remains in its own schema. Rollback/stop instructions use the ignored state file's exact current process identities; do not terminate broad Node/shell trees by stale PID ancestry.

The development server generated next-env.d.ts references to the isolated .next-e2e directory. Those generated-only lines were restored to HEAD after the build; a focused web typecheck verifies the restored declarations. No package/lockfile/generated build output is part of the change. No browser E2E is rerun for this slice: no product UI changed, grouped interaction is covered by RTL, API publish/ownership by integration and live local health/login checks. W3's earlier browser evidence remains in its own report.

Scope decisions and all review exclusions above remain binding; deferred Minor is explicit. Worktree and ignored evidence are retained because code is uncommitted and the preview is running. No merge/push or whole-mandate lifecycle completion was performed.
