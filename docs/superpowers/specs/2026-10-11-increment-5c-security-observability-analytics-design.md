# Increment 5C: Security, Observability, and Privacy-Safe Analytics Design

**Date:** 2026-10-11

**Status:** Proposed for review

**Scope:** Local-first abuse controls, safe request logging, Admin operational visibility and aggregate pilot metrics

## 1. Outcome

The local MVP fails safely under repeated authentication/provider-heavy requests, gives operators enough information to diagnose jobs and provider readiness, and records only aggregate product signals needed for a controlled pilot. No subsystem becomes a second source of truth for jobs, learning progress or audit history.

## 2. Security model

- Add a centralized request context with generated/validated correlation ID. Incoming IDs are accepted only when bounded ASCII/UUID-like; otherwise replace them.
- Add a structured safe logger with recursive key/value redaction and maximum depth/length. Logs never include authorization/cookie headers, credentials, tokens, email, password, raw request bodies, learner text, transcript, recording/storage bytes or provider response bodies.
- Add durable PostgreSQL rate-limit buckets. Authentication is keyed by HMAC of normalized client address plus route using a dedicated `RATE_LIMIT_HASH_KEY`; authenticated AI/media mutations are keyed by actor plus operation. Raw IP is never persisted. Local setup generates the key; production-mode startup fails closed when it is absent.
- Default `TRUST_PROXY_HOPS=0`. Forwarded headers are ignored unless the operator explicitly configures trusted hops.
- Limits are configured server-side with conservative local defaults, return `429` plus bounded `Retry-After`, and use database time. Health/readiness and static frontend assets are not rate-limited.
- Rate-limit records have bounded retention and cleanup; provider retry/backoff remains independent.

## 3. Observability architecture

Add `OperationsModule` with Admin-only read APIs derived from `Job`, `JobAttempt`, adapter readiness and storage/database health. It never mutates leases, attempts, provider configuration or learner submissions.

Endpoints:

- `GET /api/v1/admin/operations/summary`: counts by job state/type, oldest pending age, retry-wait count, terminal failures, database/storage readiness and configured provider readiness without credentials.
- `GET /api/v1/admin/operations/jobs`: opaque cursor pagination with type/status/errorCode/date filters and safe resource references.
- `GET /api/v1/admin/operations/jobs/:id`: safe attempt timeline; no payload/result/raw provider body.

Provider status distinguishes `configured`, `unavailable`, and `degraded-from-recent-failures`. It is evidence, not an active probe that spends quota. No production endpoint can force failure, change provider, release a lease or replay arbitrary payloads.

## 4. Privacy-safe analytics

Use server-owned allowlisted metric updates, not a public arbitrary event ingestion endpoint. Business services increment `PilotMetricDaily` aggregates in the same transaction or through an idempotent metric receipt. Dimensions are limited to date, event type, skill, duration bucket, mission/level code and safe outcome code. No user ID is required in the aggregate table.

Initial events: registration completed, onboarding method confirmed, learning session started/completed/resumed, placement confirmed, evaluation terminal outcome, content import validated/published and engagement target met. Week-1/week-4 retention is computed as an aggregate from existing user/study-day records inside bounded date cohorts; no second user-level analytics identity or raw-content event store is created.

Admin API `GET /api/v1/admin/analytics/pilot?from=&to=` returns bounded daily aggregates. Retention is 180 days by default with explicit cleanup. Analytics failure must not roll back learner progress; an idempotent outbox/receipt may be used where same-transaction aggregation would couple availability.

## 5. Web experience

Add `/admin/operations` and `/admin/analytics`. Operations leads with actionable failures, queue age and provider readiness, then filterable job details. Analytics shows totals/trends with exact definitions and “aggregate local data” labeling. Both retain functionality without auto-refresh storms: manual refresh plus bounded polling only while explicitly enabled and visible.

## 6. Error and privacy behavior

Authorization runs before resource/filter parsing where existence could leak. Foreign/non-admin requests receive standard denial. Unexpected errors carry correlation ID but no stack/provider details. Pagination/filter limits prevent unbounded queries. Database indexes support job status/time and metric date/type access.

## 7. Testing and acceptance

Tests cover concurrent limit consumption, window rollover, cleanup, proxy spoofing, actor isolation, `Retry-After`, redaction of nested/cyclic/oversized objects, correlation propagation, role denial, job cursor stability, safe attempt serialization, provider readiness without secret leakage, analytics allowlist/idempotency and placement/learning metric distinction.

Security fixtures include path traversal/upload abuse and prompt-injection strings treated only as data. E2E verifies Admin operations/analytics desktop/mobile and that rate limits recover without losing saved submissions. Log-capture tests assert forbidden values never occur.

Accepted when controls are deterministic, operational pages reveal no sensitive payload, analytics definitions are honest, full verification passes and no Critical/Important security/privacy/performance finding remains.

## 8. Non-goals

SIEM integration, distributed tracing vendor, Redis, cloud telemetry, arbitrary client events, user-level surveillance, social analytics, remote provider control and automated incident response are excluded.
