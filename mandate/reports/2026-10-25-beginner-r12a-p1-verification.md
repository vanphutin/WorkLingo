# MND-20261025-001 — R1.2a P1 software verification

Date2026-10-25. Acceptance verdict: PASS for the approved two-file software amendment only. Parent MND-20261024-003 remains implementing; full R1.2a DB/integration/E2E and publication acceptance is BLOCKED.

## Approval and immutable baseline

Actual [human approval](2026-10-25-beginner-r12a-p1-human-approval.md) recorded through CLI triaged -> approved -> implementing before source changes.
Proposal hash333afd904efbd281cb2b21c26a898e293f2679fcb383525b52a883c8bd2aacf9.
[Scope lock](2026-10-25-beginner-r12a-p1-amendment-scope.json), [execution addendum](../../docs/superpowers/plans/2026-10-25-beginner-r12a-p1-lifecycle-amendment.md) and [scope review](2026-10-25-beginner-r12a-p1-amendment-review.md).
Preflight matched plan/review hashes, exact allowlist fingerprint, all112 baseline paths,7 frozen artifacts, HEAD47dab4efb54d33b207455762446185a3f516f1e5 and branch codex/foundation-basic-readiness. Known five governance-only pending files were preserved.
Frozen original plan/review/scope and001/002/003 records remain unchanged.001 captured/null;002 verified;003 implementing with original approval. Only the two approved source files changed.

## Source commit and behavior

P1 source commit: 24756b3db8dd013046a9bdba2a1fbe79fcc9e08b. Exactly service+service spec,251 insertions/14 deletions. No product config/controller/DTO/policy/schema changes.

| File | Final raw-byte SHA-256 |
| --- | --- |
| [apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.spec.ts](../../apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.spec.ts) | 943a391ccb716c8147e793feed1b3daa7061cfe421f34ef97aa83bf972a87f13 |
| [apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.ts](../../apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.ts) | ea9832149075bb7bc6d05a42f125779a166dfa3ab95646bc7f13dc5d372ae417 |

- Generic Beginner/format1.2 deletion/archive denied regardless of active Admin role or client environment claims. No new authorized Beginner withdrawal operation or grant was added.
- Existing target checked before receipt replay. Matching receipt cannot bypass Beginner ownership/format denial; legitimate deleted legacy target replay and legacy request hashes remain compatible.
- After existing slug advisory/import-row locks, active actor and actual target are reread/rechecked before content/audit/receipt DML. Both import Lesson and published-version Lesson relations are checked, with immutable current/referenced snapshot formats.
- Disguised legacy Beginner ownership, malformed/unbound1.2 marker, dangling/inconsistent references, ownership read failure, changed binding/format or revoked actor fail closed. Existing DB errors propagate rather than allowing mutation.
- Existing Intermediate/Foundation/IELTS deletion/archive, stale revision/action conflicts, FK protection, older import/newer pointer and unbound legacy same-slug draft behavior remain covered.
- Beginner V1/V2 generic withdrawal tests retain both version references and current V2 pointer; existing real scoped publisher/policy unit tests retain supersession and legacy prior-version archive. No publisher/policy source changed.

## TDD and checks actually executed

| Gate | Command / context | Actual result |
| --- | --- | --- |
| Baseline | Focused ignored unit config before source/spec edits | 5 files72 PASS,0 fail/skip |
| RED | Same config filtered to lifecycle service spec before service edits | 64 tests:41 PASS,23 expected FAIL,0 skip; all23 resolved success instead of required rejection |
| GREEN / final | pnpm --filter @worklingo/api exec vitest run --config <absolute ignored .superpowers/sdd/2026-10-25-beginner-r12a-p1-lifecycle-amendment/vitest.lifecycle.config.ts> | 5 files101 PASS,0 fail/skip; final run after byte-exact mutation restoration |
| Dedicated regression first attempt | pnpm --filter @worklingo/api exec vitest run --config vitest.beginner.config.ts | 30 files203 tests:202 PASS,1 FAIL,0 skip; retained as failure evidence |
| Failed test isolated rerun | Same dedicated config, src/beginner/beginner-admin.controller.spec.ts | 1/1 PASS,580ms, no source/config edit |
| Dedicated regression complete rerun | pnpm --filter @worklingo/api exec vitest run --config vitest.beginner.config.ts | 30 files203 PASS,0 fail/skip |
| Mutation experiment | Temporarily invert snapshot object check; run complete lifecycle service spec | 64 tests:62 PASS,2 expected FAIL,0 skip; both current/referenced1.2 snapshot tests caught mutation |
| API lint | pnpm --filter @worklingo/api lint | PASS, tool session exit0 |
| API typecheck | pnpm --filter @worklingo/api typecheck | PASS, tool session exit0 |
| API build | pnpm --filter @worklingo/api build | PASS, tool session exit0 |
| Diff / source scope | git diff --check; exact source commit path comparison; frozen dependency hashes | PASS |

Focused and dedicated suites overlap: 281 distinct final passing tests across32 distinct files; do not sum101+203 as unique tests.
The temporary runner imports the existing dedicated plugin/mock env, replaces include with five explicit unit files, and is Git-ignored. No tracked config expansion, .env loading, DB bootstrap or real providers. The existing HTTP authorization unit creates only its mock-backed local Nest application; it is not a DB E2E run.

### Initial regression failure disposition

Unchanged Beginner Admin HTTP authorization test "rejects learner roles through a direct URL, while Admin can read the plan" failed once with STACK_TRACE_ERROR at5348ms while typecheck/build were also running. JSON output did not identify an underlying assertion/transport cause. Isolated unchanged rerun passed580ms; complete unchanged rerun passed203/203.
Resource/timing contention is a hypothesis, not an established root cause. No timeout increase, skipped test, assertion suppression or out-of-allowlist correction was used. This report retains the original FAIL separately; reruns do not prove the transient harness problem fixed.

## Acceptance coverage

| Required boundary | Evidence |
| --- | --- |
| Unauthorized Beginner archive/delete | Both Admin roles and legacy-format bound/unbound1.2 cases; denied-path content/audit/receipt delegates untouched |
| Environment mismatch/direct API bypass | Real controller -> real service with absent/matching/mismatched client claims still denies; existing policy environment-binding unit regressions also collected |
| Cached receipt authorization | Existing Beginner target with deleted/archived matching receipts denied; legacy deleted target replay and conflict semantics retained |
| Concurrent lifecycle changes | Mock interleavings after import lock change ownership/source or revoke actor; all denied before DML. This is NOT real PostgreSQL concurrency proof |
| Authorized operations | Active Admin/SystemAdmin legacy Intermediate archive; existing topic/bridge/mock and draft cases |
| Intermediate/IELTS | Existing publisher, lifecycle, curriculum/history/evaluation and IELTS-band mock suites remain PASS |
| Beginner V1/V2 | Generic removal of old/current imports denied without snapshot/pointer mutation; existing publisher supersession unit checks PASS |

## Independent review and dispositions

Fresh read-only reviewer: McClintock, agent01a172ef-c76f-7481-9658-b16c2a591e63. Compared exact uncommitted service/spec diff against47dab4e and verified it matched saved review.diff. Reviewed actual service/spec plus needed read-only dependencies. No P0/P1/P2 findings in patch; no edits or nested reviewers.
Reviewer confirmed pre-replay and post-lock checks, both actual Lesson relationships, immutable snapshot checks, legacy unbound/old-pointer compatibility and real-service zero-write regression coverage.
Reviewer verdict was static acceptance conditional on resolving the then-observed regression and confirming remaining exit results. Coordinator disposition: complete rerun203/203 PASS; focused final101/101 PASS; lint/typecheck/build actual tool exits0; snapshot mutation caught2 tests and original source restored byte-for-byte. No source change after review except the controlled, fully restored mutation experiment.

Declined-to-judge dispositions:
- Real PostgreSQL concurrency/binding races: remain BLOCKED; mocked rechecks are the approved software gate, not a concurrency certification.
- Integration/E2E/live historical sessions/evaluation/progress: remain BLOCKED; R1.2a cannot be verified on this report alone.
- Actual fixture IDs/hashes/publication/provider/storage/learner opening: explicitly excluded and not performed; separate action/environment approval required.
- Earlier branch work and overall R1.2a/public release: outside this patch review; original frozen records/statuses retained.
- Mutation experiment: reviewer was read-only; coordinator performed and verified the experiment afterward. Cost if wrong would be an undetected guard regression; actual2 expected failures plus final101 PASS provide observed evidence.
No deferred cosmetic findings or extra fix pass were required.

## Blockers, residuals and rollback

P0/P1/P2 confirmed defects in this patch: none after verification/review. The original generic lifecycle P1 is fixed within the approved software scope.
Residual test stability observation: one unchanged HTTP unit failed transiently; root cause unproven, retained above. It is not attributed to this patch or silently declared repaired.
BLOCKED for parent R1.2a: separately approved isolated DB identity/storage/actions/preflight/cleanup; integration/E2E; real historical pin persistence and concurrent behavior; fixture publication evidence and actual candidate release approval.
No real database creation/reset/read/write, migration, seed, live provider, real content import/publication/audio, learner enablement, R1.2b/R2/R3/R4, merge/push/deploy occurred.
Rollback proposal remains revert-only-P1-commit under authorization; preserve historical readers/snapshots/learner state. Reverting restores the known P1 and is not safe release approval. No rollback executed.

## Execution rulings

- Used the approved named scratch root instead of a differently named generic workflow directory; cost if wrong is evidence-path ambiguity, avoided by exact scope reference.
- Addendum has no generic Task headings: executed one explicit brief/ledger task instead of rewriting frozen plan for task-start/task-done scripts; cost if wrong is missing bookkeeping, covered by observed command logs and this report.
- Existing dependencies and dedicated no-.env mock configuration supersede generic installation/default-suite workflow instructions; cost if wrong would be missed unrelated checks, while running the default suite would violate DB restrictions.
- Independent review covers exact approved patch, not unrelated whole branch; cost if wrong is unreviewed earlier work, which remains outside this acceptance claim.
- Retained ignored evidence instead of destructive workflow cleanup; cost is local scratch disk only. Git contains stable verification summaries/hash evidence.
- No branch-integration menu or next increment: direct human commit-only/no-merge instructions govern; cost if wrong would be unauthorized side effects, which were avoided.

## Collected final tests

| File | PASS | FAIL | SKIP |
| --- | --- | --- | --- |
| apps/api/src/admin-content-lifecycle/admin-content-lifecycle.controller.spec.ts | 16 | 0 | 0 |
| apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.spec.ts | 64 | 0 | 0 |
| apps/api/src/admin-curriculum/application/admin-curriculum-command.service.spec.ts | 13 | 0 | 0 |
| apps/api/src/beginner/application/beginner-authoring.service.spec.ts | 8 | 0 | 0 |
| apps/api/src/beginner/application/beginner-release.service.spec.ts | 7 | 0 | 0 |
| apps/api/src/beginner/beginner-admin.controller.spec.ts | 1 | 0 | 0 |
| apps/api/src/beginner/domain/beginner-authoring-policy.spec.ts | 4 | 0 | 0 |
| apps/api/src/beginner/domain/beginner-environment-preflight.spec.ts | 4 | 0 | 0 |
| apps/api/src/beginner/domain/beginner-publication-policy.spec.ts | 5 | 0 | 0 |
| apps/api/src/common/config/app-config.module.spec.ts | 1 | 0 | 0 |
| apps/api/src/content-authoring/application/audio-generation.service.spec.ts | 8 | 0 | 0 |
| apps/api/src/content-authoring/application/content-imports.service.spec.ts | 20 | 0 | 0 |
| apps/api/src/content-authoring/application/content-publisher.service.spec.ts | 12 | 0 | 0 |
| apps/api/src/curriculum-foundation/application/foundation-curriculum.service.spec.ts | 1 | 0 | 0 |
| apps/api/src/curriculum-foundation/application/foundation-validation.spec.ts | 2 | 0 | 0 |
| apps/api/src/curriculum-foundation/domain/objective-evidence-policy.spec.ts | 3 | 0 | 0 |
| apps/api/src/curriculum-foundation/domain/prerequisite-graph.spec.ts | 6 | 0 | 0 |
| apps/api/src/ielts-band-curriculum/application/ielts-band-admin.service.spec.ts | 3 | 0 | 0 |
| apps/api/src/ielts-band-curriculum/application/ielts-band-learner.service.spec.ts | 7 | 0 | 0 |
| apps/api/src/ielts-band-curriculum/domain/evaluate-band-progression.spec.ts | 2 | 0 | 0 |
| apps/api/src/learning-sessions/application/learner-audio.service.spec.ts | 2 | 0 | 0 |
| apps/api/src/learning-sessions/application/learning-sessions.service.spec.ts | 7 | 0 | 0 |
| apps/api/src/learning-sessions/application/session-creation.service.spec.ts | 2 | 0 | 0 |
| apps/api/src/learning-sessions/domain/beginner-session-planner.spec.ts | 3 | 0 | 0 |
| apps/api/src/learning-sessions/domain/context-transfer.spec.ts | 6 | 0 | 0 |
| apps/api/src/learning-sessions/domain/learner-activity-projection.spec.ts | 3 | 0 | 0 |
| apps/api/src/learning-sessions/domain/session-planner.spec.ts | 39 | 0 | 0 |
| apps/api/src/teacher-ai/application/evaluate-attempt.handler.spec.ts | 3 | 0 | 0 |
| apps/api/src/teacher-ai/application/evaluation-processing.spec.ts | 5 | 0 | 0 |
| apps/api/src/teacher-ai/application/evaluation.service.spec.ts | 17 | 0 | 0 |
| apps/api/src/teacher-ai/domain/beginner-rubrics.spec.ts | 5 | 0 | 0 |
| apps/api/src/teacher-ai/domain/foundation-rubrics.spec.ts | 4 | 0 | 0 |

## Evidence artifact hashes

Full local logs are under the approved ignored scratch root. This tracked summary preserves results, source hashes, review dispositions and the following log hashes without committing runtime outputs:

| Artifact | SHA-256 |
| --- | --- |
| baseline-tests.log | 66d498138f06bbd52c8cbc1b1cdeef0367e3e98206b8999530952ccf5594d314 |
| red.json | 5ed3356aa18a7d9b885f300779cc11f6e6cf04626e249ceeee9c90344cd155a0 |
| green.json | c3d987ac7a1b91288554eec643618d4858aefd0a47183f5562e50952d979a89b |
| regression.json | 4bd9d2e6ab8419414abaef572a6cf495d43fb6e8214d0d3b591e1db05c507885 |
| http-rerun.log | 59a6ddb1bf9ae0a24fc51d91e1e19024c493e14e893a1f6c99c02793cb780b80 |
| regression-rerun.json | 026e1f612955df13ac9f604cc4825c82f78c1378ef94b9c79da156845f2389c5 |
| mutation.json | b765a2a365111578536887e10f3ac6bd9fd6c30d7949957b7f04c3bdae0eccd3 |
| final-focused.json | 97556f9921af455d38fd4ba46457469fb0be9543d32653038f1be09d6a1fa8e5 |
| lint.log | 62f57a403f9d872e11c0ed4529f65719b0d0308144700434492057b17eee7aad |
| typecheck.log | 4e29d731c1b54a8bdf0e47d662089e6d912c484c40589e02bda75644cfcbd1d0 |
| build.log | 19590b56250c7e505e05d0eed9763eee456e70ac8b183cc1c7d2b28d06a8c0dc |
| acceptance.json | ab55e186a910b57fde1bb1db10fb2882bc80409363a6d47e4f116563a57d328b |

## Skill audit

Used: mandate-steward for matching approval/lifecycle/frozen records; executing-plans for one bounded task and ledger; test-driven-development for observed RED->GREEN; systematic-debugging for P1 reproduction and unproven transient failure; using-git-worktrees/git-workflow-and-versioning for existing feature isolation and explicit atomic source commit; nestjs-expert for real service/controller DI and mock DB boundary; requesting-code-review plus reviewer code-review-and-quality for independent five-axis review; verification-before-completion for observed gate exits; codex-quota-optimizer for bounded reads and targeted checks.
Not used: additional implementers/reviewers or broad repo scans; real DB/E2E/provider/browser workflows excluded; full Web/package rebuilds unaffected by this two-file API correction. No automatic integration or next increment.
