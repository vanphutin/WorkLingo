# Beginner R2.1 final acceptance

Date: 2026-11-07. Mission: Beginner / Nền tảng / Pre-A1–A2 publication and learner activation in the existing R2 platform.

## Readiness decision

| State | Result | Evidence boundary |
|---|---|---|
| Engineering Complete | PASS | Implemented integration, isolated database/browser verification, independent review and verified remote implementation receipt |
| Catalog Published | PASS | Official immutable primary release `aec36350-0b9f-426a-8e87-4d4033dfdb5c`, BETA |
| Learner Available | PASS for supported Beta practice | Synthetic full eight-lesson API/browser journeys and primary runtime smoke |
| Production Qualified | NEEDS_EXTERNAL_EVIDENCE | No production deployment or human/content/grading qualification asserted |

Speaking and writing persist as unscored SUBMITTED responses with null scores. Completion represents activity completion, not demonstrated proficiency. Historical automatic-grading REVISE remains REVISE; all 297 historical qualification decisions remain historical. No paid or external provider requests were used.

## Implemented result

The bounded operator importer validates exact sources, selected offline audio, vocabulary evidence, database/storage identity, backup and reviewed dry-run. It invokes official authoring, curriculum and immutable ProgramVersion services inside one transaction. Its content-addressed audio recovery and persisted receipt support safe retry and idempotent replay.

Beginner access now requires a valid authored published snapshot and exact curriculum pins. Merely changing catalog status cannot grant access. Existing account checks, enrollment ownership, immutable release pinning and unrelated reserved-program restrictions remain. The learner catalog uses actual snapshot counts/objectives and the R2 enrollment POST. Existing dashboard, roadmap, sessions, review and progression work with the same release. No parallel curriculum or progression system was added.

Primary publication used a verified backup, restored recovery test, three existing additive migrations, dry-run, bounded apply, replay and exact readback. No new migration or dependency was added. The vocabulary master fingerprint remained identical across admission; existing learner records were preserved. Onboarding prerequisites were then added through existing seed functions without admin-password or IELTS/placement seeding. The primary runtime at `D:/Projects/WorkLingo` uses explicit local fake providers with its worker disabled; these process overrides do not change the user's `.env`.

## Acceptance checklist

| Requirement | Result | Evidence |
|---|---|---|
| Authoritative source and eight reconciled lessons | PASS | Source/bundle/hash matrix in source reconciliation |
| 64 activities / 32 objectives | PASS | Source inventory, primary exact readback and full journeys |
| 41 lexical blocks | PASS with explicit exceptions | 20 contextual exact matches; 13 component-only and 8 missing phrase exceptions; original CEFR/provenance preserved |
| 24 scripts and WAV bindings | PASS for integrity/retrieval | Physical SHA-256 checks and browser metadata decode; no subjective audio-quality claim |
| Official Program, ProgramVersion and hierarchy | PASS | Beginner → mat-goc → MG_F0 → ordered MG01/MG02, four lessons each |
| Immutable official publication | PASS | Primary release, immutability tests and idempotent replay |
| Correct access policy and catalog metadata | PASS | Release-aware policy tests, component tests, API/browser catalog |
| Enrollment and exact version pinning | PASS | Authenticated enrollment, replay and release assertions |
| All eight lessons / activity persistence | PASS | 64 initial attempts; completed review gives 72 attempts in API run |
| Safe writing/speaking handling | PASS in unscored Beta mode | 16 initial productive submissions, null scores; no evaluation/STT jobs |
| Roadmap, refresh, resume and completion | PASS | Browser checkpoints, eight completed lessons and 100% activity completion |
| Review | PASS | Ninth API session, eight reviews and review iteration SCHEDULED/COMPLETED events |
| R2, legacy, IELTS, placement regression | PASS within executed suites | Results below; no claim of unexecuted provider qualification |
| Independent engineering review | PASS | No unresolved confirmed Critical/Important findings after two P2 fixes |
| Commit audit / merge / remote / final reports | PASS for implementation; reports included in this commit | Remote main read back at `d34d1edce69edb6c2d93cd3eef9af48a1b93fa83`; companion commit audit records the receipt |

## Executed verification

Commands below run from the repository unless another working directory is stated. Private database URLs were supplied through environment/local files and are intentionally omitted. Isolated configurations prevent shared `.env` database/provider fallback.

| Check | Command / configuration | Actual result |
|---|---|---|
| Full web unit/component | `pnpm --filter @worklingo/web exec vitest run --maxWorkers=2` | PASS: 160 files, 985 tests, 611.63s |
| Backend R2 | API cwd: `pnpm exec vitest run -c vitest.r2.config.ts --exclude src/teacher-ai/application/beginner-evaluator-context.spec.ts` | PASS: 186 files, 1,230 tests, 1085.02s |
| Dedicated strict evaluator context | API cwd: `pnpm exec vitest run -c vitest.beginner-evaluator-context.config.ts` | PASS: 2 files, 60 tests, network-denied setup |
| Legacy / IELTS | API cwd: `pnpm exec vitest run -c vitest.r2-legacy.config.ts` | PASS: 6 files, 30 tests |
| Placement/onboarding | Isolated `placement.config.mts` under local evidence directory | PASS: 4 files, 20 tests |
| Contracts | `pnpm --filter @worklingo/contracts test` | PASS: 35 files, 178 tests |
| Final catalog/dashboard/vocabulary delta | Focused three-file backend run | PASS: 3 files, 21 tests |
| Final source/audio/vocabulary/release check | Focused four-file backend run after test hygiene | PASS: 4 files, 22 tests; full API typecheck also PASS |
| Post-merge main verification | Five-file source/audio/vocabulary/release/access run in `D:/Projects/WorkLingo` | PASS: 5 files, 24 tests, 16.21s |
| Fresh restored DB import | `r21-beginner-import.integration.spec.ts` on owned port55451 clone | PASS: 1 test; zero-write dry-run, tamper rejection, rollback, recovery, replay, immutability and preservation |
| Actual isolated API journey | Local `api-journey-final-command.ps1` / no-env config, owned port55450 clone | PASS: 1 test, 156.06s; 8 lessons, 24 audio, 64 initial attempts and persisted review |
| Actual browser journeys | `pnpm --filter @worklingo/web exec playwright test -c playwright.r21.config.ts`; sequential tablet rerun | PASS at desktop1440×1000, mobile390×844 and tablet768×1024 in separately recorded runs |
| Accessibility/UI checks | Browser keyboard/focus, pause/resume, EN/VI, themes, reduced motion, overflow | PASS for exercised assertions; screen-reader speech and measured contrast NOT_RUN |
| API/web build, lint and type checks | Package build/lint/typecheck commands; operator CLI scoped ESLint | PASS; API final test-only annotations typechecked separately |
| Localization / mandate / whitespace | `pnpm i18n:check`, `pnpm mandate:check`, `git diff --check` | PASS: 45 namespaces/3059 paired keys/0 errors; 35 valid mandates; no whitespace errors |

Local raw logs are under `%TEMP%/worklingo-r21-20261107/`; browser evidence and reproduction details are in the learner journey report. These temporary files are not an immutable shared archive. Selected synthetic screenshots are committed under `docs/qualification/evidence/r21/`.

Git implementation receipt: normal push `d3392a4..d34d1ed` to the configured GitHub remote succeeded; `git ls-remote origin refs/heads/main` equaled local main at `d34d1edce69edb6c2d93cd3eef9af48a1b93fa83`. All eight reports and selected screenshots are included in this evidence commit, which follows that implementation receipt. Its own content-addressed commit ID cannot be embedded in itself; the final delivery records the subsequently verified final remote HEAD.

Earlier failures were investigated and retained: stale frontend enrollment expectation, an asynchronous admin test action, incorrect API audio-storage test setup, local browser request resets and test-output coordination. The final web/API runs passed after the documented corrections. No tests were weakened to permit an invalid product response. There was no single final three-viewport green browser invocation; desktop/mobile passed together and tablet passed sequentially afterward.

## Remaining qualification restrictions

- Production deployment: NOT_RUN. No independently verified production target/configuration/operational rollback and health-check evidence was established in this mission.
- Human expert and real-learner validation: NEEDS_EXTERNAL_EVIDENCE. Every journey here is synthetic; technical review is explicitly AI review.
- Automatic productive grading/pronunciation quality: REVISE / NOT_QUALIFIED. The supported release is transparent text-based unscored Beta practice.
- Audio: exact scripts/checksums, retrieval and browser metadata decode passed; full-duration listening and subjective sound quality were not assessed.
- Frozen MG02-L2 control bundle: the known historical digest was checked; independent reconstruction of the original bundle artifact was not performed. Exact lesson source, scripts and selected WAVs were checked separately.
- Inherited reading UI still shows an empty Teacher AI feedback panel. It does not schedule provider work. Productive activities show their unscored disclosure.

## Reports and recovery

1. [Source reconciliation](beginner-program-source-reconciliation.md)
2. [Vocabulary integration](beginner-vocabulary-integration-report.md)
3. [Publication, identities, preservation and recovery](beginner-program-publication-report.md)
4. [Access and assessment policy](beginner-access-policy-report.md)
5. [Synthetic learner journey and runtime smoke](beginner-learner-journey-report.md)
6. [Independent review](beginner-r21-independent-review.md)
7. This acceptance report
8. [Commit audit and Git receipt](beginner-r21-commit-audit.md)

Recovery must preserve subsequent learner history: stop the affected runtime, retain current storage/database and take a new backup, restore the verified pre-publication dump into a separate replacement database and verify it before any switch. Use official availability/lifecycle controls to withdraw new enrollment; do not delete immutable releases or truncate data. The pre-publication dump has 47 migrations and must be paired with appropriate schema/application handling. Backup SHA, restore evidence and content-storage recovery details are in the publication report.
