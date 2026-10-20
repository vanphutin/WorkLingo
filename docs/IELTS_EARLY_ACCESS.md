# Account-scoped IELTS early access

On 2026-10-15, the human explicitly requested IELTS access for one named existing local learner.
This is a subsequent access decision, separate from the earlier content-publication mandate.
The selected account remains an active LEARNER. Its email is an operation argument, not source policy.

`LearnerProfile.ieltsEarlyAccess` defaults to false. The shared admission helper requires the explicit
flag and an active LEARNER user. Five phase catalog/status and direct new-start checks accept the
earned prerequisite or that grant. Orientation still requires onboarding and Intermediate enrollment.
Current publication, allowed mock modes, ownership, in-activity progression, scoring and teacher review
remain enforced. Existing version-bound resumes retain their original behavior. No checkpoint,
Orientation completion, Bridge completion, Band journey or score is fabricated by the grant.

Local maintenance CLI (database dry run by default):

```powershell
pnpm --filter @worklingo/api exec tsx scripts/set-ielts-early-access.ts --email=learner@example.com
pnpm --filter @worklingo/api exec tsx scripts/set-ielts-early-access.ts --email=learner@example.com --execute
pnpm --filter @worklingo/api exec tsx scripts/set-ielts-early-access.ts --email=learner@example.com --revoke --execute
```

The CLI checks the intended local loopback database, existing active learner/admin, and released content
readiness for grants. The transactional update touches only the target flag and records a
GRANT_IELTS_EARLY_ACCESS / REVOKE_IELTS_EARLY_ACCESS audit. An unchanged request is skipped.
Revocation removes the admission exception for new starts; it does not delete valid pinned progress.
The flag is not exposed through learner preference, registration or audio-settings update inputs.

Verification: helper RED→GREEN, five-service admission regressions RED→GREEN, then **64/64 tests across
10 files**, including existing Orientation/Bridge/Mock HTTP workflows and catalog/context protection.
API typecheck, build and lint passed; bounded independent helper/CLI/schema and five-service reviews
found no Critical/Important issue. The additive 32nd migration applied successfully with default false.
The live API was restarted for Windows Prisma regeneration. The original shared development runner
exited when its API watcher stopped, so its remaining web process was restarted separately as well.

Actual selected-account command returned UPDATED. Read-only verification through the five real learner
services returned access=true for Orientation, Bridge, Integrated Practice, Band and Mock, with four
Bridge modules, four duration profiles and one original mock. Learning evidence/context were unchanged;
other early-access account count was zero. Orientation and Bridge remained genuinely incomplete and no
Band journey was created. Private operation evidence is in `.superpowers/ielts-early-access-*.log`.
Full API/web/browser suites were not repeated for this backend admission change; relevant unit/HTTP
checks plus actual account verification were used. No public deployment or Git commit/push was requested.
