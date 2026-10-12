# IELTS Phase 2 review and verification

Date: 2026-10-13. Feature branch: `codex/ielts-program-enrollment`.

Enrollment and active context now drive Intermediate onboarding, curriculum selection, mastery,
progression and dashboard progress. Historical sessions retain their frozen version/checkpoint.
Only Intermediate is selectable; IELTS admission, content and band scoring remain deferred.

## Review

An independent read-only reviewer inspected base `2283b4b` through `c8b1904`, the approved spec/plan
and the implementation ledger. Critical: none. Important: none. Minor: none. Adjacent admin
commands expose no program/path moves, and archive preserves ancestry.

Membership-guard mutation was caught by the authenticated context test and restored exactly.
After review, application code stayed unchanged; only publishing-fixture correction, an additional
foreign-level assertion in the existing context test, and documentation were added.

## Verification evidence

- Focused migration backfill/rollback rehearsals: 4/4; context contracts: 4/4.
- Focused context/onboarding/adaptive checks: 23/23; progression and related regressions: 31/31;
  activation race/confirmation rollback cases passed; final context file: 8/8.
- Focused UI/client: 31/31; program activation/resume E2E: desktop and mobile both passed.
- Initial `pnpm verify`: format, setup-local credential regression, lint and typecheck passed.
  Content-format tests 27/27, contracts 47/47 and web 219/219 passed. API suite ran all 116 files:
  592/593 tests passed, with one old publishing fixture failing onboarding because its level was DRAFT.
- The fixture now explicitly publishes that level. The whole publishing file passed 6/6.
  Production published-level gating was retained.
- Remaining verify stages were run explicitly: all API integration tests 227/227 across 48 files,
  production build, and all Playwright journeys 34/34 across desktop/mobile learner/admin flows.
- Final diff/targeted lint checks passed.

The original `pnpm verify` command exited 1. There is no second literal command exit 0: verification
is the composed evidence above after a fixture-only repair. Repeating already-green suites would
not exercise different application code. This follows the user's focused-testing/quota preference.

## Execution rulings and practical limits

1. Focused checks precede the final gate instead of repeated whole-suite runs. Cross-package
   regressions can surface later; the complete gate caught the publishing fixture.
2. Independent contracts proceeded while Docker/PostgreSQL started. Dependent work was not marked
   passing until database rehearsals completed.
3. Temporary migration CLI runs from the OS temp parent. This avoids repository Prisma config
   overriding rehearsal migrations and Windows child-CWD locks; portability is covered by rehearsals.
4. PENDING learners receive 409 for program-scoped mastery/progression and empty/null progress.
   Older callers must handle onboarding-required state; learner routes already enforce onboarding.
5. ProgressService joined the scope because the dashboard also consumed the legacy mirror.
   Counts now describe the active program, which changes previously global statistics semantics.
6. Consumer Tasks 4 and 5 share one commit to keep pending-state behavior and expectations coherent.
   This is a larger atomic consumer diff, covered by focused integration tests.
7. Reviewer-deferred capabilities remain outside this enrollment feature. Future IELTS admission,
   scoring and multi-program release need their own design/policy before activation is enabled.
8. The old publishing fixture was made explicitly PUBLISHED. Production gating was not weakened;
   version-isolation tests cover the corrected fixture.
9. Remaining verification stages resumed after the fixture-only repair. Evidence is composed;
   the initial literal verify exit code remains 1 and is disclosed above.
10. Invalid relationships written directly to the database are rejected rather than auto-repaired;
    an operator must repair them.
11. Existing admin archive-policy weaknesses outside enrollment coherence remain separate work.
12. Shared Language Block evidence and learner-wide engagement retain existing identity/calendar
    semantics; exam-specific evidence isolation may need a future capability.
13. Unrelated decomposition/cleanup was deferred; existing unrelated structural debt stays unchanged.

No reviewer minor findings were deferred. Human calibration and future IELTS release qualification
are not established by these technical checks.
