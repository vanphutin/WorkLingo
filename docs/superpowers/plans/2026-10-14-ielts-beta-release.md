# IELTS Controlled Beta Release Implementation Plan

> **Agentic workers:** REQUIRED. Execute one task at a time with a fresh implementation worker, then a fresh spec reviewer and code-quality reviewer. Do not allow parallel workers to edit shared Prisma, contracts, module-registration, or route files.

**Goal:** Turn the completed IELTS learning capabilities into a safe, invite-only production beta that real learners can enter, complete, resume, and receive reviewed results from.

**Architecture:** Add a thin beta-release boundary around the existing IELTS domain. Server-side entitlement and release-control services remain authoritative; the web renders their state. Published curriculum is pinned through an immutable release manifest. Hosted dependencies stay behind ports, while privacy, analytics, support, and operational controls are implemented as independently testable modules.

**Tech Stack:** pnpm monorepo, TypeScript, NestJS, Next.js App Router, Prisma/PostgreSQL, Vitest, Playwright, Docker Compose, existing WorkLingo contracts and provider ports.

**Spec:** `docs/superpowers/specs/2026-10-14-ielts-beta-release-design.md`

**Global Constraints:** Preserve existing Foundation and IELTS progress; no destructive migration or synthetic production publication. Enforce access on the API, never only in UI. Pin active sessions and attempts to immutable content versions. Never log raw invitation/reset tokens, learner answers, transcripts, audio, email addresses, or provider secrets. Tests should be targeted during development; run `pnpm verify` only at the final gate. Stage explicit files and use atomic commits.

**Review Focus:** Authorization bypasses, race conditions around invitation/attempt/review state, version drift, migration safety, PII leakage, suppressed analytics, mobile accessibility, provider failure handling, and rollback behavior.

## File Structure Map

Existing files that anchor the work:

- `apps/api/prisma/schema.prisma` — persistence models and enums.
- `apps/api/src/app.module.ts` — API module composition.
- `apps/api/src/auth/` — registration, login, cookie, and session behavior.
- `apps/api/src/learning-programs/` — catalog, availability, activation, and enrollment.
- `apps/api/src/ielts-*/` — orientation, bridge, practice, band, and mock domains.
- `apps/api/src/storage/` — object-storage port and local adapter.
- `apps/api/src/analytics/`, `apps/api/src/audit/`, `apps/api/src/ops/` — operational foundations.
- `apps/web/src/app/(learner)/ielts/` — existing IELTS learner routes.
- `apps/web/src/app/admin/` — existing admin surfaces.
- `packages/contracts/src/` — shared request/response schemas.
- `infra/docker-compose.yml` — local infrastructure.
- `docs/runbooks/` and `docs/release/` — operational and release documentation.

Planned additions:

- `apps/api/src/ielts-beta/` — invitation, entitlement, release control, home aggregate, and release manifest.
- `apps/api/src/identity-verification/` — email verification and password recovery orchestration.
- `apps/api/src/calibration/` — calibration evidence and release-gate decisions.
- `apps/api/src/privacy/` — retention, deletion requests, and deletion ledger.
- `apps/api/src/support/` — safe learner reports and operator queue.
- `apps/api/src/notifications/` — email delivery port and provider adapters.
- `apps/web/src/app/(learner)/ielts/page.tsx` — canonical IELTS home.
- `apps/web/src/app/invitations/ielts/[token]/page.tsx` — invitation entry.
- `apps/web/src/app/verify-email/` and `apps/web/src/app/forgot-password/` — identity recovery UI.
- `apps/web/src/app/admin/ielts-beta/` — invitations, release, review, calibration, support, and rollout UI.
- `packages/contracts/src/ielts-beta.contracts.ts` — shared beta contracts.

---

## Workstream A — Access and Learner Journey

### Task 1: Persist invitations, entitlements, and global release control

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_ielts_beta_access/migration.sql`
- Create: `packages/contracts/src/ielts-beta.contracts.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/ielts-beta.contracts.spec.ts`

- [ ] **Step 1: Write failing contract tests** for invitation status, entitlement status, release-control state, public invitation inspection, admin list filters, and redacted responses.
- [ ] **Step 2: Run RED:** `pnpm --filter @worklingo/contracts test -- ielts-beta.contracts.spec.ts` and confirm missing exports/schemas.
- [ ] **Step 3: Add minimal contracts** with strict enums and no raw token/hash fields in response types.
- [ ] **Step 4: Add additive Prisma models** `IeltsBetaInvitation`, `IeltsBetaEntitlement`, and singleton `IeltsBetaReleaseControl`; use token/email hashes, expiry timestamps, actor IDs, revisions, and indexes for lookup/expiry.
- [ ] **Step 5: Generate and validate migration:** `pnpm --filter @worklingo/api prisma:generate` plus the repository migration validation command; inspect SQL for drops or data rewrites.
- [ ] **Step 6: Run GREEN** for contracts and Prisma schema validation.
- [ ] **Step 7: Commit:** `feat(ielts-beta): add access persistence and contracts`.

### Task 2: Implement invitation administration and one-time claim

**Files:**

- Create: `apps/api/src/ielts-beta/ielts-beta.module.ts`
- Create: `apps/api/src/ielts-beta/application/ielts-beta-invitation.service.ts`
- Create: `apps/api/src/ielts-beta/presentation/ielts-beta-admin.controller.ts`
- Create: `apps/api/src/ielts-beta/presentation/ielts-beta-public.controller.ts`
- Create: `apps/api/src/ielts-beta/application/ielts-beta-invitation.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write failing service tests** covering create, inspect, expire, claim once, resend/replace, revoke, email mismatch, concurrent claims, and redacted audit payloads.
- [ ] **Step 2: Run RED:** targeted API test for the new service.
- [ ] **Step 3: Implement `IeltsBetaInvitationService`** with transaction-safe `createInvitation`, `inspectPublicToken`, `claimInvitation`, `revokeInvitation`, and `listInvitations`; store only SHA-256 token hashes and normalized email hashes.
- [ ] **Step 4: Add guarded admin endpoints** and anonymous token-inspection endpoint; apply existing admin authorization, audit, rate-limit, and correlation-ID patterns.
- [ ] **Step 5: Run GREEN** plus existing auth/audit tests touched by module registration.
- [ ] **Step 6: Commit:** `feat(ielts-beta): add invitation lifecycle`.

### Task 3: Add verified email identity and password recovery

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_identity_tokens/migration.sql`
- Create: `apps/api/src/notifications/domain/email-delivery.port.ts`
- Create: `apps/api/src/notifications/infrastructure/console-email.adapter.ts`
- Create: `apps/api/src/identity-verification/identity-verification.module.ts`
- Create: `apps/api/src/identity-verification/application/identity-verification.service.ts`
- Create: `apps/api/src/identity-verification/application/identity-verification.service.spec.ts`
- Modify: `apps/api/src/auth/auth.controller.ts`
- Modify: `apps/api/src/auth/auth.service.ts`
- Create: `apps/web/src/app/verify-email/page.tsx`
- Create: `apps/web/src/app/forgot-password/page.tsx`
- Create: `apps/web/src/app/reset-password/[token]/page.tsx`

- [ ] **Step 1: Write failing tests** for verification issue/consume, reset issue/consume, expiry, one-time use, enumeration-safe responses, rate limiting, session invalidation after reset, and invitation email binding.
- [ ] **Step 2: Run RED** for identity and auth test files only.
- [ ] **Step 3: Add hashed single-use token records** and implement `EmailDeliveryPort.sendVerification`, `sendPasswordReset`, and `sendIeltsInvitation`; keep console adapter local-only.
- [ ] **Step 4: Wire registration and login policy:** invitation may create an account, but entitlement activates only after the matching email is verified.
- [ ] **Step 5: Add accessible web forms** with generic success copy that does not reveal account existence.
- [ ] **Step 6: Run GREEN** for API and web identity tests.
- [ ] **Step 7: Commit:** `feat(auth): add verified email and recovery flows`.

### Task 4: Enforce IELTS beta access and activate enrollment safely

**Files:**

- Modify: `apps/api/src/learning-programs/domain/program-availability.ts`
- Modify: `apps/api/src/learning-programs/domain/program-catalog.ts`
- Modify: `apps/api/src/learning-programs/application/program-context.service.ts`
- Modify: `apps/api/src/learning-programs/application/program-context.service.spec.ts`
- Modify: `apps/api/prisma/seed-learning-programs.ts`
- Create: `apps/api/prisma/migrations/<timestamp>_set_ielts_beta_status/migration.sql`
- Create: `apps/api/src/ielts-beta/application/ielts-beta-access.service.ts`
- Create: `apps/api/src/ielts-beta/application/ielts-beta-access.service.spec.ts`

- [ ] **Step 1: Write failing policy tests** for active entitlement, expired/revoked entitlement, unverified email, paused release, and non-IELTS programs.
- [ ] **Step 2: Run RED** for program-context and access tests.
- [ ] **Step 3: Implement `IeltsBetaAccessService.canAccess(learnerId, tx?)`** and enforce it in every IELTS activation/API path.
- [ ] **Step 4: Set IELTS catalog status to `BETA` and destination to `/ielts`;** update existing database rows through an idempotent data migration rather than relying on seed `update: {}`.
- [ ] **Step 5: Create IELTS enrollment transactionally** without overwriting Foundation/Intermediate history or duplicate enrollment.
- [ ] **Step 6: Run GREEN** plus learning-program regression tests.
- [ ] **Step 7: Commit:** `feat(ielts-beta): enforce entitlement and activate program`.

### Task 5: Build the server-authoritative IELTS home journey

**Files:**

- Create: `apps/api/src/ielts-beta/application/ielts-beta-home.service.ts`
- Create: `apps/api/src/ielts-beta/application/ielts-beta-home.service.spec.ts`
- Create: `apps/api/src/ielts-beta/presentation/ielts-beta-learner.controller.ts`
- Create: `apps/web/src/app/(learner)/ielts/page.tsx`
- Create: `apps/web/src/features/ielts-beta/ielts-home.tsx`
- Create: `apps/web/src/features/ielts-beta/ielts-home.spec.tsx`
- Create: `apps/web/src/app/privacy/page.tsx`
- Create: `apps/web/src/app/terms/page.tsx`
- Modify: `apps/web/src/features/learning-programs/program-catalog.tsx`

- [ ] **Step 1: Write failing service/component tests** for orientation, bridge, practice, pathway, mock, review-pending, paused, and completed states; assert exactly one primary next action.
- [ ] **Step 2: Run RED** for the focused API and web tests.
- [ ] **Step 3: Implement one aggregate endpoint** returning entitlement, current stage, resumable artifact, review state, evidence summary, and next action from server state.
- [ ] **Step 4: Implement responsive `/ielts` UI** with status text, keyboard focus, mobile layout, safe loading/error/empty states, and no client-derived eligibility. Publish accessible Privacy Policy and Terms pages and link them before account creation.
- [ ] **Step 5: Run GREEN** and a focused Playwright journey from catalog activation to IELTS home.
- [ ] **Step 6: Commit:** `feat(ielts-beta): add canonical learner home`.

---

## Workstream B — Immutable Content, Review, and Calibration

### Task 6: Create immutable IELTS release manifests

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_ielts_release_manifest/migration.sql`
- Create: `apps/api/src/ielts-beta/application/ielts-release-manifest.service.ts`
- Create: `apps/api/src/ielts-beta/application/ielts-release-manifest.service.spec.ts`
- Modify: `apps/api/src/ielts-beta/presentation/ielts-beta-admin.controller.ts`
- Create: `apps/web/src/app/admin/ielts-beta/release/page.tsx`

- [ ] **Step 1: Write failing tests** proving a manifest pins all required published content/audio version IDs and cannot be mutated after activation.
- [ ] **Step 2: Run RED** for manifest tests.
- [ ] **Step 3: Add manifest and manifest-item models** with draft/validated/active/archived states and one active manifest constraint.
- [ ] **Step 4: Implement `validateManifest` and transactional `activateManifest`**; validation must report missing/unpublished content, absent release audio, and invalid cross-version references.
- [ ] **Step 5: Add admin preview/activate page** showing exact versions and blocking defects before confirmation.
- [ ] **Step 6: Run GREEN** plus affected lesson/audio version-isolation tests.
- [ ] **Step 7: Commit:** `feat(ielts-beta): add immutable release manifests`.

### Task 7: Harden the human mock-review queue

**Files:**

- Modify: `apps/api/src/ielts-mock/application/ielts-mock-review.service.ts`
- Modify: `apps/api/src/ielts-mock/application/ielts-mock-review.service.spec.ts`
- Modify: `apps/api/src/ielts-mock/presentation/ielts-mock-admin.controller.ts`
- Modify: `apps/web/src/app/admin/ielts-mocks/reviews/page.tsx`

- [ ] **Step 1: Write failing transition tests** for queued → claimed → completed, lease expiry/reclaim, reopen, double-claim conflict, reviewer authorization, and immutable decision history.
- [ ] **Step 2: Run RED** for mock-review service tests.
- [ ] **Step 3: Implement transaction-safe claim leases and append-only review events** while preserving existing review records.
- [ ] **Step 4: Update admin queue UI** for filters, claim ownership, lease expiry, reopen reason, and accessible conflict feedback; enforce distinct reviewer/System Admin capabilities in API authorization tests.
- [ ] **Step 5: Run GREEN** plus one admin review Playwright test.
- [ ] **Step 6: Commit:** `feat(ielts-review): harden human review workflow`.

### Task 8: Add calibration evidence and release gates

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_calibration_evidence/migration.sql`
- Create: `apps/api/src/calibration/calibration.module.ts`
- Create: `apps/api/src/calibration/application/calibration-gate.service.ts`
- Create: `apps/api/src/calibration/application/calibration-gate.service.spec.ts`
- Create: `apps/api/src/calibration/presentation/calibration-admin.controller.ts`
- Create: `apps/web/src/app/admin/ielts-beta/calibration/page.tsx`

- [ ] **Step 1: Write failing tests** for named datasets, sample counts, measured thresholds, approver identity, stale evidence, rejected evidence, and blocked release.
- [ ] **Step 2: Run RED** for calibration-gate tests.
- [ ] **Step 3: Persist append-only calibration reports** for placement, TTS, STT, and Teacher AI; store metric metadata and artifact references, not raw learner content.
- [ ] **Step 4: Implement `CalibrationGateService.evaluate(manifestId)`** using thresholds from the approved spec and require explicit human approval.
- [ ] **Step 5: Integrate gate into manifest activation** and build the admin evidence UI.
- [ ] **Step 6: Run GREEN** for calibration and manifest tests.
- [ ] **Step 7: Commit:** `feat(calibration): gate IELTS beta release on evidence`.

### Task 9: Prevent synthetic content from reaching production

**Files:**

- Modify: `apps/api/prisma/seed.ts`
- Modify: relevant IELTS seed helpers under `apps/api/prisma/`
- Create: `apps/api/src/ielts-beta/application/production-content.guard.ts`
- Create: `apps/api/src/ielts-beta/application/production-content.guard.spec.ts`

- [ ] **Step 1: Write failing tests** proving synthetic fixtures cannot be selected by a production manifest and seed commands never auto-publish/activate IELTS content.
- [ ] **Step 2: Run RED** for the production-content guard.
- [ ] **Step 3: Add explicit provenance/environment metadata** and enforce it in release-manifest validation.
- [ ] **Step 4: Make seed behavior idempotent and safe:** fixtures remain local/test-only, with no production activation side effects.
- [ ] **Step 5: Run GREEN** and inspect seed diff for destructive behavior.
- [ ] **Step 6: Commit:** `fix(content): isolate synthetic IELTS fixtures`.

---

## Workstream C — Hosted Operations, Privacy, and Support

### Task 10: Add production adapters and fail-fast configuration

**Files:**

- Create: `apps/api/src/storage/infrastructure/s3-compatible-object-storage.adapter.ts`
- Create: `apps/api/src/notifications/infrastructure/provider-email.adapter.ts`
- Create: `apps/api/src/config/production-config.schema.ts`
- Create: `apps/api/src/config/production-config.schema.spec.ts`
- Modify: `apps/api/src/storage/storage.module.ts`
- Modify: `apps/api/src/notifications/notifications.module.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write failing configuration and adapter contract tests** for missing secrets, invalid origins, secure-cookie policy, signed object access, retry classification, and local/production provider selection.
- [ ] **Step 2: Run RED** for focused config/storage/notification tests.
- [ ] **Step 3: Implement an S3-compatible adapter behind `ObjectStoragePort`** and a real email adapter behind `EmailDeliveryPort`; keep local adapters available only by explicit local configuration.
- [ ] **Step 4: Add startup validation** for database, storage, email, public URL, CORS allowlist, cookie security, token secrets, and encryption keys; never provide production defaults.
- [ ] **Step 5: Run GREEN** and build API once to catch dependency-injection/config errors.
- [ ] **Step 6: Commit:** `feat(platform): add hosted provider adapters`.

### Task 11: Implement retention and learner deletion lifecycle

**Files:**

- Create: `apps/api/src/privacy/privacy.module.ts`
- Create: `apps/api/src/privacy/application/learner-deletion.service.ts`
- Create: `apps/api/src/privacy/application/learner-deletion.service.spec.ts`
- Create: `apps/api/src/privacy/infrastructure/retention-cleanup.job.ts`
- Create: `apps/api/src/privacy/application/recording-consent.service.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_deletion_ledger/migration.sql`
- Create: `docs/runbooks/learner-data-deletion.md`

- [ ] **Step 1: Write failing tests** for explicit recording consent, future-consent withdrawal, deletion request, grace period, cancellation, due deletion, idempotent rerun, object deletion, audit preservation, and backup-restoration reapplication.
- [ ] **Step 2: Run RED** for privacy tests.
- [ ] **Step 3: Add deletion request and append-only deletion ledger records** with no recoverable answer/audio/transcript payload.
- [ ] **Step 4: Implement `recordConsent`, `withdrawFutureConsent`, `requestDeletion`, `cancelDeletion`, and `runDueDeletions`** using transactions plus retryable object-storage cleanup; block new recordings without current consent and target active-data deletion within 30 days.
- [ ] **Step 5: Add retention jobs** for invitations, identity tokens, raw audio, reports, and analytics according to spec defaults.
- [ ] **Step 6: Document backup restore procedure** requiring ledger reapplication before restored service is exposed.
- [ ] **Step 7: Run GREEN** plus existing retention/backup tests.
- [ ] **Step 8: Commit:** `feat(privacy): add retention and deletion lifecycle`.

### Task 12: Add safe problem reporting and operator support queue

**Files:**

- Create: `apps/api/src/support/support.module.ts`
- Create: `apps/api/src/support/application/problem-report.service.ts`
- Create: `apps/api/src/support/application/problem-report.service.spec.ts`
- Create: `apps/api/src/support/presentation/problem-report.controller.ts`
- Create: `apps/web/src/features/support/report-problem.tsx`
- Create: `apps/web/src/app/admin/ielts-beta/support/page.tsx`
- Create: `docs/runbooks/ielts-beta-support.md`

- [ ] **Step 1: Write failing tests** for authenticated report creation, category allowlist, payload size, redaction, rate limit, correlation ID, assignment, resolution, and authorization.
- [ ] **Step 2: Run RED** for support tests.
- [ ] **Step 3: Implement safe reports** containing references and user-entered description only; reject attachments and automatically strip known secrets/tokens.
- [ ] **Step 4: Add learner entry points** on IELTS home and error boundaries, plus an admin triage queue with assignment/status history.
- [ ] **Step 5: Add runbook** for access, checkpoint, audio, scoring, privacy, and provider incidents.
- [ ] **Step 6: Run GREEN** plus focused learner/admin component tests.
- [ ] **Step 7: Commit:** `feat(support): add IELTS beta problem reporting`.

### Task 13: Extend privacy-preserving analytics

**Files:**

- Modify: `apps/api/src/analytics/domain/pilot-metric.ts`
- Modify: `apps/api/src/analytics/application/pilot-metrics.service.ts`
- Modify: `apps/api/src/analytics/application/pilot-metrics.service.spec.ts`
- Create: `apps/api/src/analytics/domain/ielts-beta-event.ts`
- Create: `apps/web/src/app/admin/ielts-beta/analytics/page.tsx`

- [ ] **Step 1: Write failing aggregation tests** for activation, stage completion, resume, provider failure, review turnaround, mock completion, retention, and suppression when a cohort has fewer than five learners.
- [ ] **Step 2: Run RED** for analytics tests.
- [ ] **Step 3: Add allowlisted IELTS beta events and dimensions**; prohibit free-text, answers, transcript/audio, email, and raw learner identifiers. Define resume success only when restored checkpoint ID/revision matches the latest API-acknowledged post-commit checkpoint.
- [ ] **Step 4: Implement suppression at the service/query boundary** so prohibited small cells never reach API responses.
- [ ] **Step 5: Add an aggregate-only admin dashboard** with suppression labels and no learner drill-down.
- [ ] **Step 6: Run GREEN** plus log-redaction tests.
- [ ] **Step 7: Commit:** `feat(analytics): add private IELTS beta metrics`.

### Task 14: Package hosted deployment and operational monitoring

**Files:**

- Create: `infra/production/docker-compose.yml`
- Create: `infra/production/.env.production.example`
- Create: `docs/runbooks/ielts-beta-deployment.md`
- Create: `docs/runbooks/ielts-beta-backup-restore.md`
- Create: `docs/runbooks/ielts-beta-provider-outage.md`
- Modify: existing health/ops module files under `apps/api/src/ops/`
- Modify: `package.json`

- [ ] **Step 1: Write failing health/ops tests** for database, object storage, email, worker/job freshness, and degraded optional providers.
- [ ] **Step 2: Run RED** for ops tests.
- [ ] **Step 3: Add production composition** for web, API, Postgres, durable object storage, and scheduled jobs; use secrets via environment injection, not committed values.
- [ ] **Step 4: Add readiness/liveness semantics and alertable metrics** for checkpoint failures, provider error rate, review backlog, deletion backlog, and backup age.
- [ ] **Step 5: Add scripts and runbooks** for deploy, rollback, restore drill, key rotation, and provider outage.
- [ ] **Step 6: Run GREEN** and validate production configuration without launching external paid services.
- [ ] **Step 7: Commit:** `ops: package IELTS beta deployment and monitoring`.

---

## Workstream D — Pause Semantics, Qualification, and Rollout

### Task 15: Implement pause, revoke, and attempt-boundary semantics

**Files:**

- Create: `apps/api/src/ielts-beta/application/ielts-beta-release-control.service.ts`
- Create: `apps/api/src/ielts-beta/application/ielts-beta-release-control.service.spec.ts`
- Modify: IELTS session/attempt services under `apps/api/src/ielts-*/application/`
- Modify: `apps/api/src/ielts-beta/presentation/ielts-beta-admin.controller.ts`
- Modify: `apps/web/src/app/admin/ielts-beta/release/page.tsx`

- [ ] **Step 1: Write failing matrix tests** for global pause, individual revoke, active learning session, in-progress timed mock, terminal submission, provider outage, and resumed service.
- [ ] **Step 2: Run RED** for release-control and affected attempt tests.
- [ ] **Step 3: Implement optimistic-concurrency release control** with audited reason/revision; block new sessions while preserving checkpoint access for already-started learning sessions per spec.
- [ ] **Step 4: Ensure attempts are consumed only by terminal submission** and provider failures produce retryable states without duplicate scoring or version drift.
- [ ] **Step 5: Add admin pause/resume/revoke UI** requiring explicit reason and showing affected counts.
- [ ] **Step 6: Run GREEN** for the matrix and existing checkpoint/mock regressions.
- [ ] **Step 7: Commit:** `feat(ielts-beta): add safe pause and attempt semantics`.

### Task 16: Prove the complete invited learner and admin journeys

**Files:**

- Create: `apps/web/e2e/ielts-beta-invited-learner.spec.ts`
- Create: `apps/web/e2e/ielts-beta-admin-operations.spec.ts`
- Create: `apps/web/e2e/ielts-beta-mobile.spec.ts`
- Modify: Playwright fixtures/helpers under `apps/web/e2e/`

- [ ] **Step 1: Write desktop/mobile E2E tests** covering invite, Privacy/Terms visibility, verification, activation, recording consent/withdrawal, orientation, resume after reload, bridge/practice handoff, mock checkpoint, submission, pending review, completed review, and progress evidence. Assert the required “WorkLingo mock estimate” disclosure on mock start and report screens.
- [ ] **Step 2: Add admin E2E** for manifest validation/activation, invitation lifecycle, reviewer claim/complete, calibration gate, pause/resume, support triage, and aggregate analytics suppression.
- [ ] **Step 3: Run E2E and record the first genuine failure** before changing wiring.
- [ ] **Step 4: Fix only integration gaps exposed by E2E;** add unit/regression tests for every discovered defect.
- [ ] **Step 5: Run focused E2E GREEN** on desktop and mobile viewport projects.
- [ ] **Step 6: Commit:** `test(ielts-beta): cover invited beta journeys`.

### Task 17: Qualify the release and prepare the pilot handoff

**Files:**

- Create: `docs/release/ielts-beta-checklist.md`
- Create: `docs/release/ielts-beta-pilot-report-template.md`
- Create: `docs/release/ielts-beta-risk-register.md`
- Modify: `package.json`
- Modify: relevant scripts under `scripts/qualification/`

- [ ] **Step 1: Add qualification commands** for migration, authorization, accessibility, performance, security, recovery, provider-failure, and content-manifest checks; compose existing scripts instead of duplicating them.
- [ ] **Step 2: Run focused gates first:** changed-package typecheck/tests, IELTS beta E2E, `pnpm qualify:performance`, `pnpm qualify:security`, and `pnpm qualify:recovery`.
- [ ] **Step 3: Fix regressions with a failing targeted test first;** do not weaken thresholds or skip failing checks.
- [ ] **Step 4: Run final repository gate once:** `pnpm verify`.
- [ ] **Step 5: Inspect final diff and migration chain,** verify no secrets/PII/fixture publication, and run a clean production build/config validation.
- [ ] **Step 6: Complete release artifacts** with evidence links, rollback owner, support rota, invited cohort cap, success thresholds, and explicit go/no-go sign-off. Do not mark go until all blockers are closed.
- [ ] **Step 7: Request final independent code review** against the approved spec and resolve High/Critical findings.
- [ ] **Step 8: Commit:** `docs(release): qualify IELTS controlled beta`.

## Dependency Order and Parallelism

1. Tasks 1–5 are sequential because they share contracts, identity, access, and learner routing.
2. After Task 5, Tasks 6–9 may be implemented as one content lane and Tasks 10–14 as one operations lane, but shared Prisma/module files must be serialized by the coordinator.
3. Task 15 depends on access plus attempt/session services.
4. Task 16 starts only after Tasks 6–15 are integrated.
5. Task 17 is the sole full-verification and release-sign-off gate.

## Definition of Done

- An invited, email-verified adult learner can activate IELTS, follow one canonical next action, resume durable progress, complete a pinned mock, and receive a human-reviewed result.
- An uninvited, expired, revoked, or paused learner cannot start protected IELTS work through either UI or direct API calls.
- Admins can atomically activate a fully validated immutable content release, operate review/support queues, inspect approved calibration evidence, and pause/resume the beta with an audit trail.
- Production configuration uses durable hosted database/object storage and a real email provider behind ports; startup fails safely when required configuration is absent.
- Retention/deletion, redacted logs, small-cohort suppression, backups, restore, monitoring, rollback, and incident runbooks have executable evidence.
- Focused qualification passes, then the final `pnpm verify` passes once, with no unresolved High/Critical review findings.
