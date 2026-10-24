# Beginner R1.2a — Preapproval scope review

2026-10-24. **CAPTURE/REVIEW ONLY; NOT APPROVED.** Scope: Admin/editor/validation/preview, fixture-only test-release registry and Beginner supersession safety. No product implementation or DB/provider action performed.

## Baseline and prior evidence

- Worktree: C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo.
- Branch: codex/foundation-basic-readiness; HEAD: 5963dbf7ed5b448b77c8a8b3b48f476a90694caf. Initial Git status clean; main checkout at D:/Projects/WorkLingo also clean when checked; neither checkout was reset or switched.
- R1.1 commits exist: 0ffaf6b (approval), 2da434a (format/manifest), 8315f01 (planner/evaluation), 5963dbf (verification).
- [R1.1 mandate](../items/MND-20261024-002-feature-implement-provider-free-beginner-r1-1-format-and-exact-version-planner.md) is verified. Its recorded426 tests/lint/typecheck/build are historical evidence from [verification](2026-10-24-beginner-r11-verification.md), not rerun in this task.
- [Parent](../items/MND-20261024-001-feature-enable-beginner-admin-authoring-and-learner-enrollment-for-foundation.md) remains captured/approval=null. No update to either existing mandate or old approval/verification.
- Master plan SHA-256 remains 165fc3e8cbcf7ce1b2245974fa7cb40cc0c75b10cb31cf87fe2557f6a922c96b. Its R1.2a task is expanded by the [scoped plan](../../docs/superpowers/plans/2026-10-24-beginner-r12a-implementation.md); master file is unchanged so verified R1.1 hash remains valid.

## Observed code vs proposed decisions

| Observed source | Consequence / proposal, not an existing feature |
| --- | --- |
| [ContentImport schema](../../apps/api/prisma/schema.prisma:776) has optional lessonId but no program binding | Explicit selected draft creation binds Lesson/MissionLesson/ContentImport in one transaction; derive program ancestry relationally; no migration/new enum |
| [Import guard](../../apps/api/src/content-authoring/application/content-imports.service.ts:57) and [publish guard](../../apps/api/src/content-authoring/application/content-publisher.service.ts:38) deny1.2 | Keep default deny on shared routes; only an internal authenticated scope/environment capability enables new test-only orchestration |
| [Publisher receipt lookup](../../apps/api/src/content-authoring/application/content-publisher.service.ts:60) precedes fetching import; existing request hash omits importId | Beginner-scoped operations bind environment+target+importId, authenticate before replay; do not rewrite legacy receipt protocol |
| [Publisher replacement](../../apps/api/src/content-authoring/application/content-publisher.service.ts:610) archives previous current version | Exclusive Beginner policy preserves V1 PUBLISHED; shared/ambiguous ownership rejects; legacy replacement archive stays unchanged |
| [Foundation validation](../../apps/api/src/curriculum-foundation/application/foundation-validation.ts:25) selects attached PUBLISHED exact versions | Reuse graph/evidence checks and add scoped ownership/readiness; no latest/first fallback or blanket ARCHIVED acceptance |
| [Learner DTO construction](../../apps/api/src/learning-sessions/application/learning-sessions.service.ts:187) already redacts answers | Extract a pure shared projection for Admin preview; separate raw Admin review from learner-mode DTO |
| [Speaking renderer](../../apps/web/src/features/learning-session/activity-renderers/speaking-activity.tsx:43) instantiates recorder | Preview must avoid mounting recorder/submission branch, not merely disable a button |
| [Navigation](../../apps/web/src/features/admin-dashboard/admin-navigation-model.ts:4) includes only Intermediate/IELTS program type; sidebar has a disabled Foundation/Basic option | Add Beginner Admin destination behind role checks; do not change learner catalog or existing program tools |
| [API test config](../../apps/api/vitest.config.ts:10), [Web E2E config](../../apps/web/playwright.config.ts:13) fall back to application DATABASE_URL | Dedicated configs/harness, explicit dedicated database and fail-closed preflight; random schema alone is insufficient |
| [AppConfigModule](../../apps/api/src/common/config/app-config.module.ts:12) reads .env files | Add isolated-test env-file exclusion with legacy default preserved; bootstrap option is not a write permission |

Knowledge Map inspection found20 Unit headings/80 Lesson rows; Video Production Plan has55 editorial VP rows, with six pilot slots prioritized. They are planned content, not published resources. Existing G/P/V, R/L/S/W, can-do and H/R fields are reused; missing future video categories show empty state. No content is authored or materialized now.

## Exact file scope

[Machine-readable allowlist and baseline](2026-10-24-beginner-r12a-scope.json): **24 existing files /46 new files** (including two future governance decision/verification documents). No wildcard directories, Prisma schema/migrations, package manifests/lockfiles, learner resolver/admission or media resources.

| Group | Modify | Create |
| --- | --- | --- |
| contracts | 1 | 4 |
| policy | 0 | 6 |
| authoring | 7 | 6 |
| curriculum | 6 | 2 |
| preview | 3 | 3 |
| web | 6 | 11 |
| registry | 0 | 2 |
| harness | 1 | 7 |
| e2e | 0 | 3 |
| governance | 0 | 2 |

Existing generic CurriculumWorkspace, ContentAuthoringController and FoundationAdminController remain unchanged. Scoped service policy protects alternative routes; this must be proven by negative HTTP tests. FoundationDefinitionEditor alone gains a typed transport adapter with the old client as its default. Shared module exports already supply required services; no duplicate module graph. If execution discovers another required file or incompatible lock order, stop and obtain revised scope/hash approval.

Read-only source baseline includes56 existing files, including master plan/specs, parent/predecessor, schema, shared runtime/test/config dependencies. Implementation create paths are absent. Future approval/verification notes and child lifecycle bookkeeping are explicitly separated from immutable source baseline. Proposed test artifacts may be generated only in a separately authorized disposable root; they do not expand tracked source paths.

## Decisions proposed for human approval

1. Software-only R1.2a in the exact allowlist; separate permission for actual test environment/provisioning/schema setup, fixture import/audio attachment/publication/cleanup. No actual environment or mutation is authorized yet.
2. Keep ownership derived from existing relational bindings plus scoped audit/review records; no new database entities/enums. Do not seed the editorial tree.
3. Enforce different last-source-editor/reviewer actors, including fixtures; technical fixture review is not pedagogical approval.
4. Operator-controlled approval store outside app-writable roots, backed by a direct product-owner authorization source. HTTP Admin roles can reference approved IDs, never mint permission/release approvals. Candidate-specific approval occurs only after real IDs/hashes exist.
5. Preserve valid exclusively Beginner V1 on replacement, reject mixed ownership, keep Intermediate/IELTS archival semantics. R2 pinned-enrollment/start matrix and R4 supplementary matrix remain future approvals; do not claim them tested here.

## Risk and blocker classification

| Priority | Finding / boundary | Disposition |
| --- | --- | --- |
| P0 | No P0 established by this bounded source/document review | Runtime not exercised; this is not a production security certification |
| P1 | No R1.2a implementation approval matching final proposal hash | Must remain captured; software edits blocked |
| P1 | No dedicated environment identity, isolated role/ACL and explicit read/setup/write/publication permission | DB/integration/E2E blocked; design can be reviewed without running them |
| P1 | Global1.2 enable, caller-forged authority, generic-route bypass or stale review would violate the trust boundary | Plan requires runtime provenance/ownership checks, no user-created approval records, target-bound receipt/locks and negative tests |
| P1 | Auto-archiving Beginner V1 would invalidate required history semantics | Dedicated exclusive-ownership supersession policy and exact pinned synthetic read/resume/evaluation regression; no R2 implementation |
| P2 | Eight real lessons/audio, pedagogical reviewer and timed rehearsal not available in R1.2a | Owned by R1.2b; not a software blocker, never CONTENT_READY |
| P2 | Independent-review and trusted-approval-source semantics initially ambiguous | Independent builder review found both; plan now specifies enforced actor separation and operator-owned authorization source; still proposals pending human approval |

## Review and verification boundary

Five-axis review: correctness (exact version/transactions), architecture (reuse/no migrations or module cycle), security (roles/authority/redaction/environment), simplicity (editorial data vs fake DB objects, no video subsystem), performance (bounded5/20/80 tree, scoped queries, no full-library learner payload). One read-only builder review inspected the plan and targeted source; its P1 trust-anchor and P2 self-review questions were resolved in the proposed plan. No code mutation experiment applies to a docs-only review. Optional Prettier was unavailable (command not found); repository format:check uses git diff --check and no dependency was installed.

The plan contains unit/component/integration/E2E matrices, explicit commands and acceptance/rollback by area. Unit mocks and build gates may qualify SOFTWARE_READY after implementation approval; full R1.2a acceptance needs separate authorized isolated DB/E2E and actual-ID candidate verification. Passed mocks do not fabricate a persisted APPROVED_RELEASE. Technical readiness never implies content/pilot/CEFR readiness.

Before handoff, run register validate, local link/line checks, exact allowlist existence/absence, baseline fingerprints, protected-artifact equality, scope self-review and docs diff checks. **No runtime tests/lint/typecheck/build, DB tests or E2E were run in preapproval; NOT RUN, not PASS.** No provider calls, production access, seed, migration, import/publish, source edits, commits, merge/push/deploy.

## Hash contract

All file hashes below use UTF-8 with CRLF normalized to LF. Baseline source-file hashes use raw bytes. Fingerprints use SHA-256 recursively sorted-key JSON, with arrays retaining stored order; see scope lock for exact inputs.

- Plan SHA-256: 60ff2caff21f5d5352cf84c89fbbc6ddca27e1644bff452007f7875cd2a031e6
- Allowlist fingerprint: 5c976d313378bd6fb5cb1831cf03ec0af9ed24cbfdafc842fb08d826a5538259
- Source baseline fingerprint: ec1bea8b364bb983af76cf595b35a2ab347bc713571ba9fe59eebecf04c1dd13
- Scope-review SHA-256: compute over this final file; store in child mandate body, not in itself.
- Proposal approval hash: compute using mandate model proposalHash(item, body) after CLI capture; human must approve that exact hash, not a previous R1.1 hash.

Scope lock permission booleans describe this captured proposal's initial state. Do not edit the lock to mark approval; lifecycle authority is recorded through Mandate CLI and separately verified environment/candidate approvals. Recompute all hashes and verify source baseline immediately before any later execution. A mismatch stops execution; do not silently expand the allowlist or rewrite frozen parent/predecessor records.
