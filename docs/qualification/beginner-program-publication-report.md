# Beginner R2.1 publication and recovery

Date: 2026-11-07. Mode: **published Beta, unscored productive practice**. This is local engineering evidence, not production or human qualification.

## Verified primary target and release

Configured primary: `127.0.0.1:55432/worklingo`, public schema, PostgreSQL system identifier `7692646346822291490`. Credentials are excluded. Before admission: 47 applied migrations, 2 users, 0 programs/enrollments/sessions, 8,129 lexical entries and 8,742 senses. Revalidated immediately before primary work.

Backup: `D:/Projects/WorkLingo/backups/r21-20261107/primary-before-final.dump`, SHA-256 `a3544fc31769ae8bc900b1b5ba22bbdff6dd2e32485607153732d9a00db4a97c`. Restored successfully into the owned `worklingo_r21_backupcheck` database in the separate import-test container; recovered counts were 47 migrations, 2 users, 0 programs, 8,129 entries and 8,742 senses. The earlier full backup was also restored and migrated on isolated clones.

Three existing additive migrations were applied: `20261030000100_program_progression`, `20261030000200_r2_full_platform`, and `20261031000100_program_analytics_indexes`. No migration file was changed in R2.1. Primary now has 50 applied migrations.

The reviewed dry-run contained eight exact lesson sources, 64 activities, 32 objectives, 41 lexical mappings, 24 exact offline WAVs, one path, one level, two ordered curricula and one immutable release. It explicitly proposed zero master-library writes and zero existing-learner writes. Dry-run hash: `6e0eaa09fcec5b816e399e8864283a8bd848052adfef8b200153f2191c2ec4d0`. Inventory: `d5e9ba5e0843b27dcca327fd1e04fdc455e845885f9caadeb799da9b94a67776`.

The official CLI apply succeeded, then replayed successfully without creating another release:

| Identity | Actual value |
|---|---|
| Program | `10000000-0000-4000-8000-000000000001` |
| Published ProgramVersion | `aec36350-0b9f-426a-8e87-4d4033dfdb5c` |
| MG01 curriculum | `b7229378-042f-434b-82b3-c5807325a687` |
| MG02 curriculum | `cf047def-af32-4607-9dcb-233ac4c36756` |
| Availability / progression | `BETA` / `ACTIVITY_COMPLETION` |
| Hierarchy | Beginner → `mat-goc` → `MG_F0` → MG01 then MG02 |

MG02 requires MG01. Each unit contains its original four ordered lessons. Each lesson uses the canonical 45-minute Beginner planner.

| Code | Primary LessonVersion | Activities | Objectives | WAV |
|---|---|---:|---:|---:|
| MG01-L1 | `ce37c5d5-a0dd-4982-8a10-88bea820fea4` | 8 | 4 | 3 |
| MG01-L2 | `a36defac-5c6d-4c9a-92cb-5f647f5dd6b1` | 8 | 4 | 3 |
| MG01-L3 | `0c4d55fd-4e4b-4f9e-b9c9-cb7d54754cbb` | 8 | 4 | 3 |
| MG01-L4 | `9f5f03a8-7af9-43d9-b52c-ea6a15525a58` | 8 | 4 | 3 |
| MG02-L1 | `212d0a62-e2ec-43ee-814c-cde9da580654` | 8 | 4 | 3 |
| MG02-L2 | `f2c8ca6b-1b09-4230-8b87-5bd6c19eb420` | 8 | 4 | 3 |
| MG02-L3 | `a1d7d5ee-c880-4a5c-9f53-da2fc8d22095` | 8 | 4 | 3 |
| MG02-L4 | `67708bb6-1faf-4a4d-920a-5bc5ef370ab5` | 8 | 4 | 3 |

Readback independently compared all eight stored source hashes, all 24 stored audio checksums and physical bytes, both release bindings and all 41 audit mappings. Exact source/bundle matrix: [source reconciliation](beginner-program-source-reconciliation.md).

## Workflow and preservation

`apps/api/scripts/import-beginner-r21.ts` accepts explicit dry-run/apply modes, report, authority, actor, backup and new permission file. Four-hour schema-v3 authority pins database host/port/name/role/server identity, data directory, source inventory, reviewed dry-run and backup checksum. No HTTP endpoint supplies this authority.

The application importer holds an advisory lock and one outer transaction. Existing official Beginner authoring, curriculum, vocabulary and ProgramVersion services perform validation and lifecycle transitions. It records technical AI review under an explicitly named AI account with an unknown random password; this is never a human expert signature. Program versions move DRAFT → IN_REVIEW → APPROVED → PUBLISHED through the existing service and immutable database triggers remain active.

Primary master-library fingerprint before and after publication was identical: `931f0d9a2a5216587fd438aa872c4bd7fd5c77b961f0f24b19546b2f2f343dad` (SHA-256 over ordered per-table count/content digests). Eight master/provenance tables were included. Existing enrollment/session counts remained 0/0. Only the explicit technical reviewer account was added during admission.

The configured primary lacked the standard onboarding prerequisite. After publication, existing seed functions added the missing three standard catalog entries and official Foundation curriculum, using local fake seed audio. Existing catalog entries use empty updates; Beginner remained BETA with the same release pins. This additive prerequisite created no learner sessions or enrollments. No IELTS/placement curriculum or admin-password seed was executed.

## Recovery and verification

Offline audio is content addressed under `beginner-r21-reviewed-audio/<sha256>`. Existing bytes are checked, partial regular staging files are recoverable, and failed database transactions leave reusable verified objects rather than duplicate random copies. A genuinely interrupted transaction may retain unreferenced content objects; rerunning the exact admission reuses them. Do not delete audio referenced by published releases.

Fresh restored clone `127.0.0.1:55451/worklingo_r21`: **1 integration test PASS**, including dry-run zero writes, raw/inventory/audio mutation refusal, rollback after first actual audio put, content-addressed retry, exact 41/20 mappings, master fingerprint preservation, immutable release and idempotent replay. Its distinct release `ed64f83f-1c3e-43db-bf71-3ea0ba1dd998` is test evidence, not the primary release.

Recovery procedure: stop the affected local runtime; retain current database/storage and take a new backup; restore the verified dump into a separate replacement database first and verify target/counts before switching configuration. To withdraw new enrollment, use official program availability/release lifecycle commands while retaining published snapshots and enrolled history. Do not truncate, reset primary, delete immutable releases or automatically restore over later learner progress. The pre-publication backup restores the earlier 47-migration state and therefore requires matching application/schema handling.

Local operational artifacts are retained under `D:/Projects/WorkLingo/backups/r21-20261107/` and the R2.1 temporary evidence directory. Dumps, authority files and private connection files are excluded from Git. Runtime evidence and remaining qualification limits are in [learner journey](beginner-learner-journey-report.md) and [final acceptance](beginner-r21-final-acceptance-report.md).
