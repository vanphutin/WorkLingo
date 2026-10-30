# Browser/cost successor independent engineering review

2026-10-30; mission WL-R12B-BROWSER-COST-001 / MND-20261030-003. Baseline a4685e7cd42d8dbbe949b9d5d1e8429d8bb1694c; reviewed current uncommitted successor delta in the linked qualification worktree. This report is an independent AI engineering review, not human Gate C, provider qualification or release approval. No model-version claim is made.

## Findings and disposition

No outstanding Critical/Important/P2 finding in the reviewed code after the four corrections below. Final browser results/report closure remains a coordinator responsibility and is not independently certified here.

|Finding|Observed failure|Reviewed correction and verification|
|---|---|---|
|P2 recording idempotency, browser-simulation.ts|A fresh copy of the same valid recording request returned 200 then 409 because raw response comparison preceded recording normalization.|Consent/audio validation and SHA-bound response normalization now precede replay lookup; retry returns the recording contract, changed bytes/consent fail. Updated HTTP regression passed.|
|P2 Gate C process-loss exposure, gate-c-session.ts|Only finalization persisted history; interruption could lose a first exposure and allow fresh intake without reconciliation.|Exclusive-create STARTED marker is written/fsynced before assigning active session; orphan/mismatched markers stop history import. Completed records remain exclusive and synced; no active-clock restoration. New interruption/mismatch tests passed. This is not physical power-loss proof.|
|P2 Gate C aggregate denominators, gate-c-session.ts|Reading/listening and independence successes were counted only when every skill succeeded, hiding valid mixed outcomes.|Pure summarizeLesson separates observed denominators, successes, unknowns and completed measurement; a false writing result preserves reading/listening/independence counts. New mixed/withdrawal test passed without manufacturing human authority.|
|P2 snapshot resume attestation, browser-qualification.mjs|Resume trusted a sourceRef label without comparing source bytes.|Git blob hashes now check every selected tracked source; only the exact known Next dev next-env declaration transformation is allowed. Existing dependency entries require approved locations and exact junction targets; unexpected source/dependency paths fail. Import guard prevents launching on test import. Governance regression passed.|

## Coverage and strengths

Read authorization, exact scope, plan, Discovery adapter/spec, provider calibration delta, cost benchmark/test/reports, all three browser simulation files, supervisor, successor governance, Gate C engine/tests/operator/report and verification artifact. Inspected tests before implementation. Re-reviewed fixes and their regressions.

Discovery compaction validates full metadata first and preserves exact learner/prompt/level/rubric, ordered role-card text, private criteria and nonempty references/phrases. XML escaping and legacy wire serialization remain; service context/cache identity is unchanged. No endpoint/model/output-cap/threshold/schedule reduction or cache/tokenizer saving is assumed. Benchmark independently reconciled 160 unique observation IDs, 32 repeats and 471133 before / 426093 after HTTP bytes. Budget remains blocked.

Simulation reuses canonical source parser, snapshot, planner and learner projection; isolates namespaces, reads actual hash-bound WAVs, rejects unknown routes and records synthetic mock provenance. Same-persona progress now aggregates lessons while other personas stay isolated. Authentication, persistence and evaluation remain explicitly simulated. Supervisor uses loopback ports and an allowlisted child environment without project env files.

Gate C engineering cannot mint human authority from booleans or synthetic records. Future intake requires separate verified study scope, exact version files, consent/eligibility, order/spacing and approved private storage. Timers separate active/wait/support/research and stop at the cap; null/withdrawn outcomes remain unknown. Aggregate output never promotes readiness.

## Actual independent checks

- Before corrections: combined provider/cost/browser/Gate C/rehearsal Node suites 100/100 PASS, 0 skip; safe Discovery Vitest 11/11 PASS; API tsc --noEmit exit 0. Passing tests did not erase the four findings.
- Authorized mutation experiment: changed the Gate C eligibility condition from every to some; suite returned 12 PASS / 1 FAIL. Restored the exact original bytes in finally, then ran the green combined regression above. No mutation remains.
- After corrections: `pnpm --filter @worklingo/api exec tsx --test test/beginner-pilot/browser-cost-governance.test.ts test/beginner-pilot/browser-simulation.test.ts test/beginner-pilot/gate-c-session.test.ts test/beginner-pilot/rehearsal-protocol.test.ts` returned 45/45 PASS, 0 skip, exit 0 (2 governance + 12 browser + 16 Gate C + 15 rehearsal).
- `node .agents/skills/mandate-steward/scripts/mandate.mjs validate`: valid true, 27 records. `git diff --check`: exit 0.
- Saved Gate C code/test hashes matched their verification artifact at the initial review; that artifact must be refreshed after corrections. Initial and final suite counts are distinct, not summed as unique tests.

Coordinator-reported broad API 375/Web 936 passes, actual browser operations, subsequent final full Node runs and any later artifact refresh are attributed evidence unless separately recorded here. They were not independently reexecuted by this reviewer.

## Declined or unverified dimensions

- Actual CUA browser journey/report consistency: coordinator was rerunning 24 journeys against the final harness when this code review closed; inspect final evidence separately.
- Real provider behavior/scoring equivalence/token use/privacy: zero live calls; mock contracts and byte reduction cannot establish these facts.
- Real adult consent, eligibility, comprehension, timing, phonetics or Gate C acceptance: unavailable; synthetic fixtures do not count.
- Live DB, durable database persistence, default full verify/E2E, deployment/rollback and actual power-loss durability: excluded by safe scope and unproved.
- Future study approval schema contents and private ACL operations: no actual study mandate/root exists; current engineering mandate is rejected and no real participant record was created.
- Dependency vulnerability audit and full historical semantic recertification: not part of this finite delta review; no new dependency/lock/schema/migration change was reviewed as necessary.

Assessment: reviewed engineering delta is acceptable after the recorded fixes; synthetic browser evidence and final governance/report closure still require coordinator reconciliation. Release remains NOT_READY and requires its existing external gates.

SKILL AUDIT
Used: code-review-and-quality -> five-axis review/test-first inspection and caught reversible mutation; mandate-steward -> exact successor/history/evidence boundaries; verification-before-completion -> fresh commands and explicit attribution.
Not used: implementation/TDD workflows; reviewer made only the authorized temporary mutation/restoration and this report.

## Final artifact reconciliation

Independently read the final browser report, personas and results JSON after the final rerun. Final results contain 24 unique PASS persona/Lesson pairs, eight per persona. All eight P02 final rows measure viewport375/scroll375. Raw API events independently reconcile 168 successful ordinary attempts +24 successful recordings =192 activity submissions,72 successful audio reads and statuses1133x200/25x302/54x401/3x403. Raw UI observations contain425 entries; final P01/P02/P03 dashboard observations each show64 activities/attempts and8 completed sessions. The results record zero captured console errors; this is an observation-log claim, not universal absence of browser/runtime errors.

Recomputed six raw artifact SHA256 values: final-events.json, ui-observations.json and all four cited screenshots match the results JSON. All eight source hashes in the personas artifact match current source; both updated Gate C code/test hashes match its verification JSON (16new/31including rehearsal). Visually inspected P02-mobile.png: narrow rendered writing flow, draft saved, Continue and explicit MOCK_PROVIDER feedback are present. The remaining screenshots were hash-checked, not independently visually certified by this reviewer.

Audio evidence precision: final journey rows retain69 detailed audio state entries,20at readyState1 and49at readyState4, with playback requested and no recorded media error; three P03 first-Lesson detailed state entries are absent.72 successful WAV responses are independently evidenced by API events. This supports exercised media loading/playback controls, not a claim that all72 detailed states recorded readyState4 or that complete clips were listened to. The coordinator was notified to keep the report wording within those observations.

Checked the three uncommitted browser harness code differences after7188c8b: only extra trailing blank lines were removed; no behavior changed. Broad final106Node/375API/936Web and API lint/typecheck/build results remain attributed coordinator execution, not fresh execution by this reviewer. The1417 sum is arithmetically correct and does not add the initial browser round or repeated focused tests.

The report separates synthetic cookies, memory persistence,440Hz media, mock feedback and automation wall time from real authentication, DB durability, semantic speech, provider scoring and human learning evidence. No material count/hash discrepancy remains. Engineering evidence is acceptable within that finite scope; actual provider/human/privacy/power-loss/DB/deployment gates and release NOT_READY remain unchanged. No real observation or consent is inferred from the24 scripted journeys.
