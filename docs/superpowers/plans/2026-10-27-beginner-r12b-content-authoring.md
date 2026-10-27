# Beginner R1.2b Offline Content Authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task after matching human approval. Steps use checkbox (`- [ ]`) syntax for tracking. Native execution reuses the current worktree and existing validators; no per-Lesson agent dispatch.

**Goal:** Author eight genuine MG01 → MG02 lesson sources for teacher review, with reproducible offline qualification and honest audio/timing/readiness evidence.

**Architecture:** This is a bounded authoring addendum to [the existing R1.2b plan](2026-10-24-beginner-implementation.md#r12b--tám-bài-thật-audio-sư-phạm-và-timed-rehearsal), not a new curriculum or product implementation. Reuse the shipped Foundation1.2 parser, draft snapshot builder, exact-version planner, rubric registry and learner projection without modifying them. Text authoring may proceed independently of R1.2a DB qualification; publication, live preview and learner access remain closed.

**Tech Stack:** WorkLingoLesson/1.2 text, TypeScript/tsx, Node test runner, existing content-format and API pure functions; no DB/provider/storage client.

**Spec:** [Knowledge Map](../specs/2026-10-24-beginner-knowledge-map.md) MG01/MG02; [final refinement](../specs/2026-10-24-beginner-final-refinement.md); [resource design](../specs/2026-10-24-beginner-curriculum-resources-design.md); [original Video Production Plan](../specs/2026-10-24-beginner-video-production-plan.md) six pilot slots; user request recorded in [preapproval review](../../../mandate/reports/2026-10-27-beginner-r12b-preapproval-review.md).

## Global constraints

- Proposal only. No lesson/helper implementation before separate matching R1.2b approval; R1.2a approval does not transfer.
- One Beginner Program; Mất gốc/Stage MG-F0 pilot MG01 → MG02 only. MG02 hard prerequisite is MG01 Unit mastery covering L1–L4; Lesson order within a Unit is recommended, not a new hard gate. Pilot completion does not establish stage completion or CEFR attainment.
- Existing runtime contract: 45 minutes, eight assessed activities per Lesson (3 reading / 3 listening / 1 speaking / 1 writing), three planned blocks of15 minutes. These targets are not observed learning time. Human timing acceptance/tolerance is still unapproved; the older35–50-minute range remains a proposal.
- Author exactly four required single-skill objectives per Lesson: reading/listening/speaking/writing; 16 per Unit,32 total; 64 distinct assessed activities total. Three comprehension activities may evidence the same corresponding skill objective. No single four-skill objective mapped indiscriminately to every activity.
- VI explanations/instructions, EN learning tasks; fictional names only; no personal data. Editorial objective/evidence/audio-script slugs are not database identities.
- No copying synthetic unit lessons as pilot content. Synthetic fixtures may be reused solely to test checker failure/success behavior and never counted among the eight real sources.
- No product/schema/config/rubric changes, database reads/writes, migration/seed/import/publication/release, live Admin API/browser actions, enrollment, external AI/STT/TTS calls, media upload or OS/security changes. No R2/R3/R4, merge/push/deploy.
- Proposed media treatment: write complete audio scripts in lesson text; audio remains editorial NEEDS_AUDIO and content NOT_READY. Runtime blocker is AUDIO_NOT_READY, not a new invented DB enum. No silent PCM, text disguised as audio, fake artifact IDs/keys/checksums, release JSON or video resource placeholders.
- Preserve six VP codes: VP-MG01-G, VP-P-ALPHABET, VP-MG01-X, VP-MG02-G, VP-P-ENDINGS-S, VP-MG02-X; all PLANNED/NOT_STARTED and optional. Do not replace their authoritative plan with an interpreted60-video list.

## Exact future write allowlist

Create only these11 files; no existing product file is modified:

1. `content/beginner/pilot/mg01-l1.lesson.txt`
2. `content/beginner/pilot/mg01-l2.lesson.txt`
3. `content/beginner/pilot/mg01-l3.lesson.txt`
4. `content/beginner/pilot/mg01-l4.lesson.txt`
5. `content/beginner/pilot/mg02-l1.lesson.txt`
6. `content/beginner/pilot/mg02-l2.lesson.txt`
7. `content/beginner/pilot/mg02-l3.lesson.txt`
8. `content/beginner/pilot/mg02-l4.lesson.txt`
9. `docs/qualification/beginner-pilot-content-review.md`
10. `apps/api/test/beginner-pilot/qualify-content.ts`
11. `apps/api/test/beginner-pilot/qualify-content.test.ts`

The two test-only files adapt existing pure functions to the eight real source files; they do not replace validators or implement Admin/runtime behavior. CLI/lifecycle records and the named future human decision/verification reports are governed separately in the scope artifact. Media files, released manifests and production/test DB records are outside this allowlist.

## Review focus

1. A source can pass syntax while audio/human review is missing: report offline compatibility separately and retain NOT_READY.
2. Incorrect comprehension, accidental answer leakage through visible instructions/content/LanguageBlocks, or altered test data: combine DTO checks with explicit teacher inspection, including listening transcript concealment.
3. Repeated cloned activities or support that replaces the assessed transfer task: require genuinely distinct contexts/data and progression L1→L4, not slug changes.
4. Missing `an` examples or overextended grammar: inventory additional supporting lexical examples as proposed only; teacher must resolve before that Lesson is content-ready.
5. Eight activities or a45-minute plan do not prove duration, ability, pronunciation or CEFR: rehearsal must have real participants/observer and no enforced idle/replay inflation.

## Task 1 — Offline checker and MG01-L1 reference lesson

**Create:** the two checker files, `mg01-l1.lesson.txt`, and the qualification report with eight truthful status rows (not eight fake lessons).

**Consumes:** `analyzeLessonSource(source)` from `@worklingo/content-format`; `buildBeginnerDraftSnapshot(draft)` from `apps/api/src/curriculum-foundation/application/foundation-validation.ts`; `projectLearnerActivity(snapshot,activityId)` from `apps/api/src/learning-sessions/domain/learner-activity-projection.ts`; `resolveBeginnerRubric(id,version,skill)` from `apps/api/src/teacher-ai/domain/beginner-rubrics.ts`. Snapshot construction already exercises `planBeginnerSession` with a supplied exact in-memory version identity; no resolver/DB lookup is permitted.

**Produces:** `qualifyPilotSources(sources: readonly {code:string;rawSource:string}[]): PilotQualification`, where the result has per-Lesson parser/planner/objective/activity/script-reference/redaction checks, source SHA-256, missing lesson codes, aggregate counts and `contentReadiness:'NOT_READY'`. `audioStatus:'NEEDS_AUDIO'`, reviewer=null and `rehearsal:'TIMING_NOT_VERIFIED'` are editorial report fields, not schema changes. CLI takes exactly `--lesson mg01-l1` or `--all`; fixed allowlisted source paths, no arbitrary input/DB/API/output path arguments. Print bounded JSON; failures exit nonzero, no skipped case counted PASS.

- [ ] Before authoring, recheck proposal/plan/review/scope/allowlist/baseline hashes and record genuine human approval via CLI. Missing/mismatching approval stops before these11 files.
- [ ] Write checker tests using Node `node:test`: absent expected source FAIL; malformed1.2 FAIL; 7 or9 activities FAIL; missing/duplicate objective or evidence FAIL; wrong exact rubric FAIL; unresolved script/incorrect evidence line FAIL; private answer keys/model/rubric/audio transcript absent from learner DTO; missing physical audio never yields CONTENT_READY. Use existing small test fixtures only for checker tests.
- [ ] Run RED: `pnpm --filter @worklingo/api exec tsx --test test/beginner-pilot/qualify-content.test.ts`.
- [ ] Implement the narrow pure adapter and real MG01-L1: I/you+be, greeting/name/origin, name-card context, recognition of name-letter/sound and name stress, framed response. Split four observable can-do objectives and map actual evidence. Teach before assessing with different data; do not copy a model answer into a visible response prompt.
- [ ] Use original editorial wording/definitions, explicitly teacher-review-required; do not invent approved vocabulary-master source/sense IDs. Core candidates follow the Knowledge Map. Function-word forms and fictional names serve only the mapped task. Additional semantic vocabulary must be listed with rationale/reviewer status in the report; no undocumented expansion. Proposed minimal `an eraser` example is not assumed approved.
- [ ] Run checker tests GREEN, then `pnpm --filter @worklingo/api exec tsx test/beginner-pilot/qualify-content.ts --lesson mg01-l1`. Inspect actual content for semantic/answer correctness; record AI/editor self-review distinctly from teacher review. Audio/ref/rehearsal gates remain open.
- [ ] Review explicit diff and commit this independently usable authoring/checker slice after technical checks. It is a draft source, not a published/content-ready Lesson.

## Task 2 — Complete MG01 and MG02 sources without extending curriculum

**Create:** remaining seven `.lesson.txt` sources. **Update:** qualification report; checker only if its scoped test behavior exposes a defect.

**Consumes/produces:** same `qualifyPilotSources` interface; eight unique source slugs,32 objective slugs,64 activity slugs, all script/evidence references local to their source.

| Lesson | Authoring requirement from Knowledge Map | Hard / recommended prerequisite |
|---|---|---|
| MG01-L1 | Framed greeting/name/origin; name card; I/you+be | Entry F0 / first lesson |
| MG01-L2 | Same grammar; name sounds/letter names/name stress; distinguish listening and own intelligible response | Entry F0 / L1 |
| MG01-L3 | New introduction setting/data; integrate same vocabulary, reduce scaffolding | Entry F0 / L1,L2 |
| MG01-L4 | Independent introduction transfer/unit check in new context | Entry F0 / L1–L3 |
| MG02-L1 | Identify/request objects and quantity; a/an,this/that,plural; labelled list/context | MG01 Unit mastery / first lesson |
| MG02-L2 | Same grammar; final consonants/plural meaning in real mapped words; clarity rather than accent imitation | MG01 Unit mastery / L1 |
| MG02-L3 | New object-finding/message context; reduced scaffolding | MG01 Unit mastery / L1,L2 |
| MG02-L4 | Independent object/quantity transfer check; no new curriculum | MG01 Unit mastery / L1–L3 |

- [ ] For every Lesson, write meaningful theory, pronunciation support, examples,3R/3L/1S/1W assessed tasks with exact answer/explanation/evidence, three complete listening scripts, guided speaking and short writing with authored min_words/model/rubric. Model answers and transcripts are private assessment data. No placeholder or unsupported custom format metadata.
- [ ] Keep support in INSTRUCTION/CONTENT and assessed work in ACTIVITY. A shadowing demonstration can support learning but cannot replace the assessed guided-response task. Choose pedagogically defensible minimum output lengths per task; inherited min_words1 in a synthetic fixture is not a learner content standard.
- [ ] Require each comprehension question to have exactly one justified answer, genuinely distinct distractors and an exact source/script line. Automated checks verify structural links; a teacher must verify correctness/naturalness and that support does not reveal assessed answers.
- [ ] Run `pnpm --filter @worklingo/api exec tsx test/beginner-pilot/qualify-content.ts --all`; verify8/8,64 assessed activities,32 single-skill objectives (16/Unit),24 listening activity→script bindings. Actual audio file count remains0 unless independently supplied through a later authorized media scope.
- [ ] Run the checker tests and relevant existing parser/planner/projection/rubric regressions. Record every automated FAIL and fix source problems; product defects outside this allowlist become blockers, not scope expansion.
- [ ] Commit authored MG01 and MG02 changes in reviewable groups after focused checks, retaining source hashes/report provenance.

## Task 3 — Teacher/audio/rehearsal dossier and truthful handoff

**Update:** `docs/qualification/beginner-pilot-content-review.md` only.

- [ ] Eight rows include lesson/source status+hash, audio status, parser/planner result, four objective/evidence mappings, reviewer, rehearsal, blockers and readiness. Attach per-Lesson vocabulary/provenance and answer review notes; preserve the six original optional VP mappings as PLANNED, without resource metadata.
- [ ] Document proposed AmE for later narration/IPA consistency as an editorial default awaiting human confirmation, VI explanations + EN examples, names/letter names/final consonants/number reading/intelligibility review. No TTS credentials or licensed-voice assumptions are made.
- [ ] Prepare an unfilled rehearsal procedure: suitable beginner participant identified only by non-identifying code, named consenting reviewer/observer when actually appointed, exact source/rubric/audio hashes, real phase/active elapsed times, assistance/replay notes and findings. Leave actor/time/outcome null or NOT_RUN until real observation; no fabricated participant or timings.
- [ ] Teacher verdict and actual audio are human/external gates. Offline rehearsal may be planned, but no learner session/enrollment/attempt or live Admin preview may be created by this mandate. If required real audio/teacher/rehearsal evidence is unavailable, keep NOT_READY/TIMING_NOT_VERIFIED and report the blocker.
- [ ] Run `pnpm --filter @worklingo/api typecheck` and lint only the two new checker files; no app build or DB/E2E is required for text-only changes. Final content checker + focused regressions are recorded honestly. Validate mandate register and review the final diff before local commits.

## Acceptance, dependencies and rollback

Text authoring acceptance is eight distinct complete reviewable sources, exact64/32 counts, all structural checks PASS and a reproducible eight-row dossier. This is **not full R1.2b completion**. Full R1.2b/CONTENT_READY requires all eight real reviewed audio sets, teacher pedagogical/rubric approval and observed timing with an approved acceptance policy, plus separately authorized publication/runtime gates. Technical checks cannot impersonate those approvals; R1.2a remains implementing until its own mandatory gates pass.

No R1.2a verified dependency blocks offline authoring. R1.2a live preview/test publication, media production/attachment and any learner release require their own valid authority. No automatic upgrade of the parent or existing mandates, no new database/worker proposal.

Rollback: keep new sources as unpublished NOT_READY drafts; revert only the named new files/authoring commits if needed after checking no references. Never delete historical source/media evidence, undo published content or touch DB/progress. Any outside source defect or necessary allowlist change stops dependent work for a separately captured scope.

Self-review: all request sections map to Tasks1–3; missing media/teacher/timing inputs are explicit limits, not scaffold completion. The small checker only adapts existing contracts and never approves content, writes DB or synthesizes audio. Human approval of this scope is still null.
