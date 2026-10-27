# Beginner MG01 → MG02 — offline content review

Mandate MND-20261027-001. **Editorial drafts only; NOT_READY.** R1.2a and main-DB qualification retain their independent implementing states. No source has been imported/published, no media produced, and no learner state created.

## Current authoring milestone

OFFLINE_AUTHORING_COMPLETE (technical/editorial milestone only):8 authored sources,64 assessed activities,32 required single-skill objectives and24 listening scripts. All8 parser/planner/objective/rubric/redaction/binding checks PASS. No real audio, human review or timed rehearsal exists; every Lesson remains NOT_READY. No claim of full R1.2b completion.

| Lesson | Source status | Audio | Parser/planner | Skill evidence | Human reviewer | Rehearsal | Blockers | Content readiness |
|---|---|---|---|---|---|---|---|---|
| MG01-L1 | AUTHORED_DRAFT | NEEDS_AUDIO | PASS/PASS | 3R/3L/1S/1W;4 objectives | Not appointed | TIMING_NOT_VERIFIED | Audio, pedagogy/rubric review, timing | NOT_READY |
| MG01-L2 | AUTHORED_DRAFT | NEEDS_AUDIO | PASS/PASS | 3R/3L/1S/1W;4 objectives | Not appointed | TIMING_NOT_VERIFIED | Audio, pedagogy/rubric review, timing | NOT_READY |
| MG01-L3 | AUTHORED_DRAFT | NEEDS_AUDIO | PASS/PASS | 3R/3L/1S/1W;4 objectives | Not appointed | TIMING_NOT_VERIFIED | Audio, pedagogy/rubric review, timing | NOT_READY |
| MG01-L4 | AUTHORED_DRAFT | NEEDS_AUDIO | PASS/PASS | 3R/3L/1S/1W;4 objectives | Not appointed | TIMING_NOT_VERIFIED | Audio, pedagogy/rubric review, timing | NOT_READY |
| MG02-L1 | AUTHORED_DRAFT | NEEDS_AUDIO | PASS/PASS | 3R/3L/1S/1W;4 objectives | Not appointed | TIMING_NOT_VERIFIED | Audio, pedagogy/rubric review, timing | NOT_READY |
| MG02-L2 | AUTHORED_DRAFT | NEEDS_AUDIO | PASS/PASS | 3R/3L/1S/1W;4 objectives | Not appointed | TIMING_NOT_VERIFIED | Audio, pedagogy/rubric review, timing | NOT_READY |
| MG02-L3 | AUTHORED_DRAFT | NEEDS_AUDIO | PASS/PASS | 3R/3L/1S/1W;4 objectives | Not appointed | TIMING_NOT_VERIFIED | Audio, pedagogy/rubric review, timing | NOT_READY |
| MG02-L4 | AUTHORED_DRAFT | NEEDS_AUDIO | PASS/PASS | 3R/3L/1S/1W;4 objectives | Not appointed | TIMING_NOT_VERIFIED | Audio, pedagogy/rubric review, timing | NOT_READY |

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

Source hashes below are computed from actual UTF-8 source bytes. Draft snapshot UUIDs exist only ephemerally inside the existing pure builder; none is a DB/publication/media identity.

R1.2b remains implementing until the full audio/human/timing acceptance is met. Offline source completion is a separate milestone. No CONTENT_READY, AUDIO_READY, HUMAN_REVIEW_PASSED or TIMING_VERIFIED claim is made here.

## Source hashes and objective/evidence matrix

Each source is an AI-authored editorial draft; definitions/examples are original proposals for human review. WordBank definitions and format scaffolding are intentionally reused within a Unit, while the64 assessed sections have no identical content after editorial prefixes are removed. Source creation used a serialization helper in memory only, not a cloned synthetic Lesson.

| Lesson | SHA-256 of source | Objective/evidence mapping | Listening script slugs |
|---|---|---|---|
| MG01-L1 | `50fe09a9ba420f19da722e234879a53a6f7a1daddba7074c625cbed6fb137f6f` | `mg01-l1-reading`→r1–r3; `mg01-l1-listening`→l1–l3; `mg01-l1-speaking`→s1; `mg01-l1-writing`→w1 | `mg01-l1-audio-a`, `mg01-l1-audio-b`, `mg01-l1-audio-c` |
| MG01-L2 | `10a82f462767763ea21cc00367abeaf2618fd9c14572ef69a81de2e8192aeb03` | `mg01-l2-reading`→r1–r3; `mg01-l2-listening`→l1–l3; `mg01-l2-speaking`→s1; `mg01-l2-writing`→w1 | `mg01-l2-audio-1`, `mg01-l2-audio-2`, `mg01-l2-audio-3` |
| MG01-L3 | `8d75431a4e0ac7b4b87fd75c95eb12047bda300d88c51f124ca3f5c5be73a53d` | `mg01-l3-reading`→r1–r3; `mg01-l3-listening`→l1–l3; `mg01-l3-speaking`→s1; `mg01-l3-writing`→w1 | `mg01-l3-audio-1`, `mg01-l3-audio-2`, `mg01-l3-audio-3` |
| MG01-L4 | `b7ab961bf26cea11c17d90ecbd16e30233e14d8534584fb4a9e8e4b7872dbcd7` | `mg01-l4-reading`→r1–r3; `mg01-l4-listening`→l1–l3; `mg01-l4-speaking`→s1; `mg01-l4-writing`→w1 | `mg01-l4-audio-1`, `mg01-l4-audio-2`, `mg01-l4-audio-3` |
| MG02-L1 | `4293759622c0208e30336d6b8153486eeeb88d46a4ed559b7de30ff6006be2a9` | `mg02-l1-reading`→r1–r3; `mg02-l1-listening`→l1–l3; `mg02-l1-speaking`→s1; `mg02-l1-writing`→w1 | `mg02-l1-audio-1`, `mg02-l1-audio-2`, `mg02-l1-audio-3` |
| MG02-L2 | `b299ede7b4cfe14ba081083e0c4200857174e3b7ec38c08be3eaf8278d2466f6` | `mg02-l2-reading`→r1–r3; `mg02-l2-listening`→l1–l3; `mg02-l2-speaking`→s1; `mg02-l2-writing`→w1 | `mg02-l2-audio-1`, `mg02-l2-audio-2`, `mg02-l2-audio-3` |
| MG02-L3 | `8b3f74651cfbbe94871bb6c987bb0f2ad6ccabe42310fcbafdce9749c77c6ed8` | `mg02-l3-reading`→r1–r3; `mg02-l3-listening`→l1–l3; `mg02-l3-speaking`→s1; `mg02-l3-writing`→w1 | `mg02-l3-audio-1`, `mg02-l3-audio-2`, `mg02-l3-audio-3` |
| MG02-L4 | `2e1b3bd528e3433bf7849600dd628e942ab58bf1159ad1d9acc7d7896350e0c7` | `mg02-l4-reading`→r1–r3; `mg02-l4-listening`→l1–l3; `mg02-l4-speaking`→s1; `mg02-l4-writing`→w1 | `mg02-l4-audio-1`, `mg02-l4-audio-2`, `mg02-l4-audio-3` |

The activity suffixes in the matrix are shorthand for full slugs with the same Lesson prefix. Every R/L task contains exact source/script line evidence; compound facts cite all needed lines. S/W evidence is the authored response activity itself under the single matching skill objective, not a fabricated attempt. All16 objectives in each Unit remain required; L4 alone cannot replace L1–L3.

## Editorial self-review, progression and proposed support

Human pedagogical review remains NOT_RUN. The following notes are author self-checks, not teacher approval or a calibrated achievement standard.

| Lesson | Progression / authored distinction | Extra support explicitly proposed, teacher review required |
|---|---|---|
| MG01-L1 | Framed name/origin and I/you distinction; greeting, writer identity and addressed person differ across R/L; separate Mai/An response cards | am/are forms and fixed greeting/name/origin task language; fictional names/places and English question/role-card vocabulary, not new assessed grammar |
| MG01-L2 | Recognize letter order; distinguish Kim/Tim roles; speaking Emma with first-syllable prominence and E-M-M-A, writing Mia/M-I-A | Letter names A/E/J/M/O and B/I/N as needed by spelling tasks; Names/Letters/Place/Partner labels; names/places remain fictional task data |
| MG01-L3 | Integrate two cards, I/you place contrast and a response to another person; remove sentence frame | Fixed receptive prompts (writer/reader/meeting/reply/confirm), not instruction to produce new wh/tense structures |
| MG01-L4 | New meeting point and role; independent production; no new target grammar | Fixed task-context labels and all fictional names/places; Unit completion/admission are not inferred |
| MG02-L1 | Establish a/an, near/far this/that and singular/plural request contrast | `eraser/an eraser` is an explicit proposed extra noun to realize an; please, one/two/three, is, and; Near/Far/Item/Quantity/Request labels are supporting vocabulary needing review |
| MG02-L2 | Meaningful /s/ books and /z/ pens/bags contrasts, not meaningless replay; three-item requests | Same proposed quantity/politeness support; one pen may substitute for a pen. No extra /ɪz/ noun added to imitate the future video plan |
| MG02-L3 | Match complete multi-item set, discriminate pointing from requesting and interpret NOT requested | Receptive task language such as set/list/note/NOT/request, reviewed for cognitive load; no new target tense/grammar |
| MG02-L4 | New counter/list and independent response with changed items/quantities | Same proposed support only; no implicit new vocabulary mastery or stage transition |

All names and place names throughout the sources are illustrative, not personal records. Their spellings/pronunciations must be confirmed before audio production. The current IPA hints are editorial AmE proposals. Correctness/naturalness and the difficulty of English question prompts, role labels and negative questions require teacher review; they are not certified by a syntax checker.

### Private editorial answer key (not learner content)

Automatically extracted source key, followed by author comparison to each source/script; it is not a human-approved test bank.

| Lesson | R1/R2/R3 | L1/L2/L3 | S/W check focus |
|---|---|---|---|
| MG01-L1 | A/B/C | A/B/C | Distinct card facts; sample meets authored min_words; rubric v1, no native-accent requirement |
| MG01-L2 | B/A/C | B/A/C | Distinct card facts; sample meets authored min_words; rubric v1, no native-accent requirement |
| MG01-L3 | B/A/C | B/A/C | Distinct card facts; sample meets authored min_words; rubric v1, no native-accent requirement |
| MG01-L4 | B/A/C | B/A/C | Distinct card facts; sample meets authored min_words; rubric v1, no native-accent requirement |
| MG02-L1 | B/C/A | B/C/A | Distinct card facts; sample meets authored min_words; rubric v1, no native-accent requirement |
| MG02-L2 | C/A/B | C/A/B | Distinct card facts; sample meets authored min_words; rubric v1, no native-accent requirement |
| MG02-L3 | B/A/C | A/B/C | Distinct card facts; sample meets authored min_words; rubric v1, no native-accent requirement |
| MG02-L4 | A/B/C | B/A/C | Distinct card facts; sample meets authored min_words; rubric v1, no native-accent requirement |

Speaking/writing rubric resolution uses the existing `beginner-guided-speaking@1` and `beginner-short-writing@1` (weights .35/.25/.20/.20); these weights remain technical defaults pending human calibration. No new rubric version is created. The current rubric code SHA-256 is `2424159119b5e779a614dfec48106164ccfc9627ed0940d08c507d37697b126c`.

Potential duration risk: short beginner messages and8 assessed activities may take much less than45 active minutes for some learners. No assertion that these drafts already satisfy a human duration target is made. Observe first; re-author genuinely useful learning if needed rather than impose waits, extra questions or mandatory replays.
