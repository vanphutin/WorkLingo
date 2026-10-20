# Intermediate topic learning verification — 2026-10-19

Branch: `codex/audio-dashboard-v2`; checkout `C:/Users/ASUS/.codex/worktrees/audio-dashboard-v2/WorkLingo`; starting commit `4af712b`. User confirmed the topic model, delegated implementation and requested token economy. One backend worker and one final independent reviewer were used; parent implemented contracts/UI and integration. No push or merge.

## Delivered behavior

- A topic has one source passage with connected vocabulary/grammar/pronunciation, reading/listening questions and speaking/writing tasks. Audio uses that passage. Topic sessions schedule every activity once using four approved variable-minute stages.
- AI proposes a 45/60/90/120/150-minute plan and explanation. Only a separate authorized human action approves it. Admin can edit or approve without AI. Source/review revisions and source hashes prevent stale approval and late AI overwrites.
- Publication requires matching approval under the import lock, then freezes it into the lesson snapshot. Topic candidates are published, eligible missions in the learner's current Intermediate program/level. Chosen/random creation preserves the selected topic and mode on UUID retry.
- Existing category tools, legacy lessons, frozen sessions and IELTS flows remain available. New topics still need normal curriculum assignment/publication; no old content is automatically approved, migrated or linked.

## Verification actually run

- Final full web: `pnpm --filter @worklingo/web test -- --maxWorkers=2` — **114 files, 668 tests passed**.
- API focused backend run: **14 files, 95 tests passed**, covering review races, manual approval, controller RBAC, publication locking/snapshot, full-activity topic planning, learner choice/random/replay, source/audio binding and legacy import/session/audio compatibility. API typecheck, global lint and build passed. Full DB/API integration suites were not run.
- Contracts: **21 files, 110 tests passed**; content-format: **10 files, 126 tests passed**. Both packages passed lint/typecheck.
- Web lint/typecheck and isolated production build passed after final review fixes. Build used `WORKLINGO_E2E_MODE=true` and `.next-e2e`; tracked `next-env.d.ts` references were restored to `.next` and typecheck rerun.
- i18n: **36 namespaces, 2229 paired keys, zero errors**; all seven i18n checker tests passed.
- Browser smoke against actual Next routes with every API request intercepted: admin creates a fully filled topic, AI proposal does not approve, explicit approval succeeds, editing/saving the passage invalidates approval; learner chosen and random starts send no duration override. The final fixture deliberately returns generic availability 422 while an eligible topic remains selectable. EN/VI, light/dark, 375/1440 widths; zero page errors or horizontal overflow. Screenshots were inspected. Session redirect was tested; the complete learning/evaluation cycle was not qualified by this fixture.
- RED/GREEN observed for variable topic blocks, editor behavior, manual allocation preservation and the final availability regression. Deliberately inverted allocation-total validation caused seven failures, then exact source bytes were restored before final checks.

## Review and fixes

One independent final review identified one required P2: generic mission availability failure could hide another eligible topic. Parent added a failing dashboard integration regression, made generic availability optional for Intermediate topic launch while preserving context/progress errors, and removed the contradictory legacy no-session status. The focused 39-test run and final 668-test suite passed; the final browser fixture reproduced the original 422 condition successfully. No second review was purchased; this is parent verification of the review fix.

The initial full web run exposed an existing IELTS test race: it clicked a visible but still-disabled New topic button during loading. Focused rerun passed; the test now waits for the enabled state before clicking. No IELTS product behavior changed. The final full run passed.

Parent also prevented source saves from silently discarding unsaved manual allocations. The reproducer failed first, then passed after confirmation/combined dirty-state registration. No remaining required findings or deferred minors were identified.

## Local data and runtime

The configured local PostgreSQL container was restarted. A custom-format backup was saved locally under ignored `.superpowers/worklingo-before-topics-20261019.dump` (12,808,771 bytes) before schema changes. Migration status showed exactly one pending migration; `20261019090000_intermediate_topic_reviews` was applied successfully. It adds the review table, FK and revision/approval consistency constraints without changing existing content rows.

After migration, the review table contained zero rows: no live topic was auto-approved or published. API health confirmed database/storage up; an unauthenticated review request returned 401. Next remains at port 3000 and API at 4000. No live AI provider was called, no live learning content was created/approved/published by the checks, and no seeds/resets were run. Mock lock tests and successful migration do not prove real PostgreSQL concurrency behavior.

## Implementation decisions

- Four flexible allocations for topic plans preserve all activities; legacy sessions retain strict 15-minute canonical blocks. Cost if unsuitable: adjust approved planning policy, without changing existing snapshots.
- Keep existing curriculum assignment explicit and retain the legacy launcher when no topic is eligible. Cost: admin performs the existing publish/link steps before a new topic appears to learners.
- Use existing configured providers only on request; clearly mark simulation and permit manual planning. Live provider behavior remains unqualified by these tests.

Implementation commits are recorded in Git. Verification logs, fixtures, screenshots, backup and detailed worker/reviewer reports remain ignored local evidence.
