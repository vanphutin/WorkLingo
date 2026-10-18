# Intermediate B1 pilot content and grouped authoring — proposed design

Date: 2026-10-16 (Asia/Saigon)
Status: Bounded grouped-authoring design accepted by direct “ok,tiếp” on 2026-10-16; implementation technically verified in the worktree. User selected AI for content review. No content publication, learner reassignment or assessment-policy approval. See grouped-authoring execution report for checks and limitations.
Mandate: MND-20261015-001; existing [master plan, Task 4](../plans/2026-10-16-intermediate-learning-quality.md#task-4-w1w4--product-mapping-b1-content-and-authoring).
Draft content: [readable candidate lessons](../../content-drafts/2026-10-16-intermediate-b1-pilot.md), with [structured source](../../content-drafts/2026-10-16-intermediate-b1-pilot.json).
Review process: [rubric and evidence](../../../mandate/reports/2026-10-16-intermediate-b1-content-review.md).

## Intent and scope

Turn D-036's accepted additive B1 direction into a concrete, reviewable starting curriculum. Learners should explain a workplace change, identify its constraints and request a feasible next action. More items alone do not establish B1 or sufficient learning time.

This design prepares two original fictional lesson candidates, an objective/prerequisite map, a review rubric and a bounded authoring proposal. The user selected “AI” for content review during preparation. Codex is the AI-assisted draft author, AI content reviewer and technical coordinator; these are not independent human expert roles. A qualified human CEFR/content reviewer is unassigned. AI review and its revisions are recorded in the linked report, with provisional CEFR conclusions. Neither engineering/builder review nor AI review is represented as human expert certification or publication approval.

Goals: preserve the current Foundation journey; create independently sourced Reading and Listening facts within each lesson; include productive transfer into a third situation; make multiple MCQ items authorable without changing their runtime representation.

Non-goals: B2, a full curriculum, runtime question generation, automated CEFR certification, new session planner, changes to assessment/retry/mastery/admission, audio generation, public DB changes, publication or pilot activation. No installed dependency is needed for this document or the review pack.

## Evidence at the execution checkout

Repository base: efa2fd99b5373a644a011af3787bf81f737a51a7, with the documented W0/W3 uncommitted changes. These are static code observations on 2026-10-16, not a new live catalogue inventory.

| Observation | Source | Design implication |
| --- | --- | --- |
| Normalizer emits exactly one question for each authored comprehension activity | packages/content-format/src/normalizer.ts, normalizeLessonDocument | One authored activity cannot currently carry six questions |
| Snapshot already accepts nonempty question arrays and the learner projection maps the entire array | apps/api/src/curriculum/domain/curriculum.types.ts; learning-sessions/application/learning-sessions.service.ts | Grouped MCQ needs authoring work, not a second MCQ executor |
| Format 1.1 objective/rubric metadata is coupled to Foundation templates | packages/content-format/src/foundation-metadata.ts; docs/LESSON_FORMAT.md | Do not label B1 material as a Foundation template to obtain metadata |
| Speaking snapshot requires mode=shadowing | apps/api/src/curriculum/domain/curriculum.types.ts, activitySchema | The candidate spoken transfer tasks are not currently executable as intended |
| Publisher reconstructs snapshots and curriculum service compares stored activities to them | content-authoring/application/content-publisher.service.ts; curriculum/application/curriculum.service.ts | Preserve metadata explicitly; extending relational activity projections would create parity risks |
| Enrollment has one currentLevel per program; reactivating the same program returns existing context | learning-programs/application/program-context.service.ts | Adding a path does not create a path-switch feature |
| Placement obtains the Foundation placement mission and uses the existing recommendation policy | curriculum/application/curriculum.service.ts; onboarding/application/placement-recommendation.service.ts | New level ordering must not implicitly change admission |
| Planner selects one Reading and one Listening activity for 45/60 | learning-sessions/domain/session-planner.ts | Six single-question activities per skill would still select only one; grouping is justified |

The earlier imported audit is not independent proof of these details. W0's public database has a legacy schema; current-schema catalogue membership/eligibility is still unknown. No assumption about actual published B1 inventory is added here.

## W1 mapping and continuity

Recommended identifiers (Codex design calls, not existing records): path slug `workplace-b1-pilot`; level code `WORKPLACE_B1_PILOT_1`; target CEFR `B1`; program membership stays Intermediate's existing ID. Reserve no UUID until an authorized creation command. Do not infer classification from a code prefix alone.

Use explicit level CEFR and program/path membership checks when creating the future path. Taxonomy values should be the existing CEFR vocabulary, with the B1 pilot requiring exactly B1. A programme's marketing range is not a rule that makes every legacy child B1. Foundation remains legacy/bridge content under its existing records.

The first implementation proposed below changes **no catalogue or admission code**. Keep the new path absent from live data until content review and activation design are accepted. There is no hidden default, new program, enrolment migration, level rename, order insertion or script that can move learners.

Before a later activation, design and test:
1. Existing Intermediate enrolments keep the same currentLevel and revision; old sessions resume the same version.
2. A new entrant cannot land on B1 simply because it sorts first. Placement and opt-in admission need a reviewed evidence rule.
3. Current program activation cannot select a second path inside the same program. Do not add a UI path choice without a server transition design, session conflict policy and explicit user action.
4. Order/prerequisite changes cannot automatically promote Foundation learners into B1.
5. Any live creation uses an explicit list of new draft IDs and rollback that removes learner visibility without deleting published versions/history.

These are downstream acceptance gates, not a claim that current code already enforces new B1 admission.

## Content design and prerequisites

Candidate 1: `b1-handle-delivery-change`, “Handle a delayed delivery”.
Candidate 2: `b1-reschedule-team-arrangement`, “Reschedule a team arrangement”.

Both target a B1 learning need, not B1+ negotiation of contractual liability. They use familiar factual constraints with short reasons and confirmation requests. The reviewer may lower/raise the level, split an item or rewrite any text.

Each candidate has:
- Three lesson-local objectives: identify constraints (Reading/Listening), explain the change (Speaking/Writing), choose a feasible next action (all four).
- Three prerequisite capabilities: state dates/quantities, explain a simple reason, request confirmation. Slugs are proposed capabilities, **not verified existing objective IDs or evidence that Foundation completion meets them**.
- Five authored language blocks with unrelated examples.
- One email, one separate dialogue script, two new task cards.
- Six Reading MCQ and six Listening MCQ, with stable proposed item slugs, answer index, exact context line evidence, cognition and explanation of every distractor.
- One Activate writing prompt and two productive tasks, including private model responses and observable required meaning.

Lesson 2 reuses the communicative function in a different context. There is no automatic prerequisite that passing lesson 1 certifies readiness for lesson 2. Do not claim spaced retrieval unless the learner has relevant prior evidence; otherwise use an introduction and label first exposure. The pack's Activate prompts explicitly state this distinction.

The candidate cognitive tags are editorial judgments, not measured difficulty. AI review corrected five inflated inference labels: the MCQ bank now covers comprehension/application rather than claiming a broad inference/tone curriculum. Production tasks add proposed transfer. This is a narrow two-lesson learning pack, not complete B1 coverage. There is no mandated Bloom percentage. Item-level estimatedSeconds and difficulty are null; no W3 time configuration is inferred from word counts.

### CEFR basis and limits

The [Council of Europe Companion volume (2020)](https://rm.coe.int/common-european-framework-of-reference-for-languages-learning-teaching/16809ea0d4) provides relevant B1 scales: clear oral information in familiar work settings (printed p.48), professional correspondence (pp.54–55), simple reasons and next steps in cooperation (pp.76–77), and basic factual emails requesting action or confirmation (pp.82–84). These are paraphrased orientation points. They do not specify this pack's item count, word count, duration or pass threshold. Alignment here is Codex's proposal; a qualified reviewer must judge text, task demand, speech delivery and the evidence elicited.

The Council's [classroom guidance](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-in-the-classroom) supports connecting selected descriptors to objectives and assessment. This design uses that connection; it does not assert endorsement of WorkLingo.

### Cross-skill independence

Shared function and vocabulary are intentional. The email and dialogue use different organisations, people, constraints and decisions; a generic clock time or expression may recur without giving the other context's answer. The two transfer cards add fresh situations. AI review checked these authored facts and found no answer supplied by another channel's context. This limited text review does not establish runtime independent assessment or rule out all semantic cues.

Review the entire learner exposure sequence: vocabulary/examples, task instructions, feedback, cards and any prior activities. Different text hashes or entity lists cannot prove independence. The app currently exposes transcript/support in practice; this content design does **not** make any session an independent assessment. W2 still owns server disclosure and support evidence. Do not copy private models/answer entities into learner DTOs.

### Capacity and timing honesty

One logical lesson design has five activities: Activate writing, grouped Reading, grouped Listening, Respond speaking, Respond writing. Twelve MCQ plus three open prompts is fifteen response requests, not fifteen activities.

If the proposed groups could be represented with four-skill execution, the unchanged planner would have structural capacity for 45/60 only: 45 selects four activities / twelve MCQ / two open tasks; 60 selects five / twelve / three. 90/120/150 need additional distinct activities. This is a static implication of the canonical counts, **not an executed plan for this JSON**. The current speaking restriction prevents claiming any of these candidates playable today. Do not pad content or add duplicate activities to unlock durations.

All actual active times, audio durations, replay expectations, sufficiency estimates and 45/60 workload readiness remain unknown. Script-only audio is not a playable or quality-reviewed artifact.

## Authoring alternatives and recommendation

A. Keep 1.1 and create one activity per MCQ: smallest parser change, but requires an unrelated Foundation provenance tag and most questions would be dropped by v1 selection. Rejected for this pack.
B. Add grouped comprehension and general lesson metadata in Format 1.2; leave execution/scoring unchanged. **Recommended first engineering slice.**
C. Expand grouping, free speaking, planner, media and mastery together: broader coupling and unresolved policy. Defer into separately designed slices.

Slice B is useful and testable using existing shadowing-compatible fixtures. It must not turn the candidate transfer prompts into fake shadowing or mark the two candidates runtime-ready. Free speaking still needs its own approved contract/executor/evaluation design before these lessons can be imported in full.

## Proposed Format 1.2 contract — first engineering slice

This is a proposed new version. Do not paste it into the current Admin import expecting it to work.

Preserve 1.0/1.1 parser/normalizer outputs byte-for-byte at the semantic JSON level. No new metadata defaults or silent auto-upgrade. Bump the parser implementation version only when 1.2 is implemented; store source format separately as now.

1.2 uses existing LESSON, WORD_BANK, CONTENT and AUDIO_SCRIPT syntax. Do not permit FOUNDATION in 1.2. It declares 1–50 OBJECTIVE sections using 1.1's objective field syntax and validation; at least one required objective. The existing CONTENT type vocabulary email/dialogue stays unchanged. Task-card labels in the review JSON are editorial channels, not newly supported CONTENT types.

Each activity retains explicit block, type, skills, content_refs and language_block_refs. It requires objective_refs with unique existing lesson-local slugs. Every required objective skill must be represented by a real activity of that type. This is structural coverage, not mastery or curriculum-objective linkage.

For reading/listening, activity-level prompt introduces the group. Require 1–20 nested QUESTION sections; lesson maximum 200 items and existing source/options/activity bounds still apply. No legacy activity-level QUESTION:/OPTIONS:/ANSWER:/EXPLANATION:/EVIDENCE: allowed within a 1.2 comprehension activity. Reject mixed forms rather than discarding a question.

Example:
```text
FORMAT: WorkLingoLesson/1.2
...
[ACTIVITY harbor-reading]
learning_block: read_decode
activity_type: reading
response_type: multiple_choice
skills: reading
content_refs: harbor-email
language_block_refs: could-you-confirm
objective_refs: identify-constraints | choose-next-action
prompt: Read the supplier email and choose the best answer for each question.

[QUESTION delivery-condition]
objective_refs: choose-next-action
cognitive_level: application
answer_entities: reply 3 p.m. today
QUESTION: What must Lee do to get eight chairs on Monday?
OPTIONS:
A. Reply by 3 p.m. today to reserve truck space.
B. Pay an additional delivery charge today.
C. Confirm a full team meeting for Tuesday.
D. Wait for the collection company to call first.
ANSWER: A
EXPLANATION: A reply before the deadline is required to reserve truck space.
EVIDENCE: harbor-email:3
[/QUESTION]
[/ACTIVITY]
```

The example is an excerpt; complete fixtures need lesson, objectives, four skills and valid referenced content. QUESTION slug is required kebab-case, unique lesson-wide, author supplied and independent of array order. Do not generate q1/q2 from order for 1.2. Moving/reordering preserves slugs; changed published content creates a new LessonVersion. Runtime identity remains version + activity ID + item slug; no new UUID column, itemRefs or per-item planner is introduced.

Each QUESTION has exactly one nonblank QUESTION text, OPTIONS block (existing 2–10 option bound), ANSWER, EXPLANATION and at least one EVIDENCE. For new 1.2 questions, option labels are contiguous unique A…J in source order; answer must reference one. Legacy label parsing is unchanged. Evidence is an exact positive line number in the activity's bound reading content or its listening audio_ref script. Listening requires one explicit audio_ref as before. All duplicates, unknown fields, unknown refs, missing closures or out-of-parent QUESTION sections are blocking syntax/structural errors. No heuristic quality threshold becomes a new blocking rule.

Question objective_refs are optional; if absent inherit activity objective_refs. If present they are a nonempty unique subset of those refs. Optional cognitive_level is one of recall, comprehension, application, inference, transfer. Optional answer_entities is a | separated list of 1–20 unique nonblank phrases, each at most 200 characters. Absence stays unknown; no auto-inference. These are private editorial annotations, not trustworthy independence proof. Difficulty and estimated time remain out of this format slice.

Speaking/writing keep the existing supported response modes and payload semantics in this first slice. Require the same learner QUESTION text, private prompt/model and rubric as Format 1.1. No free speaking or explicit word-target syntax is added. Do not encode an unsupported productive task as an MCQ or a speaking mode that the runtime cannot interpret.

### AST, metadata and persistence

Add QuestionNode with its own SourceRange, slug, question, options, answer, explanation, evidence and optional objectiveRefs/cognitiveLevel/answerEntities. ActivityNode gains optional questions; the legacy scalar question/options members remain untouched for old versions. Node ranges and field/evidence error locations preserve original BOM/CRLF offsets and Vietnamese text. A malformed nested question must not swallow the next activity; errors use bounded existing ContentIssue codes or explicitly registered additive codes with item paths, never raw answer data in logs.

Keep NormalizedActivityQuestion and stored activity payload shape unchanged. Map new source slugs directly; legacy 1.0/1.1 still emit activity-q1. A new optional root `pedagogy` retains editorial annotations, rather than widening relational activities and breaking strict parity:
```typescript
type LessonPedagogyV1 = {
  version: 1;
  objectives: { slug: string; statement: string; skills: LearningSkill[]; required: boolean }[];
  activityObjectives: Record<string, string[]>;
  responseRubrics: Record<string, string>;
  itemMetadata: Record<string, {
    objectiveRefs: string[];
    cognitiveLevel?: 'recall' | 'comprehension' | 'application' | 'inference' | 'transfer';
    answerEntities?: string[];
  }>;
};
```
itemMetadata keys are the lesson-unique question slugs. Validate every activity/item/objective key against this lesson, enforce bounds and cover actual types; no orphan metadata. All metadata is author supplied. Source ranges stay in parsed AST/validation results, not immutable runtime payloads.

Publish/preview must preserve `pedagogy` explicitly in normalized draft and parsedContent. Reuse existing JSON storage; no Prisma migration. Update ContentPublisherService's whitelist and verify propagation of the NormalizedLessonDraft type imported by contracts, not just the parser. Keep current `foundation` unchanged for 1.1; a snapshot cannot claim both new and Foundation provenance in this proposal. Neither namespace alone changes learner scoring.

CurriculumService returns validated root metadata without adding metadata to version.activities. Its current deep equality of stored activities and snapshot activities must continue to pass. Re-read published versions, authoring preview, draft revision/sourceHash, idempotent publish and stale selected-audio tests are mandatory. No published legacy version gets backfilled.

Learner projections use existing explicit allowlists: question slug/prompt/options only; never cognitive tags, answers, explanations, entities, private rubrics or source ranges through the new metadata. Existing feedback behaviour remains W2 policy; this slice must not broaden disclosure.

### Boundaries and source file map

- packages/content-format/src/ast.ts, parser.ts, normalizer.ts, validator.ts, index.ts and focused specs: 1.2 parse/validate/normalize.
- New packages/content-format/src/lesson-pedagogy.ts + spec: reusable bounded metadata type/validation, avoiding a second Foundation template system.
- packages/contracts/src/content-authoring.contracts.ts + spec: normalized preview metadata is already imported as NormalizedLessonDraft from content-format; verify that propagation and any DTO serialization without inventing a second type.
- apps/api/src/curriculum/domain/curriculum.types.ts + spec: optional root pedagogy validation, legacy snapshot regression.
- apps/api/src/content-authoring/application/content-publisher.service.ts + spec and existing integration tests: immutable metadata/payload parity and allowlist coverage.
- apps/api/src/curriculum/application/curriculum.service.ts and learning-session DTO tests: readback and no new metadata leakage.
- Add a **synthetic supported shadowing** authoring fixture for engineering; do not silently convert the review pack's productive tasks into it.
- docs/LESSON_FORMAT.md: additive version reference after implementation.

No UI changes are needed for grouped MCQ: the current executor already accepts arrays. Verify that assumption with a component test containing several questions and independent selections. If it fails, route the concrete gap before expanding scope.

### Engineering acceptance after design approval

1. Run failing tests for two or more nested items, stable slug reorder, exact evidence, duplicate/unknown/mixed fields, closing recovery, bounds, BOM/CRLF and Vietnamese ranges.
2. Green parser/normalizer tests must retain full legacy fixtures without added fields; root optional metadata roundtrips and is not stripped by Zod.
3. In an isolated disposable current-schema DB, import and publish a synthetic supported fixture; re-read identical questions/metadata, keep activity parity, verify revisions/idempotency/stale audio. No public schema migration.
4. Learner DTO and browser renderer tests show all selected MCQ items and leak none of the new private metadata. Existing answer/retry policy remains unchanged.
5. Appropriate package/API/web checks plus required repository gates, one final independent code review and rollback evidence before integration.
6. Content pack remains unreviewed/not importable until its separate speaking, media and expert-review conditions are satisfied. Passing engineering checks does not complete Task 4 or the mandate.

No coding task is checked off here. Write the detailed execution plan only after this design is reviewed, reusing the master plan rather than creating a competing board.

## Content review and activation gates

Use rubric `worklingo-b1-pilot-review-v1-draft` in the linked report. The user explicitly chose AI for the review role; record Codex (AI), date, exact source hash, criterion/item decisions and limitations. This supersedes the earlier assumption that a human expert must be assigned for this preparation. No machine signature is presented as a human credential. AI review is the selected method; technical/media/release gates remain separate and do not silently become passed.

Review outcomes: needs revision / ready for supported practice review / candidate for independent assessment after W2 and media gates. No pass-percentage or automatic CEFR classification is defined. Agree anchors using actual text and sample responses before any learner use.

Audio is currently two scripts, zero approved recordings. Later listen to the exact artifact end-to-end, check speaker distinction, intelligibility, completeness and script match, record measured duration/provider/rights/cost. Do not commit to a voice/provider or estimate a paid budget from nothing.

Free spoken transfer is also unresolved: design a supported mode, task-specific evaluation criteria, learner model visibility/support handling, pending results and compatibility. This requires D5/D6 review where it changes evaluation/media. Manual reviewer discussion of the pack does not activate that mode.

Public activation additionally needs new-entry eligibility, curriculum mapping, content/audio review, technical implementation, permitted data scope and controlled-pilot decision D10. Default rollout remains absent/inactive. No change to score/mastery, hard publish policy or telemetry is included.

## Calls made and decisions remaining

Codex recommends two factual workplace lessons; 6+6 grouped items; no B2; separate general pedagogy metadata; a bounded Format 1.2 comprehension slice; no catalogue/admission mutation; unsupported transfer exercises stay in the review pack. These are proposed choices for design review, not decisions attributed to the user.

The user chose AI for the review role (D2 preparation). Codex completed a transparent AI review; no qualified human sign-off is invented, and no new mandatory human-review assignment is imposed. Provider, admission, free speaking/evaluation and pilot decisions stay at their dependent phases. Choosing the reviewer does not itself publish content or resolve those implementation gates.

The human accepted the bounded authoring slice without authorizing content publication; its exact scope/rollback was recorded through the mandate CLI before code changes. W0/W3 evidence is preserved and other gates remain effective. See the grouped-authoring execution plan/report for the completed engineering slice.
