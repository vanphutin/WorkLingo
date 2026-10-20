# IELTS local Beta content and release

Task 2 of `docs/superpowers/plans/2026-10-15-ielts-local-beta.md`. The content worker prepared the reviewed utility without database writes. **The parent subsequently completed the authorized local publication after review**, at 2026-10-15 07:10 UTC. Post-release verification confirms all five phases ready, BETA selectable at `/ielts`, and four stored speech WAVs with matching checksums. Reviewed rerun returns `ALREADY_RELEASED`. See `mandate/reports/2026-10-15-ielts-local-beta-release.md` for exact evidence. No commits, paid synthesis or public deployment.

## Selected content

Inspected the existing local database on loopback port 55432, schema `public`, and authored drafts/current immutable publications. No learner records were queried.

| Phase | Observed | Prepared decision |
| --- | --- | --- |
| Orientation | Archived, revision 1, nine meaningful original slides, no current publication | Retain the nine-slide introduction and existing checks; clarify Academic Writing timing/weight and local Beta limitations; publish a new reviewed version through `OrientationAdminService` |
| Bridge | Four current published versions; Listening parent also had a validated draft | Retain the original analysed examples; add distinct supported, harder and timed exercises; replace vague Writing plans with concrete prompts and vary Speaking prompts; publish new versions through `IeltsBridgeAdminService` |
| Integrated Practice | Current published 60/90/120/150-minute profiles | Reuse unchanged: allocations total their stated durations and cover all four skills; these are schedules, not additional exam papers |
| Band Pathway | Draft, revision 1, seven structurally valid stages | Retain prerequisite order and evidence thresholds; add distinct skill-specific outcomes and remediation at all seven stages; state heuristic thresholds and teacher review; use `IeltsBandAdminService` |
| Academic Mock | Validated synthetic fixture, revision 1; unsupported “answer 1…40” keys, repeated passages, missing chart and audio | Replace the draft with an entirely original practice paper; use `IeltsMockAdminService` including its genuine-audio publication gate |

The mock contains 40 Listening questions and 40 Reading questions. Its three fictional Reading case studies total **2,388 words**: a library lending equipment, a volunteer river-observation project, and an organisation improving its knowledge system. All answers are supported by explicit evidence excerpts. Authoring files include the keys/excerpts; learner DTOs retain the existing answer-key redaction.

Listening has four original scripts in the usual social conversation / social monologue / educational conversation / academic monologue sequence: booking a repair workshop, visiting a wetland reserve, planning a university transport survey, and studying urban heat. Parts 1 and 3 use alternating actual voices. This content makes no claims about real research participants or places.

Writing Task 1 supplies an actual fictional 2018/2021/2024 participation table (including the nonexclusive-category note). Task 2 asks who should fund practical adult courses. Speaking includes familiar questions, a complete Part 2 cue card and connected abstract discussion. Existing Writing/Speaking teacher-review and learner prerequisite gates remain in force.

Bridge Listening currently supports transcript-based strategy exercises; it is not represented as an audio-only test. Some analysed examples are intentionally retained for continuity, while subsequent practice now uses new evidence and prompts. Existing pinned versions retain their original content.

## Format, estimates and limits

Compared structure with official [Listening](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-listening), [Academic Reading](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-reading), [Academic Writing](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing) and [Speaking](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking) documentation. Those pages are format references only; no exam questions or sample passages were copied. This paper retains structural section limits of 30/60/60 minutes and the 11–14-minute Speaking model. Writing uses 150/250-word minima and 1:2 weighting. Reading length is within the published 2,150–2,750-word range.

This is **local Beta learning/practice**, not an exam-equivalent simulation or certification. Audio totals approximately **12.6 minutes**, shorter than a full Listening paper, and uses synthetic US voices only. Objective tasks use short answers only, not the full variety of IELTS task types. `EXAM_SIMULATION` is deliberately absent from `allowedModes`. Productive-skill quality, difficulty and scoring have not been externally calibrated or certified. Raw scores and feedback are the useful outputs; displayed bands remain local estimates.

[IELTS scoring guidance](https://ielts.org/take-a-test/your-results/ielts-scoring-in-detail) describes average reference points that vary between test versions. The local conversion replaces the linear fixture: Listening raw 16/23/30/35 and Academic Reading 15/23/30/35 map to 5/6/7/8. Other local anchors are 0→0, 10→4, 39→9 and 40→9. Intermediate values interpolate between anchors and round **down** to a half band. Those extra anchors and intermediate thresholds are explicitly approximate local policy, not published official thresholds or a validated calibration for these original questions. The paper's learner-visible disclosure states “uncalibrated local estimate.”

## Offline audio and provenance

No API key, paid provider or application worker is used. `prepare-audio.ts` invokes installed PowerShell 7 (`pwsh.exe`) and `System.Speech`, selecting Microsoft David/Mark/Zira by their real installed names. Windows PowerShell 5 exposed only Desktop variants and failed to select Mark; PowerShell 7 was verified with the actual installed voices. No fake artifact is relabelled or updated.

| Part | Actual voices | PCM seconds | Bytes |
| --- | --- | ---: | ---: |
| 1 | David, Zira | 196.8295 | 9,447,862 |
| 2 | Mark | 158.7045 | 7,617,862 |
| 3 | Zira, David | 185.2900 | 8,893,966 |
| 4 | David | 216.6495 | 10,399,222 |

WAVs are mono 24 kHz, 16-bit PCM. Checks cover RIFF/chunk bounds, PCM format, non-silence, duration, four distinct checksums, script/voice provenance and file hashes. Generated local files and the manifest live under `apps/api/src/ielts-beta-release/.prepared/`, ignored by the owned `.gitignore`. The original scripts and evidence remain reviewable source. A future execute stores these real bytes through `LocalObjectStorageAdapter` in the existing `D:/Projects/WorkLingo/apps/api/data`, creates **new** deterministic-ID `READY` artifacts with `adapterName: local-windows-speech`, and records provenance/audit entries. It rereads/checks stored bytes before BETA.

To regenerate locally, from the shared worktree root:

```powershell
pnpm --filter @worklingo/api exec tsx src/ielts-beta-release/prepare-audio.ts
```

This preparation command writes files only. Regeneration may change waveform checksums, artifact IDs and the release fingerprint; always run/review a fresh dry run afterwards. Byte checks cannot establish perceived pronunciation or pedagogical quality; parent content/audio review remains appropriate.

## Dry run and parent execution

Run from `C:/Users/ASUS/.codex/worktrees/audio-dashboard-v2/WorkLingo`:

```powershell
pnpm --filter @worklingo/api exec tsx scripts/release-ielts-beta.ts
```

Dry run is default and read-only for the database **and storage**. It does not create snapshots. It reads `.env` through `process.loadEnvFile`, never prints credentials, and selects an existing active CONTENT_ADMIN/SYSTEM_ADMIN privately. Optional `IELTS_BETA_ACTOR_ID` in the parent process environment constrains that selection; its value is never printed. The script instantiates publishers directly, without AppModule or background workers.

After reviewing the output and final files, the **parent**, not this worker, may execute:

```powershell
pnpm --filter @worklingo/api exec tsx scripts/release-ielts-beta.ts --execute --expect=FINGERPRINT_FROM_REVIEWED_DRY_RUN
```

Replace the placeholder with the entire 64-character fingerprint. The current dry run reported `6c0fdbe63ef46788ee3d09184f1b763b3ee1af149a90705c694c0f13f7347d04`; repeat the dry run after independent review. Wrong flags, a stale fingerprint, a non-loopback endpoint, a port other than 55432, a database other than `worklingo`, or a schema other than `public` fail closed. Other connection-query parameters are rejected to avoid connection overrides.

Execution writes a private, flushed, exclusive-create snapshot before any storage/content mutation. `.private/` is ignored; Windows inheritance is removed and ACLs grant the current Windows identity and SYSTEM. An ACL/snapshot failure aborts before writes. The snapshot includes selected authored parents/drafts/current publications, program metadata, selected artifact metadata and intended content. It contains neither the environment/connection URL nor learner progress, checkpoint data, enrollment or review records. Keep it private.

The release acquires parent-row locks and checks the fingerprint again inside one RepeatableRead transaction. A transaction-bound Prisma facade makes existing publishers participate in that same transaction while retaining their revision checks, idempotency receipts, immutable versions and audit logs. It publishes Orientation and Bridge, then the Band Curriculum and Mock. The four profiles are reused. Actual stored WAVs and `readIeltsProgramReadiness(tx)` must pass before the **last** catalog metadata update sets BETA. Failure rolls back database changes. Transaction tests use in-memory state; no live database mutation was performed to test this worker.

Rerun a dry run after success: unchanged selected current content/media and BETA yield `ALREADY_RELEASED` on a reviewed execute, without another snapshot/version. The fingerprint changes after a successful release because revisions/current pointers changed; an old execute command fails safely and requires a fresh dry run. A failed transaction can leave additive unreferenced storage files; preserve these for review instead of deleting anything that could be pinned. No historical content, learner progress, context, checkpoint, rubric review or version pin is rewritten.

## Compensating rollback

There is deliberately no full-database restore or reset command. Do not replay the snapshot into every table: learner activity may have continued since release.

1. Load the private `before-*.json` snapshot in the parent process without printing its full contents. Confirm the release name, fingerprint, affected IDs and audit events. Inspect current selected pointers/revisions; stop on any later administrator publication or edit.
2. In a scoped transaction, lock the IELTS program and affected parents in the same order as release. Restore the snapshot's catalog availability (initially IN_DEVELOPMENT) with a compare-and-set check against the release's BETA metadata/audit. This relocks entry.
3. Only for parents whose **new current version** is still exactly the reviewed release version, mark that new version ARCHIVED with an archive timestamp and mark the parent ARCHIVED. Retain the pointer or clear it consistently with the model; never delete a version. Identify the new version through its publication audit/source content and snapshot's previous pointer, not merely “latest version.” Profiles and skipped publications are untouched. Record compensating audit entries with the existing admin actor and snapshot fingerprint.
4. Retain old/new immutable content, artifact bytes, learner pins, ongoing attempts and review records. Do not rewrite historical version content or change learner evidence to resemble the snapshot. This is a compensating disable, not a reversal of legitimate learner activity. If restoring a prior publication is desired, review that separate publication decision rather than silently resurrecting a historical version.
5. Read catalog readiness and metadata again to verify entry is locked. Retain the snapshot/audit trail. Treat orphan-file cleanup as a separate referenced-object audit; do not delete files during rollback.

## Verification and handoff

Independent-review corrections: scored Bridge practice stages now use neutral directions instead of answer explanations. The actual Bridge and Integrated learner DTOs are regression-tested to keep these directions neutral and redact answer keys/rubrics; explanations remain in authored feedback, which existing services return only on submission. The Listening registration question explicitly requests the general document category (“identification”), not an example. The bird-observation question accepts both “wooden hide” and “hide”. Each alternative has an explicit reviewed evidence excerpt present in the source and explanatory feedback. Validation rejects unreviewed alternatives even if an unrelated phrase occurs elsewhere in the script. The real objective scorer tests cover both accepted variants, case/spacing normalization, incorrect answers and the two-word limit. All three regressions failed before the fixes and then passed. No script turns or WAV bytes were regenerated.

Focused commands:

The bounded follow-up review of all 40 Listening and 40 Reading keys added 22 explicit alternatives, with source excerpts preserved in feedback: Listening Q6 “a notebook”, Q8 “library stop”, Q9 “an adult”, Q11 “east gate”, Q20 “at reception”, Q21 “the cafeteria”, Q27 “a spreadsheet”, Q34 “dark asphalt”, Q36 “underground cables”, Q39 “the night”; Reading Q6 “refundable deposit”, Q7 “a waiver”, Q15 “regional laboratory”, Q22 “duplicate”, Q24 “a woodland”, Q27 “bulletin”, Q28 “central repository”, Q30 “a glossary”, Q31 “an owner”, Q33 “an archive”, Q35 “checklist”, Q38 “clinics”. Every listed case failed with the real scorer before the additions and passed afterwards. The 23-case table also checks wrong/over-limit answers and meaningful modifiers; no global article/adjective stripping was introduced. Final scoped suite: 50 tests across nine files. WAV provenance hashes, script turns and bytes remain unchanged.

```powershell
pnpm --filter @worklingo/api exec vitest run src/ielts-beta-release
pnpm --filter @worklingo/api typecheck
pnpm exec eslint apps/api/src/ielts-beta-release apps/api/scripts/release-ielts-beta.ts
git diff --check -- apps/api/src/ielts-beta-release apps/api/scripts/release-ielts-beta.ts docs/IELTS_LOCAL_BETA_CONTENT.md
pnpm --filter @worklingo/api exec tsx scripts/release-ielts-beta.ts
```

Covered: read-only default, local endpoint restrictions, snapshot-before-write, fingerprint conflict, rollback on publisher/readiness failure, BETA-last ordering, idempotent skip, fake/silent WAV rejection, original key evidence, duplicate questions, nontrivial passage length, distinct Bridge exercises, retained Band evidence gates, scoring anchors and real-publisher transaction binding. Parent completed full API qualification (884 passed before the final review regressions), final focused release/scorer qualification (53 passed), desktop/mobile entry qualification (two passed), independent review, actual local publication and post-release/idempotence verification. Historical worker-only notes above describe preparation; the linked release report is the final execution record.

## Later flow work

The independently entered introduction, contextual study and two-mode mock implementation is tracked in [IELTS Flow V3 review](IELTS_FLOW_V3_REVIEW.md). This document remains the record of the earlier Beta publication and its original content limitations.
