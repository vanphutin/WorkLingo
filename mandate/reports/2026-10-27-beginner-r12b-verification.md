# R1.2b offline authoring verification — MND-20261027-001

**Scope:** offline source authoring only under proposal `9f2501fa949171c990ac6ec90fdf4b3d243336b8aba66a8c619a977337a8a71a`. Matching human approval was recorded by Mandate CLI (triaged→approved→implementing) before source creation. Parent remains captured/approval=null; R1.2a MND-20261024-003 and main qualification MND-20261026-003 remain implementing. Nothing here resumes a DB run or approves media/publication.

## Verified authority

Pre-edit checks passed against the captured33 baseline paths,11 absent create paths, plan/review/scope hashes and exact allowlist fingerprint. Initial HEAD `76c5279463da021c50d53b684e0084f33c54e5b8` was a governance-only descendant of recorded baseline `613fcec48a2b40b3a3e720c6a57fc5b0534562b4`; existing linked worktree/branch reused. No dependencies installed or product/schema/config source modified. The frozen scope still contains preapproval null labels as historical proposal data; actual authority is the CLI-bound mandate approval and [human decision note](2026-10-27-beginner-r12b-human-approval.md), not a hand-edited scope.

## Actual outputs and checks

Eight original editorial sources now exist under `content/beginner/pilot/`; MG01-L1 was technically checked and committed before authoring the other seven. The [content dossier](../../docs/qualification/beginner-pilot-content-review.md) contains all8 source hashes, four-skill objective/evidence mappings,24 script slugs, proposed vocabulary, optional planned VP slots and human rehearsal protocol. WordBank definitions are deliberately reused within a Unit; assessed tasks have distinct authored data/context and were not cloned from synthetic fixtures.

| Check | Actual result |
|---|---|
| `pnpm --filter @worklingo/api exec tsx --test test/beginner-pilot/qualify-content.test.ts` | 16 PASS / 0 FAIL / 0 skipped after review corrections |
| `pnpm --filter @worklingo/api exec tsx test/beginner-pilot/qualify-content.ts --lesson mg01-l1` | PASS for the selected first source; full pilot intentionally incomplete at that checkpoint |
| `pnpm --filter @worklingo/api exec tsx test/beginner-pilot/qualify-content.ts --all` | All8 technical rows PASS;64 assessed activities,32 required objectives,24 scripts |
| `pnpm --filter @worklingo/content-format exec vitest run src/beginner-format.spec.ts src/foundation-format.spec.ts` | 25 PASS / 0 FAIL / 0 skipped |
| `pnpm --filter @worklingo/api exec vitest run --config vitest.beginner.config.ts src/learning-sessions/domain/beginner-session-planner.spec.ts src/learning-sessions/domain/learner-activity-projection.spec.ts src/teacher-ai/domain/beginner-rubrics.spec.ts` | 11 PASS / 0 FAIL / 0 skipped |
| API typecheck | PASS |
| ESLint on the2 approved checker files | PASS |
| Authored model output lengths and duplicate assessed-section scan | No model below authored minimum;0 identical assessed sections after removing editorial prefixes |
| Frozen source/plan/review boundary and document links | PASS;22 protected hashes unchanged,11 approved create paths present,4 links valid, proposal binding valid |
| Mandate CLI validate | PASS;11 valid records, independent mandate states preserved |
| Build / broader app or DB/E2E suites | NOT RUN; not required/permitted for the approved offline-only increment |
| Real audio / provider / DB / Admin API / import/publication | NOT RUN, prohibited by this scope |
| Human pedagogical review / actual rehearsal | NOT RUN / TIMING_NOT_VERIFIED |

TDD evidence: initial missing checker module was followed by a fail-closed temporary shell so the positive case failed an actual FAIL≠PASS assertion; the complete adapter then passed. Cross-phase transcript leakage reproduced PASS instead of required FAIL, then was corrected and passed. The real corpus test observed1/8 sources and failed before seven remaining sources were created, then passed8/8. No negative/red test or skipped case is counted as a passing acceptance result. The temporary shell was removed; no TODO scaffold is shipped. An initial transient serialization command failed parsing an apostrophe before writing any file; safe JSON serialization of hand-authored data replaced it. The first source's scalar prompt/rubric order error was diagnosed in the parser and corrected in content only.

The checker uses real `analyzeLessonSource`, `buildBeginnerDraftSnapshot` (which runs the exact supplied-version planner), rubric resolution and learner projection. It does not instantiate Prisma, ConfigModule, API/server, storage, AI or TTS/STT providers. Ephemeral snapshot IDs never become persistence or media IDs. The technical checks cannot establish semantic correctness, human timing, approved pronunciation or absence of paraphrased leakage; those remain explicit human gates.

## Review and final refresh

One independent read-only review (Locke) examined the complete content/checker change. Initial verdict: corrections required. Six Important findings and two initially Minor findings were all treated as Important: prompt requirements lost to QUESTION precedence, singular listening distractors revealing answers, case-sensitive transcript leakage, cloned script bodies, output floors rejecting accepted contractions, a repeated transfer answer/glossary giveaway, a stale person in a grading rubric and an unassessed listening position claim. The latter two affect actual grading/evidence, so were re-graded before action. All eight new tests failed first (8 existing PASS/8 new FAIL), then passed in one correction pass (16/16 GREEN). No second reviewer or deferred minor finding. No product file changed; fixes are authored content and checker/test only. MG02-L2 additionally clarifies its grammatically correct quantity-label question.

Mutation experiment: invert the newly added distinct-script-body condition, run the entire16-case checker suite →3 FAIL/13 PASS, then restore exact bytes and rerun →16 PASS/0 FAIL/0 skipped. Format25/25, exact-version/projection/rubric11/11, API typecheck, focused lint and corpus qualification all passed on the corrected tree. This is AI technical/editorial review, never an appointed human teacher's approval.

Post-authoring baseline verification treats the22 non-null frozen file hashes as unchanged and the11 captured null hashes as authorized newly created outputs. An initial refresh incorrectly compared the latter to a hash for absence; this audit-script error was corrected without changing frozen artifacts or widening scope. Approval fingerprints are still bound by the unchanged scope artifact and mandate CLI validation. No actual protected source mismatch was found.

## Readiness and blockers

The approved offline deliverable reaches **OFFLINE_AUTHORING_COMPLETE**. Full R1.2b remains **implementing**, every source remains **NOT_READY**. Real audio0; teacher review NOT_RUN; rehearsal TIMING_NOT_VERIFIED. No AUDIO_READY/HUMAN_REVIEW_PASSED/TIMING_VERIFIED/CONTENT_READY or CEFR/stage completion is claimed. Content time may be much shorter than the45-minute planner contract; only actual human observation can settle timing suitability.

P0: no observed out-of-scope DB/media/provider/data action. P1 readiness gates: real permitted/quality-reviewed audio, teacher pedagogical/rubric approval, actual rehearsals and approved timing criterion absent. P2/editorial: lexical support beyond the core list (including an eraser, quantity/politeness and task prompts) and proposed narration/IPA variety require review. Live publication and learner qualification need separate valid authority; they are not attempted here.

## Local commits

- `74043b2`: real human approval/lifecycle bookkeeping.
- `6dc533b`: MG01-L1, pure checker/tests and initial truthful dossier.
- `5141e37`: MG01-L2–L4 pronunciation/integration/transfer sources.
- `db16a5a`: MG02-L1–L4 and full corpus/evidence dossier.
- `478bd7c`: independent-review corrections, eight regression reproductions, refreshed hashes and rehearsal dossier.
- The separate verification-report commit contains this handoff evidence. No merge/push/deploy.

## Rulings and verification boundaries

1. Use the exact scope-specified ignored evidence root with a manual task ledger instead of the skill's default workspace scripts. Reason: approved path boundary. Cost: manual audit bookkeeping.
2. Run only approved pure regressions; skip default API suites that may load.env or connect DB. Reason: direct DB prohibition outranks generic full-suite advice. Cost: no broad runtime/DB coverage claim.
3. Retain evidence under the approved ignored root instead of deleting it. Reason: reproducible results and human audit. Cost: small ignored storage.
4. Reuse the authored Unit glossary and existing email content type for short messages/cards. Reason: current supported types are email/dialogue and product changes are prohibited. Cost: teacher/future presentation review may require content adjustments.
5. Reviewer inherits the current model. Reason: tool instructions prohibit model override without a human request. Cost: no independently upgraded reviewer model claim.

6. Treat the stale rubric person and unassessed position objective as Important, rather than polish. Reason: learners would be assessed against inconsistent instructions/evidence. Cost if wrong: additional focused authoring/tests; both are corrected.
7. Actual audio quality/rights remain NEEDS_AUDIO because no audio is authorized or available. Cost: no listening readiness until separate production/review.
8. Human pedagogy, lexical support and rubric calibration remain unsigned. Reason: an AI reviewer cannot approve them for a teacher. Cost: human review may require re-authoring.
9. Measured duration, learner ability and CEFR outcomes remain unknown. Reason: there are no observed rehearsals. Cost: the drafts may need meaningful revision after timing review.
10. Live publication, enrollment and mastery behavior remain untested. Reason: expressly prohibited offline scope. Cost: no runtime qualification claim.
11. Unrelated R1.2a and shared component correctness are not requalified. Reason: protected files remain unchanged and only scoped pure regressions are authorized. Cost: broader existing defects may remain undetected.
12. Reviewer did not run fresh dynamic tamper tests. Reason: its assigned work was read-only; the implementer supplied RED→GREEN tests and a killed mutation afterward. Cost: final dynamic evidence is implementer-run, not a second independent execution.
13. Preserve the named branch/worktree and run the approved pure suites instead of the finishing skill's full-suite/integration menu. Reason: the user explicitly forbids DB access, merge, push and deploy. Cost: broader app/build/publication qualification is not claimed.

Source hashes are actual file hashes, not invented audio checksums. Planned video codes remain editorial only, without resource/media metadata. Rollback is only unpublished authoring/checker/report commits or retaining NOT_READY drafts; preserve history and never mutate DB/progress. This report does not supply any missing execution right.
