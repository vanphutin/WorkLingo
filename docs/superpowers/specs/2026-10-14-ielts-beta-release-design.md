# IELTS Beta Release Design

**Status:** Proposed for product-owner approval  
**Target cohort:** 20–30 invited adult learners  
**Pilot duration:** Four weeks  
**Release posture:** Controlled hosted Beta, not general availability

## Intent

Turn the technically complete IELTS Phase 1–8 implementation into an operable, safe and measurable
Beta for real learners. The Beta proves that learners can enter the IELTS pathway, retain progress,
complete meaningful four-skill work and receive trustworthy feedback without confusing WorkLingo's
mock estimates with official IELTS results.

This is a release and validation increment. It does not add another learning engine or expand the
exam curriculum before the existing journey has been exercised by real users.

## Product promise

An invited learner can choose IELTS, understand why a stage is locked, progress through Foundation,
Orientation, Bridge, Integrated Practice, Band Pathway and Academic Full Mock, and safely resume
after leaving or losing connectivity. Admins can publish every required content family, operate the
review queue and diagnose failures. Every score remains explicitly labelled as a WorkLingo mock
estimate.

## Goals

1. Release IELTS as `BETA` to an invitation-controlled cohort.
2. Provide one coherent IELTS home that explains the journey and exposes the next valid action.
3. Publish a complete, owned or licensed content chain with release-ready audio.
4. Operate the product on hosted PostgreSQL and durable object storage with tested backup/restore.
5. Provide email verification, password recovery, consent, privacy controls and a support path.
6. Calibrate placement and Teacher AI with named human reviewers before relying on their output.
7. Measure activation, learning continuity, retention and operational failures without storing raw
   sensitive learning content in analytics.
8. Roll back access or providers without losing learner history.

## Non-goals

- General availability or unrestricted self-service signup into IELTS.
- Official IELTS scoring, certification equivalence or Test Report Forms.
- IELTS General Training; the Beta remains Academic-first.
- Payment, subscriptions, public leaderboards, community or social feeds.
- Native mobile applications; responsive web is the Beta client.
- Microservices or provider-specific business logic outside existing ports.
- Unlimited AI conversation or automatic final bands for Writing and Speaking.

## Anti-goals

- Do not unlock IELTS merely by changing a database status.
- Do not allow learners to jump directly into Full Mock without prerequisite evidence.
- Do not silently substitute synthetic test content in a learner-facing release.
- Do not let provider, network or browser failures consume an attempt or erase progress.
- Do not collect raw recordings, transcripts or written responses in product analytics.
- Do not call a release successful because automated tests pass while content or calibration remains
  unapproved.

## Current state

Phases 1–8 supply the complete technical path: program enrollment, curriculum foundation,
Foundation learning, Orientation, Bridge, Integrated Practice, Band Pathway and Academic Full Mock.
The implementation is deliberately non-public:

- IELTS is seeded as `IN_DEVELOPMENT`.
- The server-side approved-destination policy only admits Intermediate.
- IELTS content seeds create drafts; Admin publication remains mandatory.
- Prerequisite gates prevent skipping stages.
- Phase 6–8 commits are not yet integrated into `main`.
- Human calibration, licensed content approval and hosted operations are release gates.

## Release model

### Pilot population

The initial Beta is limited to invited adults (18+) located in Vietnam. It is not designed for
children, schools acting in loco parentis or users in additional jurisdictions. Expanding geography
or admitting minors requires a separate privacy and operations review.

### Program state

Add an explicit server-authorized IELTS destination `/ielts` and release the program as `BETA`.
Program status alone never grants access. Access also requires an active Beta entitlement associated
with the authenticated learner.

`AVAILABLE` remains reserved for a later general-availability decision.

### Cohort entitlement

Use a durable, auditable entitlement rather than environment-only email lists:

- program ID;
- learner ID;
- status: `INVITED`, `ACTIVE`, `PAUSED`, or `REVOKED`;
- invitation and activation timestamps;
- optional expiry date;
- actor and reason for Admin changes.

An Admin can invite or revoke a learner. Revocation blocks new IELTS activity but never deletes
history. Existing data remains available to authorized support and can be reactivated.

Invitations are addressed to an email before an account exists. Store only a normalized-email hash,
single-use token hash, expiry, inviter and status. The link expires after seven days. On registration
and email verification, the server atomically binds the invitation to the new learner and activates
the entitlement. It must not reveal whether an unrelated email already has an account.

### IELTS home

`/ielts` is the single learner entry point. It displays the ordered journey:

```text
Foundation checkpoint
→ IELTS Orientation
→ IELTS Bridge
→ Integrated Practice
→ Band Pathway
→ Academic Full Mock
```

Each stage shows `Completed`, `Continue`, `Ready`, or `Locked`, with one plain-language reason and one
next action. The server is authoritative; the UI does not infer eligibility from local state.

### Existing learner safety

Program activation must not overwrite Intermediate mastery, sessions or evidence. Program context
is switched through the existing enrollment model. Every active IELTS session remains pinned to its
immutable content version across publication changes and deployment.

## Content release bundle

The Beta cannot open until Admin has validated and published one complete compatible bundle:

1. IELTS Orientation with approved narration/media.
2. Four required Bridge modules covering Listening, Reading, Writing and Speaking.
3. Integrated Practice profiles for 60, 90, 120 and 150 minutes.
4. Seven-stage Band Curriculum through the 9.0 target pathway.
5. At least one copyright-safe IELTS Academic Full Mock with release-ready Listening audio.

Every bundle item records reviewer, approval timestamp and content/version identity. Publishing a
replacement must not alter sessions or attempts already pinned to an earlier version.

Synthetic fixtures remain test-only. Production seeding must not publish them automatically.

Represent the approved set as a first-class immutable release manifest containing every constituent
version ID. Activation is atomic: the server validates the whole manifest, then switches the current
Beta bundle in one transaction. Existing sessions retain their individually pinned versions.

## Scoring and calibration

### Placement

The current placement policy remains an internal recommendation, not CEFR certification. A named
human reviewer evaluates a representative calibration set and records acceptance, exceptions and
policy version before Beta activation.

### Teacher AI

Teacher AI may provide formative feedback. It may not independently finalize Writing or Speaking
section bands. A teacher/content reviewer completes productive-skill review for Full Mock attempts.

Calibration uses consented, de-identified samples and records provider/model/prompt/rubric versions.
Live-provider results must meet the documented acceptance ranges before that provider becomes the
Beta default. Fake providers remain test-only.

The productive-skill review queue uses `PENDING`, `CLAIMED`, `COMPLETED` and `REOPENED`. One reviewer
claims an attempt with an expiring lease and completes Writing Task 1, Writing Task 2 and Speaking in
one revision-protected transaction. The learner report remains pending until all three evaluations
are complete. A System Admin may reassign an expired claim or reopen a completed review; every
change is audited. Reviewers may replace AI suggestions, and human rubric values are authoritative.

### Calibration acceptance

Before Beta, named reviewers approve a versioned report with at least:

- 30 placement cases balanced across the supported Foundation/B1 boundary, with at least 80% exact
  agreement and 95% agreement within one adjacent internal level against the human panel;
- 20 TTS scripts and three supported voices with at least 95% reviewer-rated intelligibility and no
  critical pronunciation error in target Language Blocks;
- 30 consented STT samples across quiet/noisy and desktop/mobile conditions, with critical target
  phrase omission below 5%;
- 30 Writing/Speaking samples where at least 90% of AI feedback is judged safe and evidence-grounded,
  and at least 80% of rubric suggestions fall within one band of the human panel.

Two named reviewers resolve disagreements. Product, content and calibration owners must all approve
exceptions; an exception cannot weaken safety or disclosure requirements.

### Disclosure

Every mock report and relevant start screen displays:

> WorkLingo mock estimate — not an official IELTS result or Test Report Form.

## Hosted Beta architecture

Keep the modular monolith and provider ports. The deployment adds operational durability, not new
domain architecture:

- one hosted Next.js web application;
- one hosted NestJS API and background job worker;
- managed PostgreSQL with encrypted backups;
- private durable object storage for audio and consented recordings;
- HTTPS, secure cookies, restricted CORS and secret management;
- transactional email for verification, invitations and password recovery;
- structured redacted logs, health checks and failed-job/provider status;
- alerting for authentication, storage, database, job and provider failure rates.

Development remains local-first. Production credentials and data never become a local development
default.

## Privacy and learner control

Before account creation or recording:

- publish Privacy Policy and Terms;
- obtain explicit recording consent;
- explain retention and evaluation use;
- allow recording consent withdrawal for future submissions;
- support account/data deletion requests;
- define retention jobs for recordings and derived artifacts;
- prevent raw responses, transcripts, email addresses and audio URLs from analytics/log metadata.

Operational access follows least privilege. Content Admin, reviewer and System Admin responsibilities
remain distinguishable and auditable.

Default Beta retention, subject to Vietnamese legal/privacy review before deployment:

- raw audio recordings: 30 days after final evaluation;
- transcripts, written responses and AI-derived evaluation artifacts: 180 days;
- redacted operational logs: 30 days;
- encrypted backups: rolling 35 days;
- security and content/audit records: one year, pseudonymized after account deletion.

An account deletion request disables access immediately and completes deletion/anonymization from
active systems within 30 days. Expired backups age out rather than being rewritten; a restored backup
must reapply the deletion ledger before serving traffic. Aggregate non-identifying metrics may be
retained. Legal holds are out of Beta scope and require explicit System Admin documentation.

## Support and failure recovery

Provide an in-product `Report a problem` action carrying safe technical context: route, stable entity
ID, request correlation ID and timestamp. It must not attach raw learner content without explicit
consent.

Support needs documented procedures for:

- invitation or login failure;
- stuck prerequisite or stale revision;
- failed audio/STT/TTS/Teacher AI job;
- missing report or teacher-review backlog;
- restoring a deployment or database backup;
- pausing the Beta or one external provider.

## Pilot analytics

Measure aggregate events only:

- invited → registered → verified → IELTS activated;
- first IELTS stage started and completed;
- session completion and resume success;
- weekly active learners and week-one/week-four retention;
- stage drop-off;
- audio/provider/job failure counts;
- Full Mock submission-to-review time;
- support issue category and resolution time.

Analytics must not contain raw answers, recordings, transcripts or prompt content. Cohorts below the
privacy threshold are not broken down into identifying segments.

Suppress analytics breakdowns containing fewer than five learners. Permitted dimensions are pilot
week, IELTS stage, device class and aggregate failure category. Email domain, exact age, location
below country, free-text content and individual reviewer performance are prohibited dimensions.

The latest acknowledged checkpoint is the state returned by a successful API response after the
corresponding database transaction commits. Client-local drafts and uploads that have not received a
server acknowledgment do not count. Resume-success analytics compare the restored revision and
checkpoint ID with that acknowledgment.

## Success criteria

The four-week pilot is successful when:

- no confirmed loss of session, answer, recording or report data occurs;
- at least 90% of invited learners can register, verify and activate IELTS without staff repair;
- at least 70% of activated learners complete their first IELTS learning activity;
- at least 60% of week-one active learners return in week four;
- at least 95% of resumable sessions restore the latest acknowledged checkpoint;
- release-blocking audio/provider failures remain below 2% of affected operations;
- 90% of submitted Full Mocks receive teacher review within two business days;
- every support incident has a correlation ID and recorded disposition;
- named product, content, calibration and operations owners approve the pilot report.

These are pilot decision thresholds, not marketing claims.

## Rollout

### Stage 0 — Integration

- Review and integrate Phase 6–8 with the UI redesign.
- Run migration rehearsal and the final repository gate.
- Merge to `main` without enabling IELTS access.

### Stage 1 — Internal release

- Deploy hosted infrastructure.
- Publish the approved content bundle.
- Enable staff/test entitlements only.
- Complete smoke, backup/restore and provider-failure rehearsals.

### Stage 2 — Invited Beta

- Invite five learners first.
- Observe activation and the first complete journey for 48 hours.
- Expand to 20–30 learners only when no release blocker remains.

### Stage 3 — Pilot review

- Freeze rollout expansion after four weeks.
- Review learning, retention, support, calibration and reliability evidence.
- Decide to proceed, extend, narrow or pause.

## Rollback

The System Admin can pause IELTS Beta globally or revoke cohort access without deleting data. A
rollback must:

- preserve all immutable content versions and learner history;
- stop new IELTS starts while permitting authorized recovery;
- keep Intermediate available;
- allow provider fallback without rewriting completed evaluations;
- record actor, reason and timestamp in the audit log.

Database migrations remain additive and backward-compatible through the pilot rollback window.

A provider pause immediately prevents new provider jobs and uses the configured safe fallback where
the activity permits it. A global Beta pause or entitlement revocation prevents new sessions and new
section starts. An already-started timed section may save and submit until its existing deadline;
afterward the learner sees a paused state and can resume only when access returns. Emergency security
revocation may block all access, but never deletes progress.

An attempt is consumed only when the server commits the terminal submission for that attempt. Draft
saves, partial section submissions, upload retries, provider timeouts, 429 responses and malformed
provider output do not consume another attempt. Provider work is idempotent against the committed
submission and can be retried or reconciled without duplicating learner evidence.

## Release gates

The Beta cannot expand beyond staff until all are true:

- Phase 6–8 merged into `main` and deployed from an immutable revision;
- migrations rehearsed against a production-like copy;
- complete content bundle published and approved;
- live TTS/STT/Teacher AI calibration approved, with safe fallback tested;
- email verification and password recovery verified;
- privacy, consent, retention and deletion procedures approved;
- backup and restore rehearsal passes;
- desktop/mobile accessibility smoke passes;
- security and log-redaction review passes;
- operations dashboard and alert routing verified;
- support owner and teacher-review capacity assigned;
- product owner signs the controlled-pilot checklist.

## Builder decisions

The implementation plan may choose the hosting vendor, email provider, object-storage vendor and
deployment automation, provided each choice satisfies the boundaries above and is replaceable at an
existing port. Prefer the smallest single-region deployment adequate for 30 learners. Do not add
multi-region, Kubernetes or microservices.

## Deliverables

1. Beta entitlement and Admin invitation workflow.
2. IELTS program release policy and `/ielts` home.
3. Content-bundle readiness and release checklist.
4. Hosted configuration, durable storage, email and secret management.
5. Privacy/consent/deletion and support workflows.
6. Aggregate pilot analytics and operations alerts.
7. Staged rollout, rollback and four-week pilot report template.

