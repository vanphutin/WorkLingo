# IELTS Flow V3 — local rollout and verification

The approved design and eleven-task plan were implemented on 2026-10-15.
The three independent entries are live locally at http://localhost:3000/ielts.
The API runs on port 4000 and the web app on port 3000 in local development mode.
`WORKLINGO_IELTS_FLOW=v3` is persisted in the implementation worktree's local
`.env`; the runtime configuration and HTTP health checks were verified.

## Delivered behavior

- Revisit-able introduction: nine published slides, free navigation and optional
  reflection. A first visit pins slide one before navigation is enabled. Visits
  do not create earned Orientation, mastery or prerequisite evidence.
- Contextual study: twelve original topics and 144 independent IELTS chunks, with
  Vietnamese meanings, pronunciation, collocations, examples and common errors.
  Each topic has two actual contexts and four-skill plans for 90/120/150 minutes,
  default 90. Existing sixty-minute sessions retain their original snapshots.
- Mock tests: Practice supports pause/replay and feedback after submitted sections.
  Exam simulation uses server deadlines, ordered single-play Listening leases,
  hidden active answer keys and actual consented Speaking recordings. The new
  original Academic paper has 40 Listening/40 Reading questions and 1,790 seconds of
  offline speech plus meaningful read/check windows. Productive scores require
  teacher review before an overall local estimate is available.
- Independent availability and owner-scoped history preserve Intermediate context,
  early-access grants, old answers, old reports and pinned versions. Rollback
  blocks new V3 starts while retaining owned resumes.

See [content and provenance](IELTS_FLOW_V3_CONTENT.md), the approved
[design](superpowers/specs/2026-10-15-ielts-flow-v3-design.md) and
[plan](superpowers/plans/2026-10-15-ielts-flow-v3.md).

## Actual local publication

The project owner confirmed all four actual Listening tracks in this conversation:
“Đã nghe kiểm tra, audio ổn”. The freshly recalculated content fingerprint matched
that audition; `qualification.json` records the source-bound human confirmation:
`e3e343b124bc3e0fd54a40b4de390d210fc86e0435ccbd98fc2f5cbd52eda452`.
Independent text review and automated media/content checks are separate evidence.

All three additive migrations 00200/00300/00400 were rehearsed and applied to the
existing local public schema after a full private backup of the public database
and 2,647 existing storage files. The backup manifest contains 2,648 checksummed entries,
including the database dump; its checksum was checked. The release CLI also saved
its own private state snapshot and a second full backup before publication.

Publication used the existing lesson, introduction, topic and mock publishers in
one transaction. Twelve topics, sixteen real WAV artifacts, nine introduction
slides and the new mock were published. The post-execute dry run reports
schemaReady=true, reviewReady=true and complete=true. The reviewed pre-execute
state fingerprint was 265622f73664c84f98480c1f4e108e5c56e6f09df1bc5f4bbf25065c48484430;
the published state fingerprint was 8b987615bccb84376149a2e09a97634ff2140921e48598f1aa857d7ee3e584b8.

All thirteen existing learner/context/evidence tables had identical hashes before
migration and after publication, before normal learner runtime traffic resumed.
A read-only check of the selected account confirmed V3 admission and readiness of
all three sections, with twelve published topics. No learner attempt, score,
checkpoint, Bridge completion or language evidence was synthesized by the release.

## Final verification

| Gate | Result |
| --- | --- |
| Content-format package | 113/113 tests passed |
| Shared contracts | 102/102 tests passed |
| Full API | 986/986 tests across 196 files passed |
| Full web, after final browser corrections | 490/490 tests across 100 files passed |
| Full legacy browser suite | 69/69 passed, including previously skipped dependent checks |
| V3 desktop/mobile browser suite | 8/8 passed |
| Types, workspace lint and production build |Passed; final web types/lint/build rerun after its last source change |
| i18n | 33 namespaces, 1954 paired keys; 0 errors |
| Additive migration rehearsal |Passed; old data and existing playback activation preserved |
| Actual-original-media release rehearsal |Passed, including forced transaction rollback, idempotence and owned resumes |
| Compatibility rehearsal |Passed in both flag directions; final task receipt rerun passed |
| Runtime smoke |API database/storage healthy; IELTS web URL HTTP 200; V3 config and existing storage path verified |

The first `pnpm verify` run exposed four API fixture/guard issues, which were fixed.
The post-review root run then passed all package/API/web/type/lint/build gates, but
failed seven browser cases. Four were single-voice test stubs incompatible with the
existing distinct-speaker policy. Two exposed missing/localized mock version metadata;
the player now shows its pinned version, with a regression observed RED then GREEN.
The strengthened browser test changes the new edition's title and verifies the old
attempt still shows its original title/version. One Admin fixture hardcoded an old
program status even after earlier tests had correctly published IELTS Beta.

After those corrections, the entire web suite, types, lint and build passed again,
followed by the complete 69 legacy + 8 V3 browser sequence with exit 0. Earlier failed root
invocations are not represented as passing commands; the remaining failed stage
was resumed and verified. API/package source did not change after its green run.

Browser coverage includes real MediaRecorder capture, PCM normalization/upload,
owner reload, teacher audio playback/review, exact-deadline expiry, preserved saved
answers, 90/120/150 sessions, introduction replay/history, both locales and both themes.
Synthetic transport fixtures are not used to qualify the actual release content.
The actual WAV bytes, hashes, timelines and source provenance were checked separately.
Ordinary clean-checkout unit tests use tracked metadata; the local actual-byte release
rehearsal genuinely ran with prepared files and was not skipped.

## Independent review corrections

The whole-branch reviewer requested changes on eleven actionable findings. All
entered one consolidated test-first correction pass; no second review verdict is
attributed to that reviewer. No minor findings were deferred.

| Finding | Correction |
| --- | --- |
| Released topic completion |Publish valid curriculum objectives, evidence and prerequisites; exercise a real completion/projection transaction without invented mastery. |
| Rollback starts |Reject new V2-paper starts under legacy, including grant holders; preserve existing resumes. |
| Failed first stream |Reserve one lease, activate only after actual browser playback, and retain delayed initial delivery retry. Backfill existing leases as already activated. |
| Uncertain saves |Recover server revision after lost mutation responses while preserving newer local drafts. |
| Capture overrun |Trim captured PCM samples to the authored Speaking duration before upload. |
| Initial slide pin |Save slide one before navigation is enabled. |
| Practice availability |Permit a playable Practice-only publication independently of simulation qualification. |
| Retention failure |Use bounded retry/backoff and manual retry for temporary storage cleanup errors; mark deletion only after storage succeeds. |
| Topic audio |Require the same READY, non-fake Listening binding as the learner endpoint. |
| Recall disclosure |Remove required phrases and complete target language blocks server-side for vocabulary response-writing; return only the count. |
| Live draft editing |Retain current publication while editing a replacement, then switch versions atomically. |

Affected API corrections passed 22/22 checks and feature UI corrections passed 29/29
before the full gates above. The final mock version-display correction was also
observed failing before its fix, then covered by the full 490 test web run and both
legacy mock browser journeys.

## Decisions and remaining limits

1. Preserve the 130 pre-existing dirty paths and all task evidence. Automatic commits,
   merge, push and worktree cleanup were not authorized. Cost: the branch remains
   uncommitted and its retained worktree is required for the running app.
2. Add an opt-in productive speaking/writing pair per response block. Cost: this
   explicit planner adapter must remain scoped to V3; legacy defaults stay intact.
3. Rank within each productive skill before pairing. Cost: global review priority
   cannot let one skill displace the other required skill.
4. Run legacy and V3 browser configurations sequentially with disposable schemas.
   Cost: the final browser command must invoke both configurations.
5. Continue independent Task 10 navigation while Task 9 audition was pending. Cost:
   content qualification and release remained incomplete until the owner confirmed
   the actual tracks; no silent approval was inferred.
6. Require Listening bindings without inventing played shadowing models for
   spontaneous Speaking proposals. Cost: future explicit shadowing models need
   their own required-model qualification.
7. Preserve a stale Next E2E cache during diagnosis. The same source passed with a
   clean cache; no application workaround was introduced. Cost: retained ignored
   diagnostic files consume local disk space.

The course and mock are original fictional local teaching material, without external
band calibration or official IELTS certification. General Training, cloud deployment,
payment and proctoring were outside the approved scope. Implementation and qualification
made no paid provider calls. Normal local runtime retains its existing provider settings.

## Operations and audit

The app is served from the retained `codex/audio-dashboard-v2` worktree at
`C:/Users/ASUS/.codex/worktrees/audio-dashboard-v2/WorkLingo`, using existing storage
`D:/Projects/WorkLingo/apps/api/data`. Generated speech, private backups and learner
snapshots remain ignored. API/web run in managed tool terminal sessions; creation of
a separate Windows background launcher was automatically rejected and did not execute.

Rollback sets `WORKLINGO_IELTS_FLOW=legacy` in the local environment and restarts the
API. Keep immutable versions, recordings, attempts and reports; do not run destructive
down migrations or fabricate prerequisite completion. The CLI remains dry-run by
default and requires an exact inspected fingerprint for a new execute operation.

SKILL AUDIT

Used: executing-plans → approved task execution and ledger; receiving-code-review,
TDD and systematic-debugging → reproductions and corrections; requesting-code-review
and code-review-and-quality → independent review; NestJS/Postgres skills → services
and additive migrations; UI/UX and React skills → components; verification-before-completion
and Git/worktree skills → checks and preservation of existing work.

Verification: the exact results above are backed by retained command logs/task receipts
under `.superpowers/sdd/2026-10-15-ielts-flow-v3/`.

Not used: a new brainstorming/planning cycle, because the design/plan were approved;
a new mandate audit/register, because this was scoped implementation; integration or
cleanup workflows, because commit/push/merge and worktree removal were not requested.
