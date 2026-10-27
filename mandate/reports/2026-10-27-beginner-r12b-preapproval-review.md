# Beginner R1.2b preapproval review — 2026-10-27

**PREAPPROVAL ONLY. No execution approval or authored pilot content.**

## Verified state and request

Worktree `C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo`, branch `codex/foundation-basic-readiness`, baseline `613fcec48a2b40b3a3e720c6a57fc5b0534562b4`; clean at task entry. Existing status was read directly from mandate frontmatter: parent MND-20261024-001 captured/approval=null; R1.1 MND-20261024-002 verified; R1.2a MND-20261024-003 implementing; main qualification MND-20261026-003 implementing. Their scope does not allow creating real R1.2b content. No active/archive duplicate focused R1.2b authoring mandate was found by CLI search and body comparison.

The human request was supplied as `C:/Users/ASUS/.codex/attachments/e06ece61-e2e1-43d2-9bc3-452f04e1385a/Pasted text.txt`. It explicitly requires capture of separate scope/hash and stopping before authoring if no R1.2b authority exists. This report records that request, not a human execution approval. Main DB execution is not resumed by switching tasks.

## Source reconciliation

| Source | Finding |
|---|---|
| `docs/superpowers/specs/2026-10-24-beginner-knowledge-map.md:11` | MG01 four-Lesson unit: I/you+be, greeting/name/origin, name sounds/letters/stress; hard Entry F0, recommended Lesson order. |
| `docs/superpowers/specs/2026-10-24-beginner-knowledge-map.md:24` | MG02 four-Lesson unit: a/an,this/that,plural, final consonants, object/quantity identification/request; hard MG01 mastery includes L1–L4. |
| `docs/superpowers/specs/2026-10-24-beginner-video-production-plan.md:13` | Six actual pilot VP slots; editorial plans only, no resource/media metadata or completed production. |
| `docs/superpowers/specs/2026-10-24-beginner-final-refinement.md:53` | MG01→MG02 tests consecutive progression; pilot does not complete MG-F0 or certify CEFR. |
| `docs/superpowers/specs/2026-10-24-beginner-curriculum-resources-design.md:72` | Theory/support, assessed evidence and resource viewing have distinct meanings. The older format1.1 proposal at section7 is superseded here by shipped1.2 code and the later implementation plan, without rewriting the old design. |
| `docs/superpowers/plans/2026-10-24-beginner-implementation.md:192` | R1.2b calls for eight genuine sources/audio,64 assessed activities,16 skill objectives/Unit, human review/rehearsal; draft composition is independent of software DB qualification. |
| `apps/api/src/learning-sessions/domain/beginner-session-planner.ts:10` | Actual planner requires exact supplied LessonVersion, format1.2,45 minutes,8 unique tasks,3R/3L/1S/1W and complete objective mappings; no first/latest selection. |
| `packages/content-format/src/foundation-metadata.ts:39` | Parser validates required objectives/evidence but permits1–50 objectives, so four single-skill objectives/Lesson is an explicit editorial constraint, not an existing exact-count schema rule. |
| `apps/api/src/teacher-ai/domain/beginner-rubrics.ts:11` | Current speaking/writing rubric version1 weights .35/.25/.20/.20; technical defaults are not human pedagogical calibration. |
| `apps/api/src/learning-sessions/domain/learner-activity-projection.ts:4` | Existing projection hides Beginner answer/model/rubric/transcript data; content can still leak answers through visible wording and requires semantic review. |
| `apps/api/src/content-authoring/application/content-publisher.service.ts:173` | Runtime requires actual selected audio artifacts; text scripts alone cannot establish audio readiness. No runtime call is authorized here. |

Counts confirmed against actual plan/planner:8 Lessons ×8 activities=64;4 objectives/Lesson ×4 Lessons=16/Unit,32 total. Plan targets remain45 minutes (3×15); neither activity count nor planned minutes proves learning time. The older35–50 active-minute range remains proposed, not an approved human timing criterion.

## Proposed scope and material decisions

The [bounded authoring plan](../../docs/superpowers/plans/2026-10-27-beginner-r12b-content-authoring.md) reuses the canonical R1.2b plan. Proposed future allowlist: eight lesson texts, the requested qualification report and two test-only checker files. No existing product files change; checker adapts existing pure parser/snapshot/planner/rubric/projection functions. Source hashes, exact allowlist and baseline are in the companion scope JSON.

Content quality: author MG01-L1 and verify it first; only then compose seven other distinct lessons, with no cloned assessed tasks or synthetic pilot replacement. Four single-skill objectives per lesson produce32 objectives total. Every listening activity needs its own complete script/reference (24 bindings); physical audio and review remain separate.

Lexical issue: Knowledge Map core MG02 candidates (`a pen`, `a book`, `a bag`, `this`, `that`) do not supply a vowel-initial noun for `an`. Minimal supporting example `an eraser` is proposed for teacher/owner confirmation, not approved by this review. Other supporting forms/names must remain within the mapped task and be listed/provenanced; no new grammar/Unit or silently assumed vocabulary-master IDs. The /ɪz/ video slot is broader than the pen/book/bag examples; its existence does not authorize additional assessed vocabulary. No existing master vocabulary data was queried or asserted available.

Editorial default proposed: VI instruction + EN tasks, AmE narration/IPA consistency later, with names and number reading reviewed. Dialect/provider/rights/reviewer are not claimed selected or approved. No voice/model call, audio byte creation, media attachment or backup/DB operation is included in this execution request.

## Gates and honest initial status

No pilot source file exists at task entry: authored0/8, assessed activities0/64, required objectives0/32, verified real audio0, parser/planner over real pilot sources NOT_RUN, teacher review NOT_RUN, rehearsal TIMING_NOT_VERIFIED, content NOT_READY. These are actual initial counts, not a planned-content completion score.

Offline authoring can proceed after matching approval while R1.2a remains implementing. Full R1.2b acceptance still needs real reviewed audio, an appointed human pedagogical reviewer, actual timed rehearsal and approved timing criteria. Existing R1.2a software approval and synthetic media do not satisfy those gates. Live preview/import/publication, any storage writes, real providers, curriculum/enrollment/release changes remain unauthorized.

The qualification report will have eight rows distinguishing source status/hash, audio, parser/planner, skill/objective evidence, reviewer, rehearsal, blockers and readiness. Report-only NEEDS_AUDIO/TIMING_NOT_VERIFIED labels do not add enums or bypass runtime AUDIO_NOT_READY. No claim CONTENT_READY or mandate verified is allowed merely because text/offline checks pass. Parent and other mandates retain their actual state.

## Verification and rollback

Current task checks: targeted source/document reconciliation, mandate dedupe/status, planned path existence, document links, SHA-256/baseline/allowlist fingerprints and CLI validate. No lesson/parser/provider/DB/E2E execution is claimed in this preapproval task. Future targeted commands and negative tests are in the addendum; no full app build is needed for pure content/test-helper changes.

Rollback is only unpublished new source/checker/report changes, with explicit file staging/local commits after approved execution. Preserve evidence and any independently referenced versions; never reset DB, delete learner data, change existing content or bypass runtime gates. P0: none observed in this read-only/preapproval task. P1 readiness: audio/human review/timing/publication qualification absent. P2 editorial decisions: approved supplemental lexical examples and narration variety; human reviewer may require re-authoring rather than padding time.

This capture asks only for text/offline authoring rights. It cannot authorize a new main-DB execute, publication, real media/provider work, R2/R3/R4, merge, push or deploy. Stop after capture/triage/validation and present the actual CLI proposal hash for human approval.
