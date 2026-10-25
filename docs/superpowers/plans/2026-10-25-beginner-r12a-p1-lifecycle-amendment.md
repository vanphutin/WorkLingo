# Beginner R1.2a P1 lifecycle scope amendment

Date: 2026-10-25. PROPOSED; no matching execution approval.
Parent execution mandate003 remains implementing; overall parent001 captured/approval=null; R1.1 mandate002 verified.
Reuse the [canonical R1.2a plan](2026-10-24-beginner-r12a-implementation.md); this addendum closes one recorded P1, not a new increment/backlog.

## Authority and exact scope

Human request authorizes capture/review only. Governance freezes implementing scope; create a linked follow-up and obtain a distinct matching hash approval. Do not edit003 or reuse its approval.
After matching approval, the only editable product files are:
- apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.ts
- apps/api/src/admin-content-lifecycle/admin-content-lifecycle.service.spec.ts

No controller/DTO/module/policy/config/schema/UI edits or new product files. The original allowlist is context, not further authority for this follow-up.
Governance-only capture: this plan, [review](../../../mandate/reports/2026-10-25-beginner-r12a-p1-amendment-review.md), [scope lock](../../../mandate/reports/2026-10-25-beginner-r12a-p1-amendment-scope.json), new CLI mandate and generated INDEX.
Future matching approval may add only the named mandate/reports/2026-10-25-beginner-r12a-p1-human-approval.md and 2026-10-25-beginner-r12a-p1-verification.md bookkeeping reports. These do not grant data authority.
An ignored runner/ledger/logs below .superpowers/sdd/2026-10-25-beginner-r12a-p1-lifecycle-amendment may support synthetic unit execution only. No tracked config change or DB/storage environment creation.

## Confirmed boundary and smallest correction

remove checks active Admin then replays receipts without Beginner target authorization. removeImport can delete a bound draft, archive current LessonVersion, clear Lesson pointer and archive the import; success adds audit/receipt. No Beginner format/ownership guard exists there.
Generic Beginner mutations must remain default-denied, including disguised legacy-format source. An author/publish environment grant does not grant withdrawal. Active CONTENT_ADMIN/SYSTEM_ADMIN cannot archive Beginner through this generic route in ANY environment.
Authorized archive tests mean legitimate existing legacy Intermediate/Foundation/IELTS operations, not a new authorized Beginner archive API. Forged environment/body/header/context cannot grant this operation.

## Implementation steps after matching approval

1. Preserve active-role checks, legacy requestHash/receipt operation, resource-specific IELTS logic, revision/action/FK conflicts and existing lock order.
2. Add a local service guard, reusing existing assertBeginnerAuthoringDisabled and denyUnscopedBeginnerMutation exports where sufficient. Read source, actual linked Lesson IDs and relevant immutable version snapshots; never infer ownership from slug alone.
3. For kind=lesson, guard existing target BEFORE cached receipt return. A matching old receipt is not authority. Preserve legitimate replay of deleted legacy targets, while absence cannot authorize a fresh write.
4. Recheck after slug-advisory then import-row locks: inspect every distinct actual Lesson relationship, including BOTH import.lesson and publishedVersion.lesson (not coalescing away the other). Check current/referenced snapshot format as well as raw format markers.
5. Fail closed for Beginner/shared Beginner ownership, format1.2 including unbound/malformed marked source, unresolved/inconsistent actual references and ownership read errors. Reject stale/changed binding. All deletion, archive, pointer, audit and receipt DML must remain unreachable after denial.
6. Do not introduce inverse hierarchy lock ordering. If safe resolution needs another product file, locking protocol or permission, stop and re-propose. Mock rechecks do not prove PostgreSQL race safety.
7. Preserve legacy unbound-draft deletion even when its slug matches an unrelated published Lesson. Preserve removal of older legacy import without revoking a newer pointer. Do not alter snapshots, historical exact selection, learner sessions/evaluation/progress.
8. Leave preserveBeginnerPriorVersion and scoped V2 publication unchanged. Generic denial for V1/V2 leaves historical PUBLISHED V1, current V2 and pointer intact; never unarchive a withdrawn version.

## TDD and regression matrix

All new tests live in the allowed service spec, using real service with mock Prisma/transaction boundaries. Read-only imports of controller/guard are allowed; no HTTP server or DB bootstrap.
- RED: current Beginner archive/pointer bypass for CONTENT_ADMIN and SYSTEM_ADMIN, asserting zero import/version/lesson/audit/receipt writes.
- RED: bound legacy-format Beginner draft delete; unbound1.2; malformed1.2 marker; legacy raw source with1.2 immutable snapshot; dual different Lesson references; failed ownership lookup/dangling target.
- RED: existing Beginner target with cached matching receipt denied; wrong request hash stays409; legitimate deleted legacy replay preserved.
- RED: target becomes Beginner after locks; no DML. Distinguish this unit race simulation from real concurrency verification.
- RED: direct controller-to-real-service bypass, absent/matching/mismatched environment claims and forged context still denied. Test unauthorized/inactive users independently.
- GREEN: only the minimal service correction; keep permitted legacy topic/bridge/mock/lesson archive/delete, stale revision/action/FK checks and older-import/new-pointer behavior.
- V1/V2 fixtures: generic denial retains both snapshots/statuses and V2 pointer. Existing real scoped publisher/policy unit regressions retain Beginner supersession and legacy prior-version archive.

## Exact test runner and gates

Do not run default API Vitest config: it can load .env/DB fallback. Dedicated vitest.beginner.config.ts currently excludes lifecycle specs.
After approval generate ignored vitest.lifecycle.config.ts under the named scratch directory; import existing apps/api/vitest.beginner.config.ts, reuse metadata plugin and empty-DB/fake-provider env, set absolute API root, and REPLACE rather than concatenate test.include with:
- src/admin-content-lifecycle/admin-content-lifecycle.service.spec.ts
- src/admin-content-lifecycle/admin-content-lifecycle.controller.spec.ts
- src/content-authoring/application/content-publisher.service.spec.ts
- src/beginner/domain/beginner-authoring-policy.spec.ts
- src/beginner/domain/beginner-publication-policy.spec.ts

Commands from repository root:

    pnpm --filter @worklingo/api exec vitest run --config <absolute ignored vitest.lifecycle.config.ts>
    pnpm --filter @worklingo/api exec vitest run --config vitest.beginner.config.ts
    pnpm --filter @worklingo/api lint
    pnpm --filter @worklingo/api typecheck
    pnpm --filter @worklingo/api build

First observe RED on the new service-spec cases before changing service; then GREEN. Confirm actual collection includes the lifecycle spec. Failed, zero-collected, skipped and blocked checks are never PASS.
Dedicated regression covers existing mocked history/evaluation and Intermediate/IELTS. No Web change means no broad Web rebuild absent new evidence.
Keep DB URLs empty/providers fake; unexpected real I/O means stop/BLOCKED.
After green obtain independent bounded read-only code review of the two-file diff and resolve findings. Re-run only affected gates, inspect exact diff/frozen locks, then stage the two explicit product paths for a separate feature-branch P1 commit. Optional governance-only evidence commit must enumerate its files; no blanket staging.

## Acceptance, dependency, rollback and blocked gates

Dependency: recompute plan hash, scope-review hash, exact allowlist fingerprint, source baseline fingerprint/HEAD and CLI proposal hash; require matching explicit human approval. Record actual authorization with CLI captured -> triaged -> approved -> implementing; never infer from capture request.
Acceptance: observed RED->GREEN, all required collected mock tests with no hidden skips, lint/typecheck/build PASS, denied-path zero DML, preserved legacy and V1/V2 behavior, independent review resolved, exact two-file product diff and separate P1 commit. Extra product/config need means stop for new amendment.
Only then report P1 fixed. Parent003 remains implementing until all R1.2a acceptance passes; unit checks cannot establish full verification.
DB integration/E2E, actual fixture publication/IDs/hashes, live concurrent binding changes, historical DB sessions/evaluation, operator/storage ACL and release approval remain BLOCKED pending separately bound environment/action approval.
Rollback proposal, NOT executed: revert only future P1 software commit with authorization; close unsafe mutation entry point through separately authorized operational controls. Preserve historical versions/readers/pointers/progress. Revert restores known P1 and is not release-safe. No data rollback/deletion or session repair.
Forbidden: migration/seed/DB creation/reset/writes, real fixture import/publication/audio, learner enablement, real AI/STT/TTS calls, R1.2b/R2/R3/R4, merge/push/deploy or automatic approval. No CONTENT_READY or CEFR claim.
