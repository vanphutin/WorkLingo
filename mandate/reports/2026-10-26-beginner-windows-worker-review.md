# Beginner Windows worker — preapproval review

Date: 2026-10-26. Parent dependency: MND-20261025-002; R1.2a: MND-20261024-003. Baseline 9d50bc23ff596232c9693bc058d7fb434edda211, codex/foundation-basic-readiness, initially clean existing worktree. This report is analysis/capture, not human authorization.

## Scope decision and evidence

Use the comparison and proposed B setup in the [plan](../../docs/superpowers/plans/2026-10-26-beginner-windows-worker-preapproval.md), with exact locks in [scope JSON](2026-10-26-beginner-windows-worker-scope.json). B is the coordinator's recommendation. The owner has not selected it or approved execution.

Reused the [9d50bc2 evidence](2026-10-25-beginner-r12a-isolated-db-e2e-verification.md): 288/290 completed token queries, no qualified interactive Medium worker, actual elevated execution, absent planned roots and unchanged data environment. Historical unit/static PASS results are not new executions in this task. No repeat full process/account scan or production-content inspection.

Only new read-only checks: exact proposed account/profile/snapshot/approval names are absent; current host VAN-PHU-TIN/operator SID match the scope; resolve/hash existing Node/PowerShell/whoami bytes; source/frozen/migration hashes and mandate validation. No account, profile, ACL, OS policy, dependency, run directory, database, fixture, server or provider was created/changed/executed.

Two newly clarified design dependencies:

1. Existing preflight binds ownedTempRoot below node:os tmpdir(), and the original scope pins ASUS's TEMP. A different standard principal needs its own profile TEMP and a newly approved run-root layout. The original hardcoded environment/authority validators cannot silently accept that substitution. This proposal prepares OS-only identity/roots; a successor harness/environment approval must reconcile the changed layout before any qualification run.
2. Node's apparent system path resolves into ASUS's profile. Proposed operator copy-only staging of the verified binary into a sealed snapshot avoids a broad profile ACL grant; no installation or execution of dependency lifecycle scripts is included.

Deduplication: mandate CLI find for windows worker returned parent002, whose implementing scope expressly excludes OS account creation/global security changes. Its scope is frozen. This is a distinct, linked OS authority dependency, not a renamed duplicate or an expansion of its approval. Existing mandate artifacts and the old16-file allowlist remain byte-for-byte unchanged. The new child's repository source allowlist is empty.

## Fresh builder check and disposition

Fresh reviewer Ptolemy, agent01a176e8-0576-75c3-9df7-b2a233ed3e26, read only the new plan. No writes, runtime probes, DB, tests or nested agents. Reported three material questions; the coordinator made one refinement pass:

| Question | Resolution in plan |
| --- | --- |
| High: unspecified worker launch/env/diagnostic provenance | Exact diagnostic launch section: new-account interactive login; pinned executable paths/hashes, no profiles/startup hooks, empty-map env allowlist, fixed CWD, bounded native/file/pipe probes and operator-owned diagnostic manifest. No arbitrary shell/app/DB execution |
| High: four output paths vs normal profile scratch | Explicit OS versus harness distinction: standard profile writes are real; only protected operator/production boundaries are OS-claimed. Four-directory application-output enforcement belongs to successor qualification, not a false setup acceptance |
| Medium: compiled dependency materialization | Copy already existing bytes only; manifest target mapping and no retained external links. Missing artifact/build/download/lifecycle need => STOP; no implicit build/install right |

No second independent verdict is claimed. Coordinator self-review covered the owner's eight safety conditions, task interfaces, exact resources and fallback/rollback. The remaining owner choices are intentionally open, not questions the builder may decide.

## Open decisions, risks and gates

- Owner chooses B and exact account/profile/run/snapshot roots, or supplies a qualifying A context / requests a separate C design. No VM/platform availability or cost estimate is asserted as measured fact.
- Explicit OS setup authority must cover one absent account/profile, Users-only membership, new-object ACLs, secure password handling, actual token/access proof and SID-bound rollback. It grants no source or database execution.
- B feasibility is not yet proven: effective approval/snapshot ancestor rights, Docker pipe denial, known protected-path denial, native compiler/tools/dependency availability may still fail. Existing ACL/security/global parent changes are prohibited; failure requires stopping, not weakening checks.
- A worker account owns ordinary profile scratch; this is not a general OS filesystem/network sandbox. Same-host privileged operator risk remains. If that risk or shared-host ACL limitations are unacceptable, C requires a separately captured identity/network/storage/platform plan.
- Full Gate A is still BLOCKED. Actual SQL role/identity, migration-target, backup/restore, locks/rollback/history proofs cannot come from OS setup or absent resources. The successor qualification must obtain an explicit approved setup/proof sequence; this proposal neither executes nor moves the Gate B boundary.
- Gate B NOT RUN. Parent003 and parent002 remain implementing; parent001 captured/null; no R1.2b/R2/R3/R4, merge/push/deploy.

## Verification and handoff policy

Recompute document LF-hashes, source baseline fingerprint, empty source allowlist fingerprint, frozen originals/migration hashes and Mandate CLI proposal hash before handoff and future approval. Validate local file references and register via mandate.mjs validate. No product unit/lint/typecheck/build rerun is required for these document-only changes; historical results remain explicitly historical. Acceptance and runtime/OS proofs are NOT RUN/BLOCKED, never PASS by design review.

Current work artifacts: this review, the linked plan and scope lock, new child captured/triaged via CLI, generated INDEX. Future execution evidence belongs in a separately named worker verification report after real matching approval. No human approval note is created now.

Skill audit: mandate-steward -> linked distinct proposal/lifecycle/hash governance; brainstorming -> evidence-backed A/B/C and fresh builder check; writing-plans -> bounded OS-only tasks and acceptance/rollback; quota optimizer -> prior evidence reuse, narrow metadata reads, one reviewer; verification-before-completion -> actual hash/reference/CLI results; git-workflow-and-versioning -> explicit document-only staging if committed. Implementation/TDD/DB/E2E workflows are not entered because execution is not approved.
