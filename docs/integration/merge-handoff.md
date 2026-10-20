# Safe merge handoff — instructions only

No merge, push, deploy or production migration was performed. Candidate: integration/worklingo-release-candidate in D:/Projects/WorkLingo-Integration. Exact product/final commit is recorded by final report/manifest; main must still equal7a5e383763ccd63c4befa4ab07a5559ba7cabfbe and LG sourcecc09a750f7e2d588d347c147835780348c912708.

## Preconditions

Obtain explicit human approval for this exact integrated candidate and its accepted limitations; earlier phase acceptance and inclusion decisions are not merge authority. All required quality gates must pass for the approved source. Read final QA/readiness/review and rerun preservation.py. Verify candidate clean, refs unchanged, no conflict and all artifact references tracked. Recheck every checkout/worktree and active process before any integration action.

The original main checkout remains dirty:14tracked modifications+38untracked files, with relevant ignored credentials/data. Reconciliation into a candidate does not make those original changes disposable. Do not stash/reset/clean/force checkout or commit the user's work to facilitate merge. Main is checked out there; do not bypass worktree protection or advance its ref behind the dirty checkout.

## Recommended method after approval

Preserve history with an ordinary non-squash merge from the verified candidate, preferably a no-fast-forward merge to create an explicit rollback boundary. An empty disposable rehearsal can validate the merge tree, but cannot justify changing the dirty main worktree. If the original checkout is still dirty and cannot be integrated without touching protected bytes, report blocked and wait for the human to prepare/release it. Do not auto-move that checkout or import a private snapshot as commits.

If main advanced, do not reuse stale QA. Reconcile in an isolated continuation candidate, re-inventory, review conflicts semantically and rerun affected/full required checks before renewed approval. A conflict or serious regression stops the merge. Push/deploy/production migrations each require separate authority.

## Post-merge verification, if separately authorized

Record merge SHA and first parent. Verify candidate ancestry/tree and clean intended worktree; rerun protected-file comparison. Run contracts/web/API checks, types/lint/i18n/build, isolated migration rehearsal and real critical browser journeys. Confirm auth, placement, pinned versions, IELTS legacy/V3 rollout, recordings, dirty navigation, inline feedback and themes/reflow. Never run test seed or reset scripts against real data. Do not announce deployment from a local merge.

## Rollback

Retain all branches/worktrees/private backup and historical source hashes. If an authorized no-fast-forward merge later needs rollback, create a new revert commit against that specific merge's first parent (review the exact SHA before executing); do not reset or rewrite shared history. A code revert does not undo database migrations or learner writes. Restore/revert database state only under a separately approved, rehearsed recovery plan with backups and compatibility checks. Current task changed no real database, so no real-data rollback is needed now.
