# Worker Retirement and Main DB Write Gates Preapproval Implementation Plan

> **For agentic workers:** after matching human approval only, use superpowers:executing-plans task-by-task. Current permission is read-only inventory and capture, not OS deletion or DB writes.

**Goal:** Retire only the owned temporary worker, preserve its profile, and bind actual main-DB findings to strict prerequisites for any later R1.2a testing.

**Architecture:** One new retirement proposal with an empty repository source allowlist. Main-DB identity/counts are now verified by read-only SQL; migrations, backup/restore and fixture testing remain NOT READY FOR EXECUTION APPROVAL. No isolated-DB or previous worker approval is repurposed.

**Tech Stack:** Existing Windows account/CIM/NTFS and Docker/PostgreSQL17/psql. No install, server startup, OS policy, global ACL or product source change.

**Spec:** Owner's SWITCH TO OPTION C AND RETIRE TEMPORARY WORKER request; [partial setup receipt](../../../mandate/reports/2026-10-26-beginner-windows-worker-verification.md); [audit/review](../../../mandate/reports/2026-10-26-main-db-worker-preapproval-review.md). This new use of “C” means the main DB, not the old VM option.

## Authority and frozen state

- Current work: read-only SQL/metadata and governance documents only. No account disable/delete, logoff, directory/profile cleanup, Docker start/stop, backup, migration, fixture or release operation.
- Preserve frozen mandate bodies/approvals. Setup MND-20261026-001 and both R1.2a qualification mandates stay implementing; parent001 captured/null. Retirement does not retroactively verify setup.
- Product/test/script source allowlist EMPTY. No guard bypass, “main is isolated” relabeling, new account or global security/ACL change.
- Main DB writes require another reviewed matching execution scope after the findings below are resolved/accepted. This hash cannot authorize migration, repair, publication or fixtures.
- Inventory/SQL evidence is timestamped. Refresh identity, data baseline and worker-use checks before future action; concurrent external activity is not authority for this agent.

## Confirmed DB findings

Docker initially had no running containers. During this audit, worklingo-review-postgres became running through external activity, sharing volume infra_worklingo-postgres with stopped infra-postgres-1. The agent started/stopped neither. Never start the stopped container while another PG instance uses that same volume.

Live target: 127.0.0.1:55432; container dfc7473d056cb648ca71d6a7cb4343279413e417038334f254c587692b75b151; image sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24; volume infra_worklingo-postgres. Read-only local-socket SQL confirmed database worklingo, OID16384, role worklingo, PostgreSQL17.11, system_identifier7692646346822291490, cluster_name empty. Physical container port5432 is mapped to host55432. No .env, DATABASE_URL fallback or password retrieval used.

Actual counts in one REPEATABLE READ READ ONLY snapshot across97 non-system application tables: VocabularySourceEntry8744, LexicalEntry8129, LexicalSense8742, User2, UserSession9, LearnerProfile1, IntermediateTopicGroup377, IntermediateTopicGroupName687; full aggregate counts are in the locked audit JSON. LearningProgram/Lesson/WordBank and learner enrollment/session/mastery tables being0 do NOT make this DB empty.

Migration history:51 rows,47 finished/non-rolled-back,4 rolled back,0 pending names,0 currently failed and no unknown migration names against47 migration.sql files plus migration_lock.toml (48 locked files). Three applied checksums do not match current source raw/LF/CRLF/BOM/trailing-newline variants or HEAD blobs:
- 20261006000100_mastery_events_and_records
- 20261011000100_increment_5b_curriculum_admin
- 20261015000200_ielts_flow_v3

Other raw differences are explainable by line-ending variants; do not label every raw mismatch corruption. This comparison is migration-history/checksum verification, NOT proof of schema equivalence. Do not resolve/reset/rewrite checksums to hide differences.

LearningProgram has0 rows although the applied learning_programs migration originally inserts4 catalog rows. Treat this as a data-baseline discrepancy; do not reapply an applied migration or seed it automatically. Current audit role has superuser/createDB/createRole/bypassRLS flags: read-only audit does not qualify it as a safe fixture-runtime role.

## Review focus

- Disconnected session is still in use; require owner signout, no worker processes/sessions and unloaded profile before account deletion.
- Small/default-looking profile files are not disposable by inference; profile is retained.
- Container aliases sharing one PG volume cannot run together; do not stop/start/reset either under retirement authority.
- Current migration checksum/catalog discrepancies block write readiness; no migration-history editing or automatic repair.
- Main DB default-deny/runtime isolation guards remain in force; source allowlist empty, no implicit fixture permission.

## Task R: exact account retirement after new approval

**Subject:** wl_beginner_r12a; SID S-1-5-21-3809754005-2092998575-1059868825-1014; created by MND-20261026-001. Existing ASUS operator SID ends1001. Actual local membership only Users545, not Administrators544.

**Files/resources:** no product source; only exact account and optionally the14 recorded empty directories in the new scope. Profile, parent TEMP, personal/system files, other users and shared folders are excluded from deletion.

- [ ] Verify new proposal/plan/baseline/ownership hashes, actual matching deletion/optional-directory-cleanup approval, current SAM name/SID/group membership and operator SID. Any mismatch => STOP.
- [ ] Owner manually signs out the worker. Require no active OR disconnected worker session, no worker processes, CIM Loaded=false/Special=false and matching SID/profile. Earlier session2 was disconnected/profile loaded; the final read-only refresh now shows no worker session and Loaded=false. Recheck process/session/approval conditions at execution; no deletion performed. Never force-logoff, kill arbitrary processes or alter another account.
- [ ] Record final owned-resource receipt, then Remove-LocalUser by this exact SID only; verify exact name/SID absence. Do not auto-create a replacement account. Original SID deletion is irreversible; account re-creation is not rollback.
- [ ] Retain C:/Users/wl_beginner_r12a and all profile/system/personal data. Fixed-folder metadata shows6 files/2478 bytes and3 skipped Documents reparse links; no filenames or contents read/exported. AppData was not assessed for disposability. Any later native SID-bound profile removal requires owner retention review and a separate exact scope/hash.
- [ ] Only if included explicitly in matching approval, remove the14 ledger-created directories NON-RECURSIVELY, leaf-first. Recheck same owner/SDDL/non-reparse/empty state and all children belong to the same recorded set. Any file, foreign child, changed ACL/owner or use => retain/quarantine and report BLOCKED. No ACL change to force deletion; no shared/profile-parent recursion.
- [ ] Preserve audit/evidence files; report each removed/retained resource. Keep original mandate states and both gates unchanged.

Rollback: fail prerequisites before deletion leaves account/profile intact. After SID deletion retain profile/audit; no automatic account recreation or claim of SID restoration. Unknown ownership/residue is preserved. Only the new scope's proven empty objects are cleanup candidates, never repository/DB/storage production or backup data.

## Main-DB testing prerequisites — plan only, no executable data grant

1. Owner acknowledges existing accounts/sessions/learner/vocabulary/topics must be preserved. Bind exact live container/systemID/DB/OID/endpoint/volume and source baseline; refresh them immediately before any later proposed write.
2. Resolve/document the3 checksum differences and catalog discrepancy using read-only evidence. Approve any actual data/schema repair separately. Proposed migration execution set is currently EMPTY: all47 source names are applied. No migrate reset/db push/drop/resolve/checksum rewrite, broad delete or “reapply to reseed.”
3. Design and separately approve a least-privilege fixture role plus scoped publication/environment authority and an exact source/test allowlist; existing superuser audit credentials and hardcoded isolated guards are not a shortcut. No source change is approved here.
4. Before future fixture DML or approved pending migrations, obtain a protected consistent backup and a genuine restore rehearsal on a separately approved disposable target. Proposed future local protected artifact root: C:/ProgramData/WorkLingoMainDbAudit/202610260002; not created now. Dumps may contain confidential DB bytes: no chat/Git/provider export. Record checksums and backup completeness. Archive/listability is not restoration evidence; never restore/reset the main volume as a test.
5. If physical backup is chosen later, explicitly resolve tablespaces, relocated/symlinked WAL and all storage dependencies; stop on anything outside approved mounts. Never cold-copy a live writer or start a second container on the same data volume. Any later startup scope must verify actual entrypoint/command and initialized data dependencies, not assume an image tag prevents init scripts.
6. Fixture-only content must have a unique run marker, transaction/created-ID ledger and narrow dependency-aware deletion of ONLY those new IDs. Preserve all pre-existing accounts/topics/vocabulary/progress/content and require a quiescence/concurrency policy before writes. No automatic seed of real lessons.
7. Test publication must retain environment/source/receipt binding, FIXTURE_ONLY and no APPROVED_RELEASE, public publish, learner admission/enrollment, provider or production flags. Actual locks/rollback/idempotency/V1/V2 and Intermediate/IELTS regressions need real approved tests; this audit proves none.
8. Scope backup/cleanup by exact run paths and IDs, with explicit rollback for failures. No database/volume drop/reset, container alias cleanup, foreign session termination, merge/push/deploy or next increment.

## Acceptance/current gates

- Current audit: live identity/read-only transaction and97 table counts verified; migration history differences honestly reported. No schema-equivalence or runtime-test PASS claimed.
- Retirement future acceptance: exact owned SID removed only after owner signout; profile preserved; every optional empty-directory deletion proven or retained/BLOCKED.
- Main-DB write readiness: BLOCKED by non-empty preserved data,3 unexplained checksums, missing catalog baseline, privileged role and unsupported guarded runtime mode.
- Gate A BLOCKED; Gate B NOT RUN. User must approve the new retirement hash before OS mutation. Main-DB migration/fixture/harness execution needs a separate completed scope/hash; no such approval is inferred.
