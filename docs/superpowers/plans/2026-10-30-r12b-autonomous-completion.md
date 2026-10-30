# Beginner R1.2b autonomous completion implementation plan

> **For agentic workers:** Use executing-plans for coordinator tasks and bounded independent implementers/reviewers for disjoint tasks. Track actual RED/GREEN, findings and commits in the final report.

**Goal:** Resolve all four known technical P2 findings and complete the remaining safe offline qualification/release preparation without inventing external evidence.
**Architecture:** Reuse existing Admin navigation/draft state and offline audio authority. Add finite evidence/audit artifacts and a successor-aware validator while preserving prior frozen records. No dependency, content, evaluator, provider transport or database change.
**Tech Stack:** Existing React/TypeScript/Vitest/RTL, Node tests/tsx, filesystem/hash primitives and mandate CLI.
**Spec:** Current owner mission WL-R12B-AUTONOMOUS-001, recorded in mandate/reports/2026-10-30-r12b-mission-authorization.md. This extends the canonical roadmap and qualification plans, without a new product backlog.

## Global constraints
- Baseline5b554e9 on codex/foundation-basic-readiness in the existing linked qualification worktree. Preserve unrelated main changes.
- Only exact successor paths; prior005scope and all historical governance/source/audio/goldens remain frozen. Register changes use the CLI.
- No .env/credentials, DB, live provider, OS/ACL, participant data, new dependency, infrastructure or readiness/release effects in this successor.
- Cap1.5InkPoints,USD0,20pilot/160total,all repeats/negatives,model/endpoint and existing learning thresholds unchanged.
- Safe no-env test configs only. No default API integration/E2E; Web uses envDir:false. Build only after inspecting safe configuration.
- Actual provider/privacy/phonetic/participant/power-loss evidence remains separate. Unknowns retain null/NEEDS_EVIDENCE.

## Review focus
- Dirty Foundation editor must block Path/Lesson/Unit switches when confirmation is canceled.
- Both validation and subsequent reload latency must preserve later raw/structured edits.
- Literal dollar replacement syntax must survive source patching without unrelated block changes.
- Verified audio authority must allow offline inspection while produce/prepare remain blocked and every write/network boundary stays untouched.
- Scoped LF/CRLF equivalence must reject any actual source mutation; successor allowlists must not retroactively broaden older authority.

## Task1: Admin draft preservation (agent web_p2)
Files: exact four Admin component/test paths plus new apps/web/vitest.qualification.config.ts in scope.
Consumes: AdminNavigationGuardProvider/useAdminCanNavigate and current Foundation editor registry. Produces: existing components with preserved public interfaces and later edits.
- [ ] Add behavior regressions for canceled/accepted internal switches with real child editor; literal `$&`, dollar-backtick, `$'`, `$$`; deferred validation/reload edits.
- [ ] Run focused Vitest with envDir:false and observe expected failures.
- [ ] Apply minimal shared-guard/callback/revision fixes; run focused and full safe Web tests, lint/typecheck.
- [ ] Independent review, resolve Important issues, coordinator explicit-file commit with mandate ID.

## Task2: Read-only audio verification (agent audio_qa)
Files: tools/beginner-pilot/audio-qualification.mjs and .test.mjs; technical QA JSON/MD reports in scope.
Consumes: current verified GateA/storage/content authority and immutable asset manifest. Produces: existing verify command with no writes, lock, credential requirement or transport.
- [ ] RED: verified authority can verify; produce/prepare denied; poison mutation/transport methods must never run during verification; stale hash/unsafe ACL still denied.
- [ ] Investigate pre-existing CONTENT_SOURCE_TRANSITION_INVALID against frozen beforeLF/afterLF, then add mutation and newline tests before any scoped correction.
- [ ] GREEN: mode-aware authority/read-only preflight, skip locks/manifest writes for verify; preserve every generation gate.
- [ ] Run full Node audio suite. Independently audit24WAV format/hash/binding/silence/clipping/duplicates and all82item states; no phonetic claim.
- [ ] Independent review then coordinator explicit-file commit.

## Task3: Cost/oracle and study preparation (agent cost_oracle, coordinator C)
Files: named provider cost JSON/MD,128row oracle proposal JSON,GateC readiness MD and final reports in scope. Existing source/serializer/goldens remain unchanged.
Consumes: buildGoldens/offlineAdapterProbe/current packet/source hashes. Produces: AI_PROPOSED_NOT_ADJUDICATED rows and separate conservative costs, no provider results.
- [ ] Measure all160actual serialized mock requests, phase input/output/overhead reservations, safe metadata-only minimization and budget lower bound. Label bytes versus exact tokens.
- [ ] Emit128source/bundle/case-bound proposals with facts,alternatives,rejection/injection rationale/confidence/references; unresolved scalar/phonetic/source ambiguities stay NEEDS_HUMAN.
- [ ] Check exact official pricing/privacy sources without credentials or generation; retain unverified endpoint retention/deletion/training explicitly.
- [ ] Prepare consent/eligibility/storage/timing/session/stop checklist using existing protocol; no real data storage or sessions.

## Task4: Reliability, governance, regression and audit (coordinator)
Files: qualification-runtime.test.ts, new autonomous-governance.test.ts, safe API regression config, release checklist and named final/audit/inventory reports in scope. Runtime implementation unchanged unless a separately reproduced defect requires a scope revision before editing.
- [ ] Verify baseline authority/hash ancestry and exact union of old plus successor paths without editing historical tests or frozen approvals.
- [ ] Exercise disk-full/fsync/interrupted append boundaries in existing disposable namespace; preserve fail-closed UNKNOWN consumption; no power-loss equivalence claimed.
- [ ] Inspect safe unit/contracts configurations; run explicit no-env API legacy/parser/privacy/planner/DTO/cache/contract suites plus Web suites and build/typecheck/lint as safe. DB integration remains blocked absent an approved disposable DB.
- [ ] Generate full per-commit table from Git with mandate/files/test/review/status evidence; inspect every commit/code path and unresolved P1/P2, no history rewrite or secret dumps.
- [ ] Independent final review of all new changes and critical evaluator/privacy/cache/parser/release boundaries. Resolve Important findings via RED/GREEN within scope; capture exact follow-up if needed.
- [ ] Validate register/protected hashes/diff, commit checkpoints; final report includes every workstream,commands/counts,limitations,costs and exact readiness.

## Dependency graph and terminal decision
Tasks1/2/3 proceed independently after exact successor authorization. Task4governance spans all; final review/regression follows their integration. Live pilot requires budget+privacy+frozen adjudication+safe runtime; real QA requires qualified reviewers; GateC requires approved study governance/consent/eligible adults. Release requires all12owner gates,concrete target and tested rollback. If any is absent,do not merge/push/deploy; choose RESULT B only when all autonomous engineering completes,otherwise RESULT C with precise root cause and recovery.

## Plan rulings
Owner explicitly supplies method/autonomy and asks not to wait for routine confirmation,overriding the skill's generic handoff confirmation. Reuse the existing linked checkout and installed dependencies;no reinstall or generic scratch directory. Technical report thresholds (silence/clipping) describe measurements only,not phonetic acceptance. Each agent owns only its named files;coordinator alone commits/registers lifecycle.
