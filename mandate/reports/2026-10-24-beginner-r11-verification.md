# WorkLingo Beginner R1.1 — Verification and handoff

**2026-10-24 · R1.1 only · no automatic next increment**

Child [MND-20261024-002](../items/MND-20261024-002-feature-implement-provider-free-beginner-r1-1-format-and-exact-version-planner.md), proposal hash `571187f39dc43213dd39f19c37f3b4cc76ab374faa55082e64229c13add5df82`; [human approval](2026-10-24-beginner-r11-human-approval.md), [exact scope review](2026-10-24-beginner-r11-preapproval-review.md). Parent remains captured/approval=null. Baseline6113427 on codex/foundation-basic-readiness; prior reviewed plan/parent document changes were preserved in a separate documentation commit.

## Delivered

- Additive WorkLingoLesson/1.2: INSTRUCTION, independent guided_response, authored min_words and exact rubric ID/version; normalized1.0/1.1 output retained.
- Browser-safe synchronous canonical manifest SHA256/schema; native independent hash test and reviewer50 synthetic SHA comparisons pass.
- Pure planner verifies expected LessonVersion ID, keeps all8 assessed activities3R/3L/1S/1W,3x15-minute blocks; deterministic/frozen and no DB/provider/first/latest resolution.
- Versioned immutable Beginner rubrics use approved technical weights .35/.25/.20/.20, no shadowing accuracy requirement or model-copy phrase requirement. Evaluator checks bound snapshot, real program relation, duplicate IDs/slug and objective mappings before provider; no latest-rubric fallback.
- Learner DTO keeps phase instructions, hides hidden answer/model/rubric/transcript and Beginner requiredPhrases; legacy intentional shadowing model retained.
- Runtime1.2 create/update/validate/publish disabled, with tests proving no mutation. Planner is not wired into learner session routes; no Beginner admission exposed.

## Files changed

- [apps/api/src/content-authoring/application/content-imports.service.spec.ts](../../apps/api/src/content-authoring/application/content-imports.service.spec.ts)
- [apps/api/src/content-authoring/application/content-imports.service.ts](../../apps/api/src/content-authoring/application/content-imports.service.ts)
- [apps/api/src/content-authoring/application/content-publisher.service.spec.ts](../../apps/api/src/content-authoring/application/content-publisher.service.spec.ts)
- [apps/api/src/content-authoring/application/content-publisher.service.ts](../../apps/api/src/content-authoring/application/content-publisher.service.ts)
- [apps/api/src/curriculum/domain/curriculum.types.ts](../../apps/api/src/curriculum/domain/curriculum.types.ts)
- [apps/api/src/learning-sessions/application/learning-session.types.ts](../../apps/api/src/learning-sessions/application/learning-session.types.ts)
- [apps/api/src/learning-sessions/application/learning-sessions.service.spec.ts](../../apps/api/src/learning-sessions/application/learning-sessions.service.spec.ts)
- [apps/api/src/learning-sessions/application/learning-sessions.service.ts](../../apps/api/src/learning-sessions/application/learning-sessions.service.ts)
- [apps/api/src/teacher-ai/application/evaluation.service.spec.ts](../../apps/api/src/teacher-ai/application/evaluation.service.spec.ts)
- [apps/api/src/teacher-ai/application/evaluation.service.ts](../../apps/api/src/teacher-ai/application/evaluation.service.ts)
- [apps/web/src/features/learning-session/activity-workspace.tsx](../../apps/web/src/features/learning-session/activity-workspace.tsx)
- [apps/web/src/lib/api/api-client.learner.test.ts](../../apps/web/src/lib/api/api-client.learner.test.ts)
- [apps/web/src/lib/api/api-client.ts](../../apps/web/src/lib/api/api-client.ts)
- [packages/content-format/src/ast.ts](../../packages/content-format/src/ast.ts)
- [packages/content-format/src/foundation-metadata.ts](../../packages/content-format/src/foundation-metadata.ts)
- [packages/content-format/src/index.ts](../../packages/content-format/src/index.ts)
- [packages/content-format/src/normalizer.ts](../../packages/content-format/src/normalizer.ts)
- [packages/content-format/src/parser.ts](../../packages/content-format/src/parser.ts)
- [packages/content-format/src/validator.ts](../../packages/content-format/src/validator.ts)
- [packages/contracts/src/index.ts](../../packages/contracts/src/index.ts)
- [apps/api/src/learning-sessions/domain/beginner-session-planner.spec.ts](../../apps/api/src/learning-sessions/domain/beginner-session-planner.spec.ts)
- [apps/api/src/learning-sessions/domain/beginner-session-planner.ts](../../apps/api/src/learning-sessions/domain/beginner-session-planner.ts)
- [apps/api/src/teacher-ai/domain/beginner-rubrics.spec.ts](../../apps/api/src/teacher-ai/domain/beginner-rubrics.spec.ts)
- [apps/api/src/teacher-ai/domain/beginner-rubrics.ts](../../apps/api/src/teacher-ai/domain/beginner-rubrics.ts)
- [apps/web/src/features/learning-session/activity-workspace.test.tsx](../../apps/web/src/features/learning-session/activity-workspace.test.tsx)
- [packages/content-format/src/beginner-format.spec.ts](../../packages/content-format/src/beginner-format.spec.ts)
- [packages/content-format/src/beginner-format.ts](../../packages/content-format/src/beginner-format.ts)
- [packages/contracts/src/beginner.contracts.spec.ts](../../packages/contracts/src/beginner.contracts.spec.ts)
- [packages/contracts/src/beginner.contracts.ts](../../packages/contracts/src/beginner.contracts.ts)

All29 product files are in the approved allowlist. No Prisma schema/migration/seed, dependencies/lockfile, app route/module, resolver/session creation, program availability or generated tracked files changed.

## Actual final commands/results

| Check | Result |
| --- | --- |
| `pnpm --filter @worklingo/content-format test` | PASS147 tests,12 files |
| `pnpm --filter @worklingo/contracts test` | PASS141 tests,28 files |
| API targeted command below | PASS100 tests,8 files |
| Web targeted command below | PASS38 tests,4 files |
| `pnpm --filter <package> lint` for content-format/contracts/api/web | PASS all4 packages |
| `pnpm --filter <package> typecheck` for content-format/contracts/api/web | PASS all4 packages |
| `pnpm --filter @worklingo/api build` | PASS tsc build |
| `pnpm --filter @worklingo/web build` | PASS Next production build,40 static pages |
| Root integration/E2E/real DB/provider tests | NOT RUN: expressly outside authorization; not counted PASS |

Total426 passing tests,0 failing,0 skipped in the executed suites. Content-format/contracts have no dedicated build scripts; API/Web builds compile their consumed shared modules. Type errors encountered during development were fixed in synthetic fixture typing and rerun; final PASS is not inferred from earlier runs.

API command:

```text
pnpm --filter @worklingo/api exec vitest run src/content-authoring/application/content-imports.service.spec.ts src/content-authoring/application/content-publisher.service.spec.ts src/learning-sessions/domain/session-planner.spec.ts src/learning-sessions/domain/beginner-session-planner.spec.ts src/learning-sessions/application/learning-sessions.service.spec.ts src/teacher-ai/domain/foundation-rubrics.spec.ts src/teacher-ai/domain/beginner-rubrics.spec.ts src/teacher-ai/application/evaluation.service.spec.ts
```

Web command:

```text
pnpm --filter @worklingo/web exec vitest run src/lib/api/api-client.test.ts src/lib/api/api-client.learner.test.ts src/features/learning-session/activity-workspace.test.tsx src/features/learning-session/activity-renderers/speaking-activity.test.tsx
```

TDD evidence: format unsupported/hash missing RED→GREEN; planner/rubric absent RED→GREEN; guards mutation-before-error RED→GREEN; evaluator dispatch/context RED→GREEN; DTO/client/UI missing instruction RED→GREEN. Invalid DTO fixture was corrected and absence of instruction was re-proven RED before restoring GREEN. Exported guided_response type contract TS2322 RED→GREEN.

## Independent review and final fix pass

Fresh read-only reviewer Gibbs: no Critical,2 Important,1 Minor; initial verdict Request changes. Important1 showed hidden sample leaking via requiredPhrases; Important2 showed provider/mutation reached with duplicate Activity IDs or missing objective map. Both were independently reproduced in new tests RED, fixed in allowed files, then GREEN with full targeted regression. Minor rubric-error mismatch was treated as a required approved-interface correction and also RED→GREEN. No second independent review was claimed; final closure is based on explicit reproduction/fix/regression evidence.

P0 open: none identified. P1 open: none after the above fixes. P2 open: none identified in approved scope; no deferred review minors. This is bounded unit/component evidence, not a claim of production/DB/provider qualification.

## Rulings and limitations

- Use the existing isolated worktree; scratch/ledger stay ignored under D task workspace because product file allowlist is exact. Cost if wrong: capture process artifacts separately rather than silently adding product files.
- Explicit user prohibition overrides generic skills suggesting root integration/E2E/full database tests. Cost: actual FK/resolver/start/resume must be proved later under approved isolated DB scope.
- Reviewer declined R2 resolver/FK/session-start/history integration: correctly excluded from R1.1, no implementation/claim; exact-version pure boundary is tested now. Real AI/STT/calibration and content/timing are also excluded. Cost: no real learner launch or CONTENT_READY claim follows this increment.
- Reviewer declined out-of-allowlist code: left untouched; unexpected compile issue there would block rather than expand scope. Cost: unrelated fixes require new permission.
- Rubric domain error was originally graded Minor but is an approved exact contract; fixed in the single TDD review pass. Cost: callers now receive the explicit unsupported-version error, never a provider side effect.

No actual database/provider/media/content publication, migration/seed, learner opening, merge/push/deploy or R1.2/R2/R3/R4 work occurred. Main's unrelated next-env/backups changes were preserved. Rollback before activation is code-only; retain readers/history if new-format references ever exist.

## Next increment gate

R1.2a may be proposed only after this R1.1 evidence is accepted and a separate scope/approval exists for Admin/editor/validation/preview, environment-bound registry and Beginner supersession policy. Its isolated test-DB fixture publication requires explicit environment permission/preflight. R1.2b real8 lessons/audio/reviewer/timed rehearsal remains independent human content gate; mock tests do not satisfy it. Do not start R1.2a automatically.

## Commit evidence

- `0ffaf6b`: approval-baseline (6 files).
- `2da434a`: format-contracts (15 files).
- `8315f01`: runtime-planner (14 files).

The verification-record commit follows these code commits; no merge/push/deploy was requested or performed.
