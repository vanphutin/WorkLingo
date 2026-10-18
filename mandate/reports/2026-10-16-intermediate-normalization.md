# Intermediate report normalization and planning record

Date: 2026-10-16, Asia/Saigon. Trigger: human selection of option 2, normalize the supplied consolidated report into mandate and execution planning.

## Scope and baseline

- Checkout: `D:/Projects/WorkLingo`; branch `main`; HEAD `efa2fd99b5373a644a011af3787bf81f737a51a7`.
- Initial dirty state: modified `mandate/INDEX.md`; untracked existing `MND-20261015-001` item and `mandate/reports/2026-10-15-intermediate-workload-proposal.json`. No application changes were present in the initial short status.
- Node `v20.20.1`, pnpm `10.34.1`. Initial `mandate.mjs validate`: valid, 2 records. No app tests or DB inventory run as part of normalization.
- Budget: documentation/mandate and targeted static file inspection for valid plan paths/evidence; no full repository audit, live DB queries, provider calls, schema operations, content publication or product implementation.
- Authorization: the human replied `2` to the offered “Chuẩn hóa báo cáo thành mandate và kế hoạch thực hiện”. Scope is documentation/register, not any implementation approval.

## Preserved inputs

- [Full source](2026-10-16-intermediate-consolidated-source.txt): byte-for-byte copy of the attached `Pasted text.txt`; SHA-256 `948B401476946D316A17F9818D0865294962E72C17E83948D2CC7D817C2E9C34`.
- [Prior capture](2026-10-16-intermediate-prior-capture.md): item as found before normalization; SHA-256 `3752104111A32C5A2E3C806F3F2A7A45253DDDE29B10D0FA1E6714E05A3235F6`.
- Existing `2026-10-15-intermediate-workload-proposal.json` remains unchanged as original intake history. Its overstatements are superseded by this report and the new item revision.

S1–S4 original audit files were not independently attached here. Their findings are imported claims, not four reproduced observations. Source proposal IDs are report identifiers, not separately created issues/mandates. Retain all source content; use one umbrella mandate to avoid duplicating the existing scope.

## Verified static observations and limitations

| Reference | Observation actually checked | Limit |
| --- | --- | --- |
| `apps/api/src/learning-sessions/domain/session-planner.ts:188` | Selection uses canonical block occurrences; Respond keeps at least two activities; `splice(selectedActivityCount)` truncates candidates for that plan | No proof of actual study time; no deletion from lesson |
| `packages/contracts/src/learning-session.contracts.ts:30` | Block contract fixes targetMinutes=15 and immutable reference IDs | Planning label, not measured learning |
| `apps/api/src/learning-sessions/application/learning-sessions.service.ts:187` | Owned/planned activity projection includes referenced content; comprehension question projection omits answerIndex/explanation | Static path, not full DTO leakage test |
| `apps/web/src/features/learning-session/activity-renderers/listening-activity.tsx:57` | Transcript derives from content text, feeds player and is rendered before submit | Existing browser speech consumes text; hiding UI alone is insufficient |
| `apps/api/src/learning-sessions/application/learning-sessions.service.ts:544` | Incorrect comprehension feedback includes explanations; advancement requires perfect score | Does not establish all mastery/checkpoints pass |
| `packages/content-format/src/normalizer.ts:180` | Authoring normalizer constructs a single-question array | Runtime curriculum schema already allows multiple questions |
| `apps/api/src/learning-sessions/domain/session-planner.spec.ts:39` | Current expanded-fixture assertion expects 45/60/90/120/150 | Assertion read only; no test/endpoint execution here |
| `packages/test-fixtures/src/foundation-mission.fixture.ts:4` | Foundation fixture identifies FOUNDATION_1 / Pre-A1 | No conclusion about Admin-authored published DB inventory |
| `apps/api/src/learning-programs/domain/program-catalog.ts:23` | Intermediate catalog label mentions B1–B2 | Does not validate lesson CEFR |
| `apps/api/prisma/schema.prisma:635` | ActivityAttempt has rawResponse/normalizedResponse JSON, no generic metadata field | Evidence envelope/migration requires design review |
| `apps/api/src/admin-curriculum/application/admin-curriculum-query.service.ts:130` | Admin mission playability uses structural duration availability | Workload quality is a distinct proposed projection |

These references are for planning accuracy, not a new security/learning-effectiveness audit. Local evidence validation checks file/line existence, not semantic truth; observations above were manually read.

## Corrections to the old capture

1. Remove the unconditional “1 activity”/`splice(1)` claim; describe occurrence-based selection precisely.
2. Remove “5-question session” as universal. The imported fixture result was 5 activities / 5 MCQ / 3 open tasks, while current code/fixture may differ. Baseline must recount.
3. Remove “learners finish in 3–7 minutes” as observed evidence. No active-time telemetry/cohort measurement was supplied.
4. Lower overall confidence high→medium and effort m→l for the multi-subsystem proposal; static symptoms are stronger than pedagogy/live-data inference. Keep P1 umbrella, not blanket P0: source P0 rows are sequencing labels pending severity verification under governance.
5. Avoid claiming hidden transcript alone protects assessment. Cover API, alternate fields, browser TTS, accessibility and feedback/retry.
6. Make program mapping, mastery weights, provider/cost, telemetry, enforcement and rollout explicit human gates rather than tacit implementation decisions.

## Deduplication and canonical integration

`mandate.mjs find --query "intermediate workload listening mastery"` matched MND-20261015-001. Active/archive search and the existing roadmap/plans were checked; there is one direct overlap candidate. MND-20261014-001 concerns duplicate architecture decision IDs and remains untouched. Reuse/update MND-20261015-001 with the CLI; retain its ID and history. Do not create separate records just for every source bullet or X contradiction.

Reuse roadmap Increment 5, 5B Admin curriculum and 5D qualification boundaries. Existing system-audit-fixes plan contains completed job/environment fixes, not approval for this new feature scope. The new master plan is a refinement attachment to Increment 5, not a new sprint board, capacity allocation or delivery commitment.

## Treatment of all source contradictions

| Source | Disposition |
| --- | --- |
| X01 | Separate activities, MCQ and open prompts; recount W0 |
| X02 | All session-time claims remain unmeasured hypotheses |
| X03 | Word/semantic overlap needs revision-specific measurement; no accepted 80% baseline |
| X04 | Program label does not establish B1 content; D1 |
| X05–X07 | Item quotas, net time and cognitive percentages are priors only; D2/D3 |
| X08 | Shared objective/topic allowed; answer leakage tested W4 |
| X09–X11 | API-safe mode/media policy plus fair accessibility; playback is not comprehension; D4/D6 |
| X12–X13 | Distinguish assistance/first attempt; mastery/STABLE thresholds remain D5 |
| X14 | Warning-first; escalation D8, no legacy mass block |
| X15 | Optional versioned contracts preserve legacy parsing |
| X16 | Order by dependency/risk; retain all source P0/P1/P2 rows, not automatic severity acceptance |
| X17 | JSON evidence versus migration is D7 |
| X18 | Expanded-fixture test expects all durations; actual execution/endpoint reconciliation remains W0 |
| X19 | Separate seed/fake from real published audio; provenance/QA W0/W6 |
| X20 | Existing MND-20261015-001 confirmed in this dirty checkout; reuse |
| X21 | No sample threshold, cohort size or time range is a validated product KPI |
| X22 | Contract-correct code can still have a learning-design gap; verify before coding |

H01–H17 retain imported status except the bounded static observations above. C/P/F/L/M/A/O/G groups and all 21 prioritized backlog rows map in the master plan. Hypotheses such as IRT benefit, semantic thresholds, estimated B1 budgets and sample-size sufficiency remain discovery/pilot work, not separate evidenced mandates.

## Decisions and handoff

The design's D1–D10 map the source's ten open business questions into policy/content/data/release gates. Owner is unknown and is not fabricated. No lifecycle triage requiring a named owner, approval, implementing or verified transition is performed. Updated item remains captured, approval null, verification empty; document checks do not verify product implementation.

Deliverables: consolidated draft design, master dependency/traceability plan, W0/W3 baseline/workload plan and W2 integrity plan. W4–W8 are gated phase briefs, requiring their own accepted subsystem designs and detailed plans. Proposed task interface names are design choices, not claims about existing code. This distinction prevents future executors from treating an unfinished policy as a ready coding task.

## Planning verification

Product tests, DB inventory, live audio validation, CEFR review and pilot statistics were not performed and are not claimed passing.

Independent builder check found one material dependency: earlier Reading exposure can invalidate a later independent Listening task despite sanitized DTOs. The design and integrity plan now require reviewed session-wide separation before independent activation and durable support/disclosure evidence, with Reading-first, paraphrase and resume/replay regression cases. This is a recommendation within D4, not a silently approved product policy. No other material questions were reported beyond the explicit decision gates.

Final planning checks on 2026-10-16:

- `node .agents/skills/mandate-steward/scripts/mandate.mjs validate`: exit 0, valid=true, count=2; same existing mandate ID, captured, approval/owner/sprint null and implementation verification empty.
- One-off Node document checker: exit 0; all 91 distinct C/P/F/L/M/A/O/G source IDs and all 21 P0/P1/P2 backlog rows covered, 16 local Markdown links resolve, all 3 plan headers present, no completed implementation checkbox or non-document file change.
- Preserved source and prior-item SHA-256 values match the recorded originals. The earlier proposal JSON remains untouched.
- `git diff --check`: exit 0. Git reports its configured LF→CRLF conversion notice for INDEX; no whitespace error was reported.
- Independent builder recheck confirmed the Reading-first issue closed and no material planning question beyond explicit human gates. The reviewer made no writes and ran no app/DB tests.

The register's generated INDEX retains both existing records. Changes remain uncommitted; no branch, commit, push, app behavior, DB state, provider configuration or release status was changed by this task.
