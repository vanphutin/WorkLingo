# Beginner R1.2b deployment readiness

Date: 2026-10-30. Mission: WL-R12B-EVIDENCE-CLOSURE-001 / MND-20261030-004.
Decision: **NOT_READY — intended deployment target and target-tested rollback are unverified.** No merge, push, deploy, infrastructure creation, production connection, credential access or production health probe was performed.

## Observed tracked configuration

| Responsibility | Read-only evidence | Remaining target requirement |
| --- | --- | --- |
| Frontend | `apps/web/next.config.ts`: Next rewrite through WORKLINGO_API_URL; loopback fallback; separate E2E build directory; 150-second proxy timeout. | Named existing host/service, immutable build/revision, runtime/version, verified API origin and process supervisor. A local dev browser is not a hosted release. |
| API | `apps/api/src/main.ts`: Nest global `/api/v1`, validation pipe, safe logger, listen on 127.0.0.1. | Named host/process and reverse proxy reachability; origin/routing/timeouts and restart policy. Container routing cannot assume a loopback listener is externally reachable. |
| Database | `infra/docker-compose.yml`: PostgreSQL 17 Alpine, loopback-bound port and named persistent volume. | Existing intended database identity/region/backup policy, migration compatibility, least-privilege access and recovery evidence. Local compose is not a production target declaration. |
| Object storage | `apps/api/src/storage/storage.module.ts`: LocalObjectStorageAdapter using configured dataDir. | Persistent private mounted path, owner/access controls, capacity, retention, backup and restoration relationship with database. No remote bucket is established by this configuration. |
| Domain/TLS | No target/domain/TLS specification established by the inspected tracked files. | Existing domain, DNS, certificate owner/renewal, HTTPS routing and access verification without exposing credentials. |
| CI/CD | No `.github/workflows` directory in this checkout; package scripts and local runbooks exist. | Identify actual existing deployment system or documented controlled manual pipeline, access owner, checks, immutable artifact provenance and approval enforcement. Absence of this directory does not prove that no external CI exists. |
| Health | Health service queries DB then puts/deletes a storage probe; expected route `/api/v1/health`. | Intended-target safe probe authorization, expected response, timeout/failure behavior and alert integration. This endpoint mutates storage, so it was not called against any unknown environment. |
| Logging/monitoring | SafeLoggerService emits timestamped JSON stdout and redacts sensitive keys, connection strings, tokens, emails and IPs with depth/size limits. | Actual log sink/retention/access, privacy review, uptime/latency/error/storage/DB/worker alerts, recipients and incident ownership. Code-level redaction is not verification of deployed logging. |
| Rollback | `docs/PILOT_RUNBOOK.md`: prior compatible code revision; additive migrations prefer forward fix; restore into empty isolated target and verify manifests/checksums before deliberate switch. | Prior immutable known-good artifact and exact intended-target rehearsal with operator, restore point, compatibility evidence, measured recovery and rollback acceptance. |

`docs/RELEASE_CHECKLIST.md` contains older Increment 5 technical qualification and a separate R1.2b NOT_READY assessment. Historical local recovery drills, build reports and synthetic browser runs do not satisfy deployment/rollback gates on an unspecified intended target. No existing service credentials, `.env` or private infrastructure were inspected.

## Concrete handoff contract

The owner/operator must supply a non-secret deployment manifest naming the existing frontend/API services, database and persistent storage identities, region, domain/TLS owner, runtime, immutable desired and previous artifact revisions, deployment mechanism and authorized operator. Supply configuration variable names and verification attestations; keep secret values outside reports/Git. Bind database schema and lesson/audio versions to the release manifest and preserve the baseline migrations and product contract.

Before release, demonstrate environment separation, correct API routing, authenticated learner/admin smoke flows, exact published content, persistent checkpoint/restart recovery, storage accessibility/permissions and bounded provider behavior. Verify redacted logs and alerts using synthetic data in the authorized target. Capture timestamped checks, artifact hashes, owner and result without participant data. The health endpoint's write/delete side effect must be scoped to the authorized target/storage.

Prepare a backup containing the consistent database dump and referenced files with checksums and recovery timestamp. Restore first into an authorized empty isolated schema/data path, verify identity/counts/checksums and application compatibility, and measure recovery against owner-approved RPO/RTO. Do not infer zero data loss from a successful process restart or filesystem flush.

Rehearse deployment failure and rollback on the intended target: record the known-good revision, freeze/version boundary, migration compatibility decision, trigger/owner, traffic/process switch, smoke checks and recovery outcome. Prefer forward fix after additive migrations unless compatibility with the previous code is demonstrated. Preserve new observations and audit history; no destructive reset, silent data deletion, or unverified overwrite. Record the actual target and elapsed recovery; local isolated drills alone cannot close this gate.

The current mission permits conditional release only when **all fifteen gates** pass, including eight qualified lessons, calibrated provider, budget, frozen oracle, expert QA, actual Gate C24, evaluator context, durability, DB integration/E2E, independent review, no P1/P2, full regression, commit audit, deployment target and tested rollback. This report specifies missing evidence; it does not grant deployment or declare those other gates satisfied.

## Verification and scope

Read-only inspection: compose, API bootstrap, health service, storage module, safe logger, Next configuration, local pilot runbook, release checklist, current authorization/scope/plan and the Gate C/browser reports listed in `beginner-r12b-gate-c-final-report.md`. No deployment/recovery scripts executed, no infrastructure created and no production data touched. Gate C tooling independently passed 31/31 safe tests; this supplies no hosted readiness result. The retained historical six browser evidence files matched their recorded SHA256 values. Current full regression and disposable DB results belong to the separate mission evidence, not this inspection.
