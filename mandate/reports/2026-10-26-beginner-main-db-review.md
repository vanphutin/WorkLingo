# R1.2a main-DB preapproval audit

Date:2026-10-26 Asia/Saigon. Baseline 98b0e72b8dd1f42eed002b2b14802ee249e91753 / codex/foundation-basic-readiness, initially clean. User explicitly selected the existing main DB and disallowed extra Windows workers/PG instances/databases. Current authority: read-only audit and governance capture ONLY. No container start, backup, role creation, DB write or source/test implementation performed.

## Confirmed delta

- Both existing PG containers are currently EXITED; Docker context desktop-linux. Target review container fullID dfc7473d056cb648ca71d6a7cb4343279413e417038334f254c587692b75b151 maps127.0.0.1:55432, shares infra_worklingo-postgres with stopped infra-postgres-1. Image sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24; entrypoint docker-entrypoint.sh, cmd postgres, restart no. No startup attempted.
- Last actual SQL snapshot 2026-10-26T07:25:24.775Z: worklingo/OID16384/systemID7692646346822291490/PG17.11/empty cluster_name.97 tables;8744 source occurrences/8129 lexical entries/8742 senses/2 accounts/9 sessions/1 learner profile/377 topic groups/687 names. This remains time-stamped reference evidence, not fresh live proof.
-47 SQL migrations plus1 lock file; last DB47 applied/4 historic rolled-back/0 pending. Three discrepancies are still UNKNOWN: mastery_events_and_records, increment_5b_curriculum_admin, ielts_flow_v3 (full names/hashes in checksum JSON). Each path has only one reachable local Git content version; none matches the DB checksum under raw/format variants or primary-checkout comparison. Bounded source reconstruction also found no match. No history/checksum/source SQL edit, migration replay or invented cause.
- LearningProgram0 despite old migration catalog inserts remains a data discrepancy; no general reseed. Backup NOT_RUN, restore NOT_TESTED. A readable dump can be prepared after this same proposed approval, without inventing a restore pass or requesting a new DB.

## Source/test safety findings

- Existing Beginner harness/configs explicitly deny main DB, require isolated flag and approval-root non-elevated/read-only proof. Removing the worker does not satisfy that boundary; new main permission mode/trusted-operator risk acceptance is required. No flag will falsely relabel main as isolated.
- packages/contracts/src/beginner-authoring.contracts.ts has fixed v1 software-authority schema; beginner-environment-preflight.ts compares cluster_name and denies superuser. Main cluster_name is empty. New v2 must bind actual systemID/OID and a limited role; retain v1 behavior.
- AppConfigModule currently skips .env only for isolated test mode; root apps/api/prisma.config.ts explicitly loads .env. Main-mode config branch and dedicated read-only Prisma config are necessary; never import the root config for these tests.
- Existing two integration files have3 cases: authoring/V1-V2/concurrent replay; registry export/negative approval; historical session snapshot SELECT. They contain no broad teardown but depend on precreated exact fixtures and have no fixture cleanup. Existing E2E files contain2 cases x2 projects; the history test chooses the first matching binding, which must be replaced with run-ledger identity.
- Existing authoring publication writes WordBank/LanguageBlock as well as lesson/version/curriculum/receipt/audio tables. Those were empty in snapshot. Actual vocabulary Lexical*/Vocabulary* tables and existing accounts/session/profile/topic/rate-limit data must receive no runtime DML rights.
- Generic curriculum-seed test has fallback URL, TRUNCATE and DROP SCHEMA; generic admin-curriculum-commands has schema provisioning/drop. They are prohibited, not safe whole-suite commands. Legacy IELTS helper uses fixed slugs and direct publication, so it is not main-safe without this new ledger; reuse pure regression assertions only.
- API authentication uses HMAC synthetic session cookies; authenticate reads UserSession/User/profile without touching it. Bootstrap can create separate synthetic users/sessions; existing real SessionAuthGuard/RolesGuard can be tested with runtime SELECT-only protected tables, without modifying existing accounts/sessions or bypassing auth.

## Single proposed approval

Capture MND-20261026-003 as the replacement EXECUTION route for main-DB qualification under parent MND-20261024-003; do not modify frozen isolated mandate/body/approval.26 exact source paths (14 existing modifications/12 new files) plus governance documents, one existing container/DB/volume, one limited PG role, one fixed run ID and private roots. No new Windows account, instance, DB or schema clone.

Startup is included only because the selected existing container is currently stopped; it may perform normal PostgreSQL recovery writes, so it is not performed under read-only permission. Role/bootstrap/data actions wait for validated backup, fresh identity/counts, quiescence and compatible schema. The same approval covers these ordered gates; no extra approval is needed merely to advance a satisfied gate.

Known residual decisions in the proposed scope: trust reviewed same-ASUS operator processes rather than pretend OS principal separation; accept actual restore NOT_TESTED and retain a readable backup; disclose unknown historical checksum inputs while requiring current relevant schema compatibility. No unknown structural difference, unsafe DML permission, missing backup or destructive test is waived.

Original R1.2a dedicated-DB/trusted-root criterion is explicitly substituted by the new main-mode controls after matching approval; old isolated Gate B is never declared PASS. Original003 stays implementing until all remaining mandatory software/history/authorization/regression evidence is achieved and lifecycle permits verification. No APPROVED_RELEASE or actual learner admission is included; any mandatory check that needs them stays BLOCKED and prevents false full acceptance.

## Verification and handoff

Actual read-only checks: Git baseline/status, selected Docker identity/mount/state/entrypoint, source grep/targeted reads, installed Prisma6.19.1 flag inspection, targeted Git/hash/reconstruction comparisons and absence of proposed new artifact roots. SQL refresh blocked because both containers stopped. Some initial rg probes used unsupported Windows wildcard paths or guessed file locations; corrected to exact existing paths. No test suite or product build run; historical PASS reports reused as history only.

No backup/root/role/fixture/test server created. New source/filesystem/database grants are PROPOSALS only; approval=null until actual matching human message. Plan self-review covers exact identity, no env fallback, protected data/grants, lookup/upsert/cascade ownership, no false restore/learner claims and rollback.

Primary references: [PG17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html), [PG17 pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html), [PG17 privileges](https://www.postgresql.org/docs/17/ddl-priv.html). A full dump covers one DB; role metadata needs separate backup. pg_restore file output is archive decoding, not applying SQL to a database.

SKILL AUDIT: mandate-steward -> dedupe/capture/CLI; systematic-debugging -> checksum hypotheses/source evidence, no invented repair; writing-plans + brainstorming -> one reviewed plan for explicit owner intent, no repeated preference questions; codex-quota-optimizer -> reuse existing scope/tests/reports and small hashes; supabase-postgres-best-practices -> minimal role rights/short bounded fixture locks; verification-before-completion/Git workflow -> artifact locks/register/explicit docs-only commit. TDD/executing-plans/OS/DB execution not entered in this preapproval task.

[Plan](../../docs/superpowers/plans/2026-10-26-beginner-main-db-qualification.md); [scope](2026-10-26-beginner-main-db-scope.json); [checksum evidence](2026-10-26-beginner-main-db-checksums.json).

Read-only offline metadata refinement: docker cp from the EXISTING stopped container read only PG_VERSION and global/pg_control into memory; no container/PG startup or new instance. PG_VERSION17 and control-header systemID7692646346822291490 match prior SQL. No data rows or passwords read; this is neither backup nor live catalog/schema/health/CRC verification. The current control-file digest is timestamped evidence, not a future immutable value.

## Fresh builder review disposition

Franklin (agent01a177ef-ee82-77c0-9f69-fd5c381034ca) found four actionable gaps, all settled by coordinator before capture: explicit LearningProgram SELECT columns added; one hard4h authority window with30m cleanup reserve/fail-closed expiry; single execute coordinator for memory-only password/session handoff and cleanup-only crash recovery; canonical slug/code exceptions from unchanged services with exact-ID collision/ownership checks. No additional human preference or second environment needed. No second review verdict is claimed. Same-operator/unknown checksum/untested restore risks remain explicit for the one owner approval.

Self-review resolutions: public command entrypoints now preflight/unit/execute/cleanup-recovery, with one in-memory coordinator across all14 internal phases; absolute4h deadline and30m cleanup reserve cannot be silently reset. Runtime protected read tables include pinned-history/count checks; LearningProgram SELECT has explicit11 columns. Schema comparison normalizes default-vs-null ACL representation after exact role grant/revoke, without catalog rewriting. Baseline133 source rows are pre-code locks; future allowed source commits must be bound in the execution capsule, while frozen documents remain byte-normalized locks. No source changes implemented now.
