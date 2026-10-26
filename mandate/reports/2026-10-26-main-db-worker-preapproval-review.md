# Main DB read-only audit and worker-retirement preapproval review

Date: 2026-10-26 (Asia/Saigon). Baseline 8c3bc63df04309140e241e085050a0e32341f1f7 / codex/foundation-basic-readiness. Scope: read-only DB/Windows metadata and governance capture only. No OS retirement, backup, container start/stop, DB write, migration, fixture, publication or Gate B executed.

## Findings confirmed

- The owner now uses Option C to mean main DB. Earlier C=isolated VM is superseded as a preference only, without execution authority. Existing frozen approvals are preserved.
- Docker initially showed no running PG container. An external actor subsequently started worklingo-review-postgres on the SAME infra_worklingo-postgres volume as stopped infra-postgres-1. This agent started/stopped neither; never run both on that volume.
- Confirmed server: 127.0.0.1:55432 -> container5432, database worklingo/OID16384, PostgreSQL17.11, system_identifier7692646346822291490; exact container/image/volume in the plan and aggregate JSON. No .env, application DSN fallback or password retrieval.
- Actual database is NOT empty: 8,744 source occurrences, 8,129 lexical entries, 8,742 senses, 2 User, 9 UserSession, 1 LearnerProfile, 377 topic groups and 687 topic names. All97 application base/partitioned tables were counted in one repeatable-read read-only transaction. LearningProgram/Lesson/WordBank=0 is insufficient evidence of emptiness. No row payload, email, user name, password hash, session token or private text was queried.
- Migration history has51 rows:47 finished/current,4 historical rolled-back,0 pending source names,0 unfinished/non-rolled-back,0 unknown names. Source lock is47 migration.sql plus migration_lock.toml=48 files. Do not reapply applied migrations.
- 41 raw active checksum mismatches reduce to3 unexplained after LF/CRLF/BOM/trailing-newline and HEAD-blob comparison: 20261006000100_mastery_events_and_records; 20261011000100_increment_5b_curriculum_admin; 20261015000200_ielts_flow_v3. Other raw mismatches have formatting explanations. This is NOT a completed schema-drift assessment; no history/checksum rewrite or repair performed.
- Applied learning_programs migration includes4 catalog inserts while actual LearningProgram count0. Cause is UNKNOWN; no reseed/reapply. Audit role worklingo is superuser/createDB/createRole/bypassRLS: it cannot be treated as a least-privilege test runtime role.

## Worker provenance and retention

- Exact worker SID S-1-5-21-3809754005-2092998575-1059868825-1014 matches the MND-20261026-001 creation ledger; operator is different SID ending1001; membership only Users545, no Administrators544. No token/effective engine/DB-rights proof is inferred.
- Earlier owner login left session2 disconnected and profile loaded. Final read-only refresh at 2026-10-26T10:12:00.6926302Z shows Loaded=false/Special=false and query session lists no worker session. Worker-process absence is still a mandatory execution-time prerequisite, not asserted here. query session returned useful inventory with exit1; the bundle is not a zero-exit PASS.
- All14 ledger roots rechecked: matching owners/SDDL, protected DACL, non-reparse,0 files, no foreign children. No account/ACL/folder/profile change made during this audit.
- Read-only fixed personal-folder metadata:6 files/2478 bytes and3 skipped Documents reparse links. No filenames/contents exported. These are not declared disposable; AppData disposability unassessed. Retain the entire profile and shared TEMP ancestry.

## Proposed decision and exact boundary

Capture MND-20261026-002 as a new child follow-up, owner Codex, triaged/approval=null. Proposed matching approval is ONLY: remove the exact recorded worker SID after rechecking no sessions/processes and unloaded profile; optionally remove the14 unchanged/proven-empty ledger directories non-recursively leaf-first. Retain the profile. No force logoff, unknown-process termination, ACL forcing, new account or global-policy action.

No source/test files may change (empty source allowlist). Main DB identity/counts are reference evidence, NOT a grant for backup, role provisioning, migration, startup/shutdown, fixture DML or publication. Proposed migration execution set EMPTY. The requested main-DB write/testing plan is documented as gated and not ready for an executable scope/hash: owner must first acknowledge preservation of existing data, resolve checksum/catalog findings, and review least-privilege/harness/backup/restore/fixture boundaries. No competing feature plan is created.

## Commands and actual results

| Check | Result/evidence |
| --- | --- |
| Git branch/HEAD/status, mandate find/validate | Read-only; known old lifecycle changes preserved; new capture validated at handoff |
| Docker context, selected inspect identity/mount fields | Read-only; pinned live container and shared volume proven |
| psql -X -w -qAt -v ON_ERROR_STOP=1; fixed -h /var/run/postgresql -p5432 -Uworklingo -dworklingo | PASS for identity/count queries; explicit container --user postgres, PGOPTIONS default_transaction_read_only=on; no credential/fallback |
| SQL BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; catalog/count/metadata SELECT; ROLLBACK | PASS:97 counts and51 migration records, transaction_read_only=on |
| Initial client-generated gexec command | FAIL before successful snapshot; string escaping removed backslash, read-only transaction aborted; corrected fixed SELECT batch rerun, no writes |
| Source checksum/formatting/HEAD comparison | PASS as a check;3 unexplained differences reported, actual schema equivalence NOT ASSESSED |
| Get-LocalUser/groups/CIM/Get-Acl/child metadata | PASS for provenance/14-root metadata; no token/process-absence acceptance claim |
| Migration/fixture/E2E/backup/restore | NOT RUN; no authority in this task |
| Product unit/lint/typecheck/build | NOT RUN; no source change, earlier reports not rerun or relabeled as current PASS |

The inspection accidentally displayed a hardcoded config credential in a tool response before redaction practice was tightened. The owner was informed once; the value is not copied to this report, proposal, aggregate JSON or Git. Subsequent config/inspect outputs select only public identity/mount metadata. No credential rotation is claimed or performed.

## Review and risk disposition

A fresh independent builder reviewed an earlier draft, not this final capture. It questioned startup entrypoints/initialized-PGDATA proof and physical-backup completeness for tablespaces/WAL, and distinguishing checksum drift from schema drift. Coordinator removed all startup/backup execution rights from this proposal, documented those future prerequisites and marked schema equivalence unassessed. No independent approval of the final rewritten proposal or OS acceptance is claimed.

Account SID deletion is irreversible; recreation does not restore it. Preconditions can stop before deletion; retain profile/audit afterwards. Any root containing new/unknown data stays intact. Existing vocabulary/accounts/sessions/topics must be preserved, and no dump/restore is attempted now.

Gate A BLOCKED; Gate B NOT RUN; R1.2a/isolated-environment/setup mandates remain implementing. Parent MND-20261024-001 remains captured/approval=null; R1.1 and P1 amendment remain verified. New retirement proposal stays unapproved. Retirement success alone cannot open either gate.

## SKILL AUDIT

Used: mandate-steward -> dedupe, exact new scope and CLI lifecycle/validate; systematic-debugging -> distinguish offline/external-start/live identity and checksum formatting; writing-plans -> bounded retirement and later data gates; codex-quota-optimizer -> reused reports, scripts/counts instead of row payloads; verification-before-completion -> source/artifact/reference/register checks; git-workflow-and-versioning -> explicit governance files only.
Not used for new execution: TDD/backend/UI workflows (no product change), executing-plans/OS deletion/DB test workflows (no matching execution approval). No final independent code review required for unchanged product source.

See [plan](../../docs/superpowers/plans/2026-10-26-main-db-audit-worker-retirement-preapproval.md), [aggregate audit](2026-10-26-main-db-readonly-counts.json), [scope](2026-10-26-main-db-worker-retirement-scope.json), [partial setup receipt](2026-10-26-beginner-windows-worker-verification.md).
