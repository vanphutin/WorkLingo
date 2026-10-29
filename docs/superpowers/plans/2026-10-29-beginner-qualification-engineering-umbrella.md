# Beginner R1.2b Qualification Engineering Umbrella Implementation Plan

> **For agentic workers:** Use executing-plans after matching approval. This is one bounded successor, not execution approval. Use TDD and local atomic commits; independent review if available.

**Goal:** Complete the remaining offline qualification engineering without changing protected teaching content or inventing real-world qualification evidence.
**Architecture:** Existing A/B scopes and artifacts remain authoritative historical records. Add one local durable runtime, explicit oracle/reviewer evidence intake and synthetic-only rehearsal tooling. No global governance/CLI policy changes: autonomy is delegated only inside this finite mandate/allowlist.
**Tech Stack:** Existing Node/TypeScript/tsx, filesystem/child_process/crypto, current serializer/evaluator and synthetic mocks. No new dependencies.
**Spec:** Owner mega-task and autonomous delegation, summarized with attachment hashes in mandate/reports/2026-10-29-beginner-engineering-umbrella-review.md. Extends docs/superpowers/plans/2026-10-29-beginner-real-qualification.md; does not replace curriculum/R1.2b plans.

## Global Constraints
- Current code baseline39b6e90; exact baseline hashes and finite20-file source allowlist in the linked scope. Only matching CLI approval opens execution. Parent scopes/hashes/history remain unchanged.
- No source Lesson/audio/rubric/evaluator/product/schema edits; no real DB/provider/credentials/OS/ACL changes, participant recruitment, GateC, learner data,publication or readiness transitions under this Umbrella.
- Provider authority remains separate under A, including fresh actual quota/privacy/adjudication evidence and maximum20 pilot starts. This Umbrella implements and verifies code offline; it does not execute the pilot.
- USD0,no top-up;existing A maximum1.5 granted InkPoints,160starts,650000input reservation,327680output reservation,2048output/request,one inflight,10s interval,6starts/60s. Unknown accounting/model/usage stops.
- No new dependencies or blanket scripts. Tests use mocks/synthetic fixtures and exact runtime paths. Broader tests/build only the explicit command list;never pnpm verify,default integration or E2E.

## Delegation policy proposed for this mandate
Once the owner approves this exact proposal, Codex may autonomously implement, minimally refactor,fix failures,add regression tests,review and locally commit within the finite scope. No task-by-task approval is needed. Ledger each task/ruling;one writer per file/register. Scope drift or protected-asset changes stop only the affected branch and require a new matching approval. External evidence is never inferred; no autonomous approval,signature,adjudication or readiness assertion. The existing mandate lifecycle and CLI remain unchanged. No global governance power or permission to edit arbitrary files is delegated.

## Review Focus
- Abrupt process death after reservation but before network/receipt:consumed budget must survive;unknown outcome never retries automatically.
- Windows rename/lock/PID reuse and directory reparse:fail closed without deleting another process's lock.
- A valid oracle digest with a false caller adjudication claim:case provenance is retained as reported,not authenticated;no boolean bypass.
- Reviewer import must preserve all prior events and reject stale/unknown/private fields;conflicts remain unresolved.
- Legitimate current governance differs from a historical fingerprint:validate each at its own revision;never edit the historical tests or call them current PASS.

## Task1 — durable accounting and bounded pilot integration
Files:qualification-runtime.ts/.test.ts;A tool/test/results JSON/MD;.gitignore only the exact runtime exclusion.
Consumes:existing Goldens,RequestReceipt,boundedTransport;produces withAccountingLock(operation),recoverLedger(),reserveRequest(),recordOutcome(). All operations consume one fixed runtime identity;no caller-selected root/runID reset.
- [ ] RED:child processes are killed before reservation,after fsync reservation,during injected request and after response-before receipt. Competing process must not reserve;restart retains high-water mark and marks uncertain execution UNKNOWN/CONSUMED. Assert no automatic resend/exactly-once claim.
- [ ] RED:corrupt/truncated/missing journal or receipt,stale lock/PID reuse,symlink/reparse,rename failure,quota exhaustion,duplicate ID,unknown usage/model,timeout and oversized reply all stop without fallback. Test20pilot/160lifetime cap across processes and phases.
- [ ] GREEN:atomic mkdir lock with owned identity,append/hash-chain journal+fsync before network,atomic derived state,conservative recovery. On Windows directory-durability uncertainty,declare RUNNER_SAFE=false;do not promise power-loss durability without evidence. No automatic removal of an unverifiable stale lock. Fixed runtime paths only.
- [ ] Wire run readiness to validated durable/oracle/external evidence;no actual calls. No default-key/env fallback or secret output. Inject transport in tests;new CLI recovery/verification commands remain offline.
- [ ] Run runtime/A suites RED->GREEN;review,record results and commit.

## Task2 — evidence intake and reporting
Files:A/B existing allowed files,oracle-adjudication template,qualification engineering report.
Consumes:Task1 runtime;produces importOracleReview(text),persistReview(text),reportPilot().
- [ ] RED:all128 adjudication rows bind exact oracle;missing/ambiguous/stale/signature/extra fields reject. Require source-derived bounds independent of provider outputs;preserve original goldens bytes.
- [ ] RED:82review rows bind packet/item hashes,qualification/consent/receipt/date/claim scope;import interrupted before/after commit recovers without duplicate or lost history. No global-PASS fanout. Untrusted text never becomes a signature or authenticated professional evidence.
- [ ] GREEN:append-only evidence through Task1 journal;atomic derived A/B views,explicit conflict adjudication,HTML import/export and focused report generation. No actual evidence is supplied by the agent.
- [ ] Pilot interpretation proposal:zero observed false full acceptance on factual negatives;zero score-bound injection success;complete-response rejection<=10%;paired dimension drift<=0.10;no unsafe feedback. Treat these as suggested interpretation thresholds,not validated learning/mastery thresholds. A future factual review may approve different bounds only before calls and with explicit versioned evidence. PILOT_PASS requires20receipted successful starts,all live gates and actual feedback adjudication;otherwise INCONCLUSIVE/REVISE/NOT_RUN. Report confidence and denominators;never convert score-only checks into phonetic accuracy/full rubric proof.
- [ ] Run A/B/import/fault tests RED->GREEN;commit in small units. No real provider or reviewer results are manufactured.

## Task3 — GateC protocol tooling, not execution
Files:rehearsal-protocol.ts/.test.ts;rehearsal protocol MD/engineering JSON.
Consumes:frozen8bundle+24WAV identities and existing draft C protocol. Produces validateObservation(input),aggregateRehearsal(input);no learner persistence or live-session command.
- [ ] RED:synthetic first-exposure records must cover3consenting adults x8Lessons=24observations;reject duplicated exposure,missing consent/version,negative/overlapping times,critical defects,missing skills and active-time padding. Synthetic provenance must never count as real observation.
- [ ] GREEN:protocol retains proposed P01/MG01-L1 first,three valid observations/Lesson,at least2/3 independently successful,reading/listening each>=2/3,S/W factual task criteria,no critical instructional defects,median load<=3/5. Timings are active/wait/support/research separately;45minute contract is not observation. Proposed active median35-50minutes and2/3 in range,stop60active minutes;24h spacing;all remain unapproved human-study criteria under existing C authority.
- [ ] Privacy:minimum booleans/counts/times privately;no raw learner answers/recordings/PII or participant-level records in Git. Tool exports Lesson aggregates only. No actual private storage creation,consent records or participants now. C's future storage/retention/consent approval remains separate.
- [ ] Run synthetic tests RED->GREEN;output NOT_RUN with0real observations and commit. Do not update MND-20261027-004.

## Task4 — current/historical governance and security verification
Files:qualification-governance.test.ts,qualification-vitest.config.ts plus engineering report.
- [ ] RED:historical106-test evidence stays anchored to its original revision/47-file fingerprint. A fabricated current PASS or modified historical source must reject. Current baseline validates exact protected assets plus legitimate CLI proposal/lifecycle separately.
- [ ] GREEN:add a new validator without editing old tests,mandates,ledgers or frozen artifacts. Preserve original GateC item;describe later CLI update as a separate C approval action.
- [ ] RED:standalone Vitest config must not read .env,fall back to DATABASE_URL or start integration/E2E. Existing apps/api/vitest.config.ts explicitly loads .env and falls back to DATABASE_URL,so it is not authorized for this run. GREEN:separate no-env config with fake providers and no DB credentials;run only the named mock suites.
- [ ] Run explicit A/B/runtime/rehearsal/current-governance suites,focused lint,API typecheck/build and named safe legacy tests through that config. Review diff for endpoint/privacy/cache/version/cost/path/budget/unsafe import regressions. Build output is derived ignored apps/api/dist only.
- [ ] Try an authorized independent reviewer;unavailability is BLOCKED,not self-review PASS. Final scan/hash/allowlist/mandate validation then local commits only. Missing external evidence never becomes code PASS or CONTENT_READY.

## Rollback and completion
Stop the runner;retain journal/receipts and all evidence. Revert this mandate's source commits only via reviewed local revert;do not erase accounting or history. Cleanup may remove only proven-owned synthetic files in the exact runtime allowlist;retain uncertain/nonempty/foreign objects. No recursive/shared deletion. This mandate can close software-only when tests and independent review acceptance are met;it cannot verify GateA/B/C or any Lesson. All unimplemented tasks above remain pending owner matching approval.
