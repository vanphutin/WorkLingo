# Security and Privacy Review

Date: 2026-10-12
Decision scope: local-first controlled pilot, not SOC/ISO certification.

## Route and role matrix

| Route family | Access |
|---|---|
| `/health`, `/auth/register`, `/auth/login` | Public; auth mutations rate limited |
| `/auth/logout`, `/me`, `/me/**`, `/learning-sessions/**`, `/activities/**`, `/attempts/**`, `/recordings/**`, `/jobs/:id` | Authenticated owner; ownership/IDOR tests apply |
| `/admin/content-imports/**`, `/admin/lesson-versions/**`, `/admin/audio-artifacts/**`, `/admin/audio-settings` | Content/System Admin |
| `/admin/curriculum/**`, `/admin/audit-events`, `/admin/operations/**`, `/admin/analytics/**` | Content/System Admin |

## Verified controls

- Session cookies and role/owner guards; learner/Admin denial integration tests.
- PostgreSQL-backed atomic rate limits with HMAC subjects; `TRUST_PROXY_HOPS=0` default and production hash-key requirement.
- Correlation IDs and normalized safe errors.
- Recursive log redaction for credentials, bearer tokens, email, IP/connection data, transcript and raw learner responses.
- Upload type/signature/size policy and local path containment tests.
- Operations endpoints are GET-only and expose allowlisted payload fields.
- Analytics stores closed, server-owned aggregate dimensions and idempotency receipts; no public ingestion endpoint.
- Tracked-file scan rejects committed non-example environment files and private-key blocks.

## Findings

| Severity | Finding | Resolution |
|---|---|---|
| Important | Operations pagination forwarded numeric query values as strings under production `tsx`, causing a safe 500 | Fixed with service-boundary numeric normalization and regression test |
| Important | Logger retained database host/user details and learner transcript/response keys | Redaction expanded; forbidden-value test passes |
| Moderate | Dependency advisories can change independently of source | Re-run package audit before each external deployment; no cloud/public deployment is approved here |

No unresolved Critical or Important finding remains in this review. Live provider security and internet-facing reverse-proxy configuration remain outside the local pilot.

Command: `pnpm qualify:security`.
