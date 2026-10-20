# IELTS unlock readiness — 2026-10-15

Historical audit below records the state before the subsequent authorized implementation. The user later delegated content selection and local publication; the local Beta is now released. See [post-release evidence](2026-10-15-ielts-local-beta-release.md) and MND-20261015-001. Preserve the original observations as the before-state.

- Trigger: human request to unlock IELTS **if all phases are done**.
- Scope: local running database publication state, existing phase/qualification records, catalog and activation policy. Read-only investigation; no learner evidence inspection or mutation.
- Baseline: `codex/audio-dashboard-v2`, existing uncommitted audio/dashboard/dialogue work preserved.
- Skills: systematic-debugging for tracing the locked card; mandate-steward/governance for distinguishing implementation evidence from publication readiness; verification-before-completion for the result.

## Confirmed observations

The codebase contains IELTS implementation through Phase 8. Phases 3–7 have completion/review records in `docs/IMPLEMENTATION_ROADMAP.md`; Phase 8 implementation/verification is described in `docs/IELTS_FULL_MOCK.md` and `docs/GIT_INTEGRATION_2026-10-15.md`. These records do not establish that the current local content is published or the program activation flow supports IELTS.

Read-only Prisma transaction against the same `.env` database as the running app returned:

| Component | Local state |
| --- | --- |
| IELTS program | `IN_DEVELOPMENT`, no learning paths |
| Orientation | 1 record, `ARCHIVED`, no current published version |
| Bridge | 4 records with current published versions; one mutable module is `VALIDATED`, three `PUBLISHED` |
| Integrated Practice | 4 records with current published versions, all `PUBLISHED` |
| Band Curriculum | 1 `DRAFT`, no current published version |
| Full Mock | 1 `VALIDATED`, no current published version |

The disabled card is consistent with actual configuration. `apps/api/src/learning-programs/domain/program-availability.ts` allows only Intermediate and only for AVAILABLE/BETA statuses. Catalog contracts allow only `/dashboard` as a non-null destination. `ProgramContextService.activate` also requires an existing enrollment whose current level belongs to the target program. Changing the status alone would not create a usable IELTS journey: there are no IELTS paths/levels and no supported IELTS activation initialization.

`OrientationLearnerService.readEligibility` requires onboarding, Intermediate enrollment, a passing Foundation checkpoint and a current published orientation. Later IELTS phases deliberately retain their own evidence gates. No learner prerequisites were bypassed during this check.

## Decision

The request's readiness condition is not met in the running local system. IELTS remains locked; no publication, status update, curriculum restoration or enrollment mutation was performed. In particular, restoring the archived Orientation is a content lifecycle decision, not a cosmetic card toggle.

To support a usable local IELTS entry, the remaining scope is: review/restore and publish Orientation, review/publish Band Curriculum and Full Mock, then implement a catalog entry/activation destination consistent with the existing IELTS prerequisite chain. Keep existing Foundation evidence and teacher-review gates. Local trial entry and public/content-calibrated release are distinct decisions; no public deployment was requested.

## Verification and limits

- Reproduced the state using `.superpowers/ielts-readiness.mjs` in a database transaction explicitly set `READ ONLY`; output contains aggregate content state only.
- Read existing phase records and catalog/context/Orientation admission code; no new runtime tests were needed because production code and database data were not changed.
- Mandate search `IELTS release catalog unlock`: no existing matching candidate. No new mandate was created: this report records the unmet condition and concrete remaining scope rather than silently approving new publication/integration work.
- Mandate register validation passed (`valid: true`, one existing record).
- Human calibration/owned-content approvals remain unverified; no claim that green technical tests provide those approvals.
