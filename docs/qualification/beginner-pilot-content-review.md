# Beginner MG01 → MG02 — offline content review

Mandate MND-20261027-001. **Editorial drafts only; NOT_READY.** R1.2a and main-DB qualification retain their independent implementing states. No source has been imported/published, no media produced, and no learner state created.

## Current authoring milestone

MG01-L1 is the first technically qualified real source:8 assessed activities,4 single-skill objectives,3 listening scripts. Seven sources are not authored yet at this checkpoint. Checker unit tests8 PASS/0 FAIL/0 skipped. The complete pilot remains incomplete until all8 are written and checked; these initial statuses will be replaced by actual final evidence.

| Lesson | Source status | Audio | Parser/planner | Skill evidence | Human reviewer | Rehearsal | Blockers | Content readiness |
|---|---|---|---|---|---|---|---|---|
| MG01-L1 | AUTHORED_DRAFT | NEEDS_AUDIO | PASS/PASS | 3R/3L/1S/1W;4 objectives | Not appointed | TIMING_NOT_VERIFIED | Audio, pedagogy/rubric review, timing | NOT_READY |
| MG01-L2 | NOT_AUTHORED | NEEDS_AUDIO | NOT_RUN/NOT_RUN | NOT_RUN | Not appointed | TIMING_NOT_VERIFIED | Authoring + human/media gates | NOT_READY |
| MG01-L3 | NOT_AUTHORED | NEEDS_AUDIO | NOT_RUN/NOT_RUN | NOT_RUN | Not appointed | TIMING_NOT_VERIFIED | Authoring + human/media gates | NOT_READY |
| MG01-L4 | NOT_AUTHORED | NEEDS_AUDIO | NOT_RUN/NOT_RUN | NOT_RUN | Not appointed | TIMING_NOT_VERIFIED | Authoring + human/media gates | NOT_READY |
| MG02-L1 | NOT_AUTHORED | NEEDS_AUDIO | NOT_RUN/NOT_RUN | NOT_RUN | Not appointed | TIMING_NOT_VERIFIED | Authoring + human/media gates | NOT_READY |
| MG02-L2 | NOT_AUTHORED | NEEDS_AUDIO | NOT_RUN/NOT_RUN | NOT_RUN | Not appointed | TIMING_NOT_VERIFIED | Authoring + human/media gates | NOT_READY |
| MG02-L3 | NOT_AUTHORED | NEEDS_AUDIO | NOT_RUN/NOT_RUN | NOT_RUN | Not appointed | TIMING_NOT_VERIFIED | Authoring + human/media gates | NOT_READY |
| MG02-L4 | NOT_AUTHORED | NEEDS_AUDIO | NOT_RUN/NOT_RUN | NOT_RUN | Not appointed | TIMING_NOT_VERIFIED | Authoring + human/media gates | NOT_READY |

## Authority, sources and editorial provenance

The [authoring plan](../superpowers/plans/2026-10-27-beginner-r12b-content-authoring.md) binds the [Knowledge Map](../superpowers/specs/2026-10-24-beginner-knowledge-map.md), final refinement and original Video Production Plan. Original wording, examples, tasks, definitions and proposed IPA are authored by Codex for teacher review; they are not copied from a synthetic fixture or certified as teacher-approved. No vocabulary-master DB was read and no approved source/sense ID is invented. No learner data or real contact details occur in the fictional cards.

MG01 core candidates: hello/name/I/you/from; am/are and I am/from patterns realize the mapped grammar. Fictional names and places are task data, not additional grammar. Full forms and I'm are alternatives of the same target. Fixed English question/task vocabulary (e.g. who, where, speaker, partner, reply, role card, write, introduce, confirm) is receptive assessment guidance supported by VI explanations; it is not silently added as an assessed new grammar inventory. Teacher must assess this language load.

Any new lexical support outside the listed core, including MG02 `an eraser`, politeness `please`, quantity words and supporting function forms, must be marked proposed/teacher-review-required in the final per-Lesson inventory. No such extension is presented as an already approved vocabulary-master entry.

## Assessment and answer isolation

Every Lesson has exactly four required single-skill objective slugs `mgXX-lY-reading/listening/speaking/writing`. Activities `r1/r2/r3`, `l1/l2/l3`, `s1`, `w1` reference the matching objective and actual Language Blocks. R/L have source/script line evidence; S/W map the actual authored task to the exact version1 rubric. No objective is satisfied by video viewing or by a repeated model answer.

Theory and unscored self-practice are phase INSTRUCTION fields. Assessed ACTIVITY fields contain the tasks. Speaking guided_response follows practice/shadowing, rather than counting shadowing as the independent assessed response. Learner projection hides model answers, rubric metadata/text, answer keys/explanations and listening content/transcript. Checker also rejects full private scripts/models copied into visible instructions across phases. Partial or paraphrased leakage, ambiguous distractors and semantic correctness still require teacher review; structural PASS does not prove them.

MG01-L1 internal answer review: r1 identifies Anna from card-a:2; r2 Da Nang from card-b:3; r3 responds as Kim from card-c:3. Listening: Linh, Hue, Sam are justified by their own scripts:1, not by prior reading data. Speaking uses Mai/Da Nang/Leo, writing uses An/Hue; private samples match those distinct cards. No observed answer contradiction in this editorial self-check; **human review NOT_RUN**.

## Audio, video and timing gates

Physical audio verified:0. Scripts are complete text for future narration, not audio files. No audio keys/artifact IDs/rights approval/checksums or voice-provider calls exist. NEEDS_AUDIO is an editorial status; runtime AUDIO_NOT_READY remains binding. Proposed AmE IPA/narration convention and natural pace are unapproved editorial defaults pending teacher/owner review; Vietnamese and other proper names require reliable pronunciation confirmation, not guessed native-like scoring.

Six optional slots remain unchanged and PLANNED/NOT_STARTED: VP-MG01-G (L1,L3), VP-P-ALPHABET (MG01-L2), VP-MG01-X (MG01-L3), VP-MG02-G (L1,L3), VP-P-ENDINGS-S (MG02-L2; shared future CB01-L2), VP-MG02-X (MG02-L3). No Resource/Version ID, duration, hash, binding or completion is created. All primary learning content must remain usable without video once real audio is available.

45 minutes is the exact planner contract, not a measured duration. No participant/reviewer has performed a rehearsal; TIMING_NOT_VERIFIED. No waiting, required replay or extra questions may be added to fabricate45 minutes. The older35–50 active-minute proposal is not an approved acceptance range.

Human rehearsal dossier to complete only on actual observation: participant pseudonymous code=null; reviewer/observer=null; date=null; source/rubric/audio versions verified at rehearsal=null; readDecode/listenReason/respond active and total observed durations=null; assistance/replay decisions=null; findings/verdict=null. Record these separately per Lesson with actual audio before teacher timing sign-off. No live Admin/API/enrollment/attempt operation is authorized by this offline scope.

## Technical commands and limitations

Pure checker: `pnpm --filter @worklingo/api exec tsx --test test/beginner-pilot/qualify-content.test.ts`; single-source check: `pnpm --filter @worklingo/api exec tsx test/beginner-pilot/qualify-content.ts --lesson mg01-l1`; final corpus check uses `--all` after all8 exist. Existing format baseline25 PASS; exact-version planner/projection/rubric baseline11 PASS. No DB/provider/runtime assertion is claimed.

Initial MG01-L1 SHA-256 (UTF-8 source): `50fe09a9ba420f19da722e234879a53a6f7a1daddba7074c625cbed6fb137f6f`. Hashes will be recomputed after any edits. Draft snapshot UUIDs exist only ephemerally inside the existing pure builder; they are never written as DB/publication/media identities or reported as a release.

R1.2b remains implementing until the full audio/human/timing acceptance is met. Offline source completion is a separate milestone. No CONTENT_READY, AUDIO_READY, HUMAN_REVIEW_PASSED or TIMING_VERIFIED claim is made here.
