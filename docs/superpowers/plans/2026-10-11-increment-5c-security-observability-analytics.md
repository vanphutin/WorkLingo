# Increment 5C Security, Observability and Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add durable abuse controls, privacy-safe request diagnostics, Admin operations visibility and bounded aggregate pilot analytics.

**Architecture:** Introduce common request context/log redaction, PostgreSQL rate-limit buckets, read-only operations queries over existing job/provider state and server-owned aggregate metrics. Keep jobs, learning progress and audit history as their existing sources of truth.

**Tech Stack:** TypeScript, NestJS/Express, Prisma/PostgreSQL, Node crypto, Zod contracts, Next.js 16/React, Vitest, Supertest, Playwright

**Spec:** `docs/superpowers/specs/2026-10-11-increment-5c-security-observability-analytics-design.md`

## Global Constraints

- Raw client IP, authorization/cookie headers, credentials, tokens, email, request bodies, learner text, transcript, recordings and provider bodies must never be persisted or logged.
- Auth limit keys use HMAC-SHA256 with a dedicated `RATE_LIMIT_HASH_KEY`; production startup fails when the key is missing.
- `TRUST_PROXY_HOPS` defaults to `0`; forwarded addresses are ignored until explicitly configured.
- Limits use database time, durable PostgreSQL buckets, bounded retention and `429` with bounded `Retry-After`.
- Operations endpoints are Admin-only reads and cannot replay, release, mutate providers or expose job payload/result.
- Pilot analytics accept only server-owned allowlisted dimensions and retain aggregate rows for 180 days by default.
- Analytics failure cannot roll back learner progress or publication.
- Every unexpected safe error includes correlation ID without stack/provider details.

## Review Focus

- Many concurrent requests hit the last rate-limit token: accepted count never exceeds the configured limit.
- A spoofed `X-Forwarded-For` arrives with `TRUST_PROXY_HOPS=0`: the supplied address cannot change the bucket key.
- A nested/cyclic/oversized object contains secrets under mixed-case keys: safe logger output contains none of the forbidden values.
- Jobs share timestamps while new rows arrive between cursor pages: each job appears once with deterministic ordering.
- An analytics increment is retried after progress committed: aggregate count changes once and learner progress remains successful if analytics is unavailable.

---

### Task 1: Add correlation context and recursive safe logging

**Files:**
- Create: `apps/api/src/common/request-context/request-context.module.ts`
- Create: `apps/api/src/common/request-context/correlation-id.middleware.ts`
- Create: `apps/api/src/common/request-context/correlation-id.middleware.spec.ts`
- Create: `apps/api/src/common/logging/safe-logger.service.ts`
- Create: `apps/api/src/common/logging/safe-logger.service.spec.ts`
- Create: `apps/api/src/common/http/safe-exception.filter.ts`
- Create: `apps/api/src/common/http/safe-exception.filter.spec.ts`
- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces: `getCorrelationId(request): string`; response header `X-Correlation-ID`; `SafeLoggerService.log/warn/error(message, context?)`; global safe exception response `{ statusCode, code, message, correlationId }`.

- [ ] **Step 1: Write failing middleware/logger/filter tests**

Cover valid bounded inbound IDs, invalid/non-ASCII/oversized replacement, generated UUID, propagation to response/error, recursive mixed-case secret keys, arrays, cycles, depth/string/collection limits and forbidden-value absence in captured output.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/common/request-context src/common/logging src/common/http/safe-exception.filter.spec.ts`

- [ ] **Step 3: Implement context, redaction and safe errors**

Use request-scoped data without adding a telemetry vendor. Preserve intentional current domain error codes/messages while normalizing unexpected errors.

- [ ] **Step 4: Run GREEN plus auth/content/Teacher AI regressions**

Run Step 2 and the auth, content import/publish and Teacher AI API integration tests.

- [ ] **Step 5: Checkpoint**

Capture log output and search for fixture secrets; record the checkpoint without committing.

### Task 2: Add durable PostgreSQL rate limiting

**Files:**
- Create: `apps/api/prisma/migrations/20261011000200_increment_5c_rate_limits/migration.sql`
- Create: `apps/api/src/common/rate-limit/rate-limit.module.ts`
- Create: `apps/api/src/common/rate-limit/rate-limit.service.ts`
- Create: `apps/api/src/common/rate-limit/rate-limit.service.spec.ts`
- Create: `apps/api/src/common/rate-limit/rate-limit.guard.ts`
- Create: `apps/api/src/common/rate-limit/rate-limit.decorator.ts`
- Create: `apps/api/src/common/rate-limit/rate-limit-cleanup.service.ts`
- Create: `apps/api/test/integration/rate-limit.integration.spec.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/common/config/app-config.schema.ts`
- Modify: `apps/api/src/common/config/app-config.schema.spec.ts`
- Modify: `scripts/setup-local.ps1`
- Modify: `.env.example`
- Modify: `apps/api/src/auth/auth.controller.ts`
- Modify: `apps/api/src/content-authoring/content-authoring.controller.ts`
- Modify: `apps/api/src/learning-sessions/learning-sessions.controller.ts`
- Modify: `apps/api/src/teacher-ai/evaluations.controller.ts`

**Interfaces:**
- Produces: `RateLimitService.consume(input: { scope; subjectHash; limit; windowSeconds }): Promise<{ allowed; remaining; retryAfterSeconds }>`; route metadata for auth and actor-heavy operations; cleanup of expired buckets.

- [ ] **Step 1: Write failing config/schema/service/integration tests**

Assert production key requirement, local generated/test key acceptance, proxy default, HMAC key stability without raw address, concurrent exact limit, route isolation, actor isolation, database-time rollover, bounded Retry-After, 429 body with correlation ID, health exclusion and cleanup retention.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/common/config/app-config.schema.spec.ts src/common/rate-limit test/integration/rate-limit.integration.spec.ts`

- [ ] **Step 3: Add additive schema/config and atomic consume query**

Normalize the socket address according to explicitly trusted proxy hops, HMAC it before database use and upsert/lock one `(scope,subjectHash,windowStart)` bucket using database time.

- [ ] **Step 4: Apply conservative route policies and run GREEN**

Limit login/register by address+route and authenticated AI/media mutations by actor+operation. Do not rate-limit health/readiness or static web assets.

- [ ] **Step 5: Checkpoint**

Inspect persistence and logs to prove no raw address or header value remains.

### Task 3: Expose read-only Admin operations evidence

**Files:**
- Create: `packages/contracts/src/admin-operations.contracts.ts`
- Create: `packages/contracts/src/admin-operations.contracts.spec.ts`
- Create: `apps/api/src/operations/operations.module.ts`
- Create: `apps/api/src/operations/admin-operations.controller.ts`
- Create: `apps/api/src/operations/application/operations-query.service.ts`
- Create: `apps/api/src/operations/application/operations-query.service.spec.ts`
- Create: `apps/api/src/operations/dto/operations-query.dto.ts`
- Create: `apps/api/test/integration/admin-operations-api.integration.spec.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Produces: `AdminOperationsSummaryDto`, `AdminJobPageDto`, `AdminJobDetailDto`; `GET /api/v1/admin/operations/summary`, `/jobs`, `/jobs/:id`.

- [ ] **Step 1: Write failing contract/query/API tests**

Cover counts by state/type, oldest pending age, retry-wait/terminal failure totals, database/storage/configured provider readiness, degraded recent failure evidence, Admin role denial, stable cursor/filter/limit behavior and safe attempt timeline without payload/result/credentials/raw provider data.

- [ ] **Step 2: Run RED**

Run contracts tests and `pnpm --filter @worklingo/api exec vitest run src/operations test/integration/admin-operations-api.integration.spec.ts`.

- [ ] **Step 3: Implement selected-field bounded queries and readiness adapters**

Provider readiness reads configuration and recent sanitized attempts; it never makes a billable network probe. Reuse health/storage abstractions without writing health probe artifacts outside their existing policy.

- [ ] **Step 4: Run GREEN, lint and typecheck**

Run Step 2 plus API lint/typecheck.

- [ ] **Step 5: Checkpoint**

Verify controllers expose GET routes only and no job/provider mutation was added.

### Task 4: Record idempotent privacy-safe pilot aggregates

**Files:**
- Create: `apps/api/prisma/migrations/20261011000300_increment_5c_pilot_analytics/migration.sql`
- Create: `packages/contracts/src/admin-analytics.contracts.ts`
- Create: `packages/contracts/src/admin-analytics.contracts.spec.ts`
- Create: `apps/api/src/analytics/analytics.module.ts`
- Create: `apps/api/src/analytics/domain/pilot-metric.ts`
- Create: `apps/api/src/analytics/domain/pilot-metric.spec.ts`
- Create: `apps/api/src/analytics/application/pilot-metrics.service.ts`
- Create: `apps/api/src/analytics/application/pilot-metrics.service.spec.ts`
- Create: `apps/api/src/analytics/application/pilot-retention.service.ts`
- Create: `apps/api/src/analytics/admin-analytics.controller.ts`
- Create: `apps/api/test/integration/pilot-analytics.integration.spec.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `packages/contracts/src/index.ts`
- Modify: `apps/api/src/auth/application/auth.service.ts`
- Modify: `apps/api/src/onboarding/application/onboarding.service.ts`
- Modify: `apps/api/src/onboarding/application/placement-attempts.service.ts`
- Modify: `apps/api/src/learning-sessions/application/session-creation.service.ts`
- Modify: `apps/api/src/learning-sessions/application/learning-sessions.service.ts`
- Modify: `apps/api/src/teacher-ai/application/evaluation.service.ts`
- Modify: `apps/api/src/content-authoring/application/content-imports.service.ts`
- Modify: `apps/api/src/content-authoring/application/content-publisher.service.ts`
- Modify: `apps/api/src/engagement/application/study-day-projector.service.ts`
- Modify: `apps/api/test/integration/backup-restore.integration.spec.ts`

**Interfaces:**
- Produces: `PilotMetricsService.record(input, tx?): Promise<void>` with a closed event/dimension union; `PilotRetentionService.summarize(from,to)`; `GET /api/v1/admin/analytics/pilot?from=&to=`.

- [ ] **Step 1: Write failing schema/domain/integration tests**

Cover every allowlisted event, rejection of arbitrary dimensions, learning/placement distinction, idempotent replay, date/event/skill/duration/mission/level/outcome uniqueness, no user/raw-content columns, analytics failure isolation, 180-day cleanup and exact Week-1/Week-4 cohort definitions from User plus LearnerStudyDay.

- [ ] **Step 2: Run RED**

Run contracts tests and focused analytics/integration tests.

- [ ] **Step 3: Add aggregate persistence and server-owned instrumentation**

Use one idempotency receipt per source transition. Prefer same transaction when it cannot couple availability; otherwise enqueue an idempotent aggregate update. Never add a public ingestion endpoint.

- [ ] **Step 4: Implement bounded analytics query/retention and run GREEN**

Date ranges must be valid and capped; responses include metric definitions and counts only.

- [ ] **Step 5: Run cross-feature regressions and checkpoint**

Run onboarding, placement, learning session, Teacher AI, publishing and engagement tests. Verify identical product results when metric recording is forced to fail.

### Task 5: Build Admin operations and analytics pages

**Files:**
- Create: `apps/web/src/app/(admin)/admin/operations/page.tsx`
- Create: `apps/web/src/app/(admin)/admin/analytics/page.tsx`
- Create: `apps/web/src/features/admin-operations/operations-workspace.tsx`
- Create: `apps/web/src/features/admin-operations/operations-workspace.test.tsx`
- Create: `apps/web/src/features/admin-analytics/analytics-workspace.tsx`
- Create: `apps/web/src/features/admin-analytics/analytics-workspace.test.tsx`
- Create: `apps/web/src/lib/api/admin-operations-client.ts`
- Create: `apps/web/src/lib/api/admin-analytics-client.ts`
- Modify: `apps/web/src/app/(admin)/layout.tsx`
- Modify: `apps/web/src/features/admin-content/admin.css`

**Interfaces:**
- Consumes: Tasks 3–4 APIs/contracts.
- Produces: responsive operations summary/job filters/detail timeline and daily aggregate analytics with definitions, manual refresh and opt-in visible-only bounded polling.

- [ ] **Step 1: Write failing component tests**

Assert actionable failure ordering, queue age, provider states, job filters/cursors/details, no unsafe payload rendering, aggregate-local-data labeling, exact metric definitions, valid date range behavior, manual refresh, disabled polling by default, visibility pause, retry/error/empty states and keyboard/mobile access.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/web test --run src/features/admin-operations/operations-workspace.test.tsx src/features/admin-analytics/analytics-workspace.test.tsx src/app/'(admin)'/layout.test.tsx`

- [ ] **Step 3: Implement clients and pages**

Keep polling interval bounded to at least 15 seconds and only while the explicit toggle is enabled and `document.visibilityState === 'visible'`.

- [ ] **Step 4: Run GREEN, lint, typecheck and build**

Run Step 2 plus web lint/typecheck/build.

- [ ] **Step 5: Checkpoint**

Inspect network calls for refresh storms and verify no sensitive job fields reach component props.

### Task 6: Qualify 5C abuse, privacy and Admin journeys

**Files:**
- Create: `apps/web/e2e/admin-operations-analytics.spec.ts`
- Create: `apps/api/test/integration/log-redaction.integration.spec.ts`
- Create: `apps/api/test/integration/security-abuse.integration.spec.ts`
- Modify: `docs/API_CONTRACTS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/IMPLEMENTATION_ROADMAP.md`
- Modify: `docs/LOCAL_DEVELOPMENT.md`
- Modify: `docs/TEST_STRATEGY.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: Tasks 1–5 and completed 5A2/5B flows.
- Produces: reproducible security/privacy evidence and desktop/mobile Admin operations/analytics journeys.

- [ ] **Step 1: Add failing abuse and redaction tests**

Use path traversal, MIME/signature mismatch, oversized upload, proxy spoof, prompt-injection strings as inert data, forbidden log fixtures and rate-limit recovery that preserves already-saved submissions.

- [ ] **Step 2: Add failing desktop/mobile E2E**

Verify operations summary/job detail, analytics range/definitions, manual refresh, role denial and a rate-limited action becoming available after its bounded window without losing persisted work.

- [ ] **Step 3: Run RED and fix only exposed 5C behavior**

Run focused API and Playwright specifications; retain all abuse/privacy assertions.

- [ ] **Step 4: Document configuration, retention and definitions**

Document correlation IDs, redaction, trust proxy, local key generation, limit policies, cleanup, provider readiness evidence and each pilot metric/retention definition.

- [ ] **Step 5: Run the 5C gate and review**

Run `pnpm verify`. Search captured logs and repository diff for fixture secrets. Review correctness, maintainability, architecture, security/privacy and performance; fix all Critical/Important findings and record results without committing.
