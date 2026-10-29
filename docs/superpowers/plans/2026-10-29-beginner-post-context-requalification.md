# Post-context R1.2b minimal requalification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans only after matching approval. Capture-only now.

**Goal:** Rebind qualification evidence after verified evaluator fix without changing content or inheriting verdicts.
**Architecture:** Read-only frozen297-decision input;new normalized delta ledger references old decisions and unchanged8official source bundles,with separate runtime-code/fix-report bindings. One new isolated probe runs all16actual authored response tasks with synthetic pinned versions.
**Tech Stack:** Existing TypeScript/Vitest/Nest mocked boundary;JSON/Markdown artifacts.
**Spec:** mandate/reports/2026-10-29-beginner-post-context-requalification-capture-authorization.md;mandate/reports/2026-10-29-beginner-post-context-requalification-scope.json; existingAI-led policy andqualification/GateCplans.

## Global Constraints
- New4-file allowlist only. No product/content/audio/policy-old edits.
- No liveprovider/DB/.env/HTTP/STT/TTS/GateC/publish/merge/push/deploy orreadiness change.
- No generic re-planning/P1 rewrite;engineering fix MND-20261029-001 verified is input evidence.
- Never equate transcript grading with pronunciation or planned45minutes with measured timing.

## Exact files
{
  "modify": [],
  "create": [
    "apps/api/vitest.beginner-requalification.config.ts",
    "apps/api/test/beginner-pilot/post-context-requalification.spec.ts",
    "docs/qualification/beginner-pilot-post-context-requalification.json",
    "docs/qualification/beginner-pilot-post-context-requalification.md"
  ],
  "fingerprint": "292e165a02fd4f36786cc1329b2ce06abaa5d68384629811abb99e05af8ec5c9"
}

## Review Focus
- New runtime envelope must retain unchanged source bundle IDs,not invent republished LessonVersions.
-40staleP1REVISE are not40pedagogical defects or automaticPASS.
- Support-reference remapping must be current-round and actually lesson-relevant.
- Synthetic task probes,96candidate goldens andreal observations have distinct provenance.
- Missing model/phonetic/provenance evidence cannot be bypassed with contract tests.

## Task1 — RED/GREEN exact-source offline probes
**Files:** newVitest config andnewtestfile only.
**Consumes:** current pinned-snapshot builder/EvaluationService,8authored sources,officialbundles,verifiedfix.
**Produces:**16captured mock evaluation contexts andnon-secret digests.
- [ ] Write missing-probe/incorrectfacts/criteria/cross-version/stale-coverage assertions;witnessREDbefore implementing localtesthelpers.
- [ ] Add config fromsafeBeginner plugins andexisting isolation setup,strictthree-file include,blank credentials andsyntheticmockdatabase/provider. No production code.
- [ ] Implement capture helpers innewtestonly;assert roleCards/taskCriteria fromactualsource viareal service/serializer,not handwritten mirrorofnewlogic.
- [ ] Runnewprobe+existing60contexttests;retain actual results andlimits.

## Task2 — Delta ledger andevidence pack
**Files:** newJSON andMarkdown only.
**Consumes:**297frozen records,probeoutputs,currentcodehashes/fixverification,andoldmatrix/decisiondigests.
**Produces:**297traceable dispositions,evidencequeue,sixsource-aware supportdispositions,and96candidate goldens.
- [ ] Record every olddecision ID/digest/verdict withnewintake disposition;neverrewrite oldfiles orautoPASS.
- [ ] MarkcontractP1fixed onlywithverifiedreport/60PASS;leave gradequality/calibration/phonetics/modelmetadata unresolved where missing.
- [ ] Remap48supportreferences withsame-source/lesson relevance;test duplicate/missing/historical/cross-bundle links innewtest.
- [ ] Draftcandidate goldenclasses andexpert/owner evidenceforms,no fake verdicts,reviewdates,signatures orobservations.

## Design versus observed learning boundary
The16 instruction-load/progression cells have two axes:source-design review can complete before GateC;actual comprehension/difficulty observations remain program-readiness evidence after separately approved GateC. Never impose GateC as a circular prerequisite to reviewing the design,and never label design PASS as observed learning. Reuse/review eight existing planned support outlines;any proposed adjustments stay only in the new reports,with alternative facts to assessed cards,demonstration <=60seconds/clarification <=120seconds as proposed GateC caps. No actual demonstration or video/resource production is implied.

## Task3 — Verify andhandoff remaining real-world gates
- [ ] Runisolatedsuite,focusedlint/APItypecheck andschema/hash/linkchecks;recordFAIL/SKIP honestly.
- [ ] Independent read-only review;only commit fourallowlisted files after scopedacceptance.
- [ ] Provider run remains future approval:Discovery-only profile/endpoint/exactmodel,request/spendcaps,no fallback;goldens/thresholds approved before scoring. Not authorized bythisscope.
- [ ] Real Speaking audio/STT/intelligibility needs separately scoped evidence;Beginner rubric currently pronunciationOrFluency=null.
- [ ] Human expert sourceWAV/IPA/provenance review mayrun inparallel viaowner-controlled trueevidence;no externalcontact fromagenthere.
- [ ] Renew existingGateC oncurrenthashes/AI-led equivalence andobtain matchingapproval before3x8observations. Thenownerreviews closeout;no automaticCONTENT_READY.

## Acceptance
- Only four new files;no edits to existing product,Lesson,audio,rubric,policy/human/frozen result records or old mandates. No Discovery/provider,DB/env,HTTP,STT,TTS,GateC,OS,publish,merge,push,deploy or readiness transitions.
- Ledger covers exact297 current decisions(112cells177items8Lesson decisions),144prior textPASS40P1REVISE113NEEDS_EVIDENCE. Each links original ID/digest and exact unchanged official source bundle plus new verified code/fix-report evidence. No prior verdict rewritten or auto copied into a new PASS.
- Forty prior REVISE records exclusively citing AI-POL-002 get disposition CONTRACT_RESOLVED_REASSESSMENT_REQUIRED,not automatic assessment PASS. Distinguish verified context-delivery closure from unmeasured model scoring. No confirmed residual pedagogical REVISE is invented;new substantiated issues need precise source evidence and separate correction scope.
- New isolated suite captures16 real authored S/W task contexts through EvaluationService with mock pinned snapshots/Prisma/provider. Compare exact roleCards/taskCriteria/allowed alternatives to actual source and official bundle;mock versionIDs labeled synthetic,never actual DB LessonVersion/release IDs. Reuse existing60tests without repairing P1 again.
- Dedicated config imports safe transpiler/setup only,explicit envDir isolation and blank DB/provider secrets,fake providers;include exactly new probe and two existing context/service specs. Never load ordinary .env/DB-fallback config. Tests assert bound-version/privacy,missing context denial,source/rubric/script/bundle integrity and no writes outside mocks.
- Reconcile six support groups and48 stale references in a NEW ledger:resolve current-round IDs for correct source/lesson/bundle,then check actual affected lessons rather than mechanically map every group to all8. eraser support is assessed only in MG02-L1. Missing provenance/reviewer evidence remains explicit,not fabricated.
- Prepare96 candidate calibration cases(16tasks x6 classes:authored correct,allowed alternative,wrong fact,missing fact,cross-role/near-far/quantity error,prompt injection) with proposed outcome reasoning,citations and hash;no executed scores or claims of reviewer approval. Speaking transcript cases evaluate language only,not phonetics/STT. Golden adjudication and numerical acceptance thresholds must be frozen by owner before any separate live-provider run.
- NEEDS_EVIDENCE primary buckets remain auditable:40audio/phonetic(24assets16cells),49provenance(41occurrences8cells;11distinct expression/IPA pairs),16learner-comprehension/progression cells,8planned demonstration outline cells. Exact review-model/version disclosure is a global prerequisite;do not silently relax policy if unavailable.
- Existing24WAV/script bytes unchanged;owner GateA soundQA preserved but not relabeled independent phonetic evidence. Prepare minimal expert evidence form bound to exact hashes,11unique lexeme/IPA references+41occurrence mappings and six support dispositions. Authored-inline provenance is allowed if explicitly evidenced/adjudicated;never invent LanGeek/masterEntryId/CEFR mapping.
- GateC remains existing MND-20261027-004 triaged with no approval:propose refreshing that scope,not duplicating it. Reuse proposed3consenting adults x8first-exposure observations,45-minute planner vs proposed35-50active median/2of3 range;all criteria require owner acceptance,not observed evidence. Keep GateC downstream of eligible Lesson review;not a circular prerequisite for source-only assessment.
- Offline tests/schema/digest/unique coverage and negative stale-reference/cross-bundle/incomplete-context controls PASS. Report all failures/skips,source/probe hashes,limits and approval-needed gates. Offline execution completion is not AI_QUALIFIED,GateBverified,R1.2bCONTENT_READY or learner/publication access.

## Commands aftermatchingapproval
- pnpm --filter @worklingo/api exec vitest run --config vitest.beginner-requalification.config.ts
- pnpm exec eslint apps/api/vitest.beginner-requalification.config.ts apps/api/test/beginner-pilot/post-context-requalification.spec.ts
- pnpm --filter @worklingo/api exec tsc --noEmit
- node .agents/skills/mandate-steward/scripts/mandate.mjs validate

## Rollback
Append withdrawal/superseding status innewledger andretain priorfiles/decisions;inverse scopedcommit fornewtest/config ifneeded. Neverrevert verifiedP1,editoldhistory,deleteaudio,changeDB,orunlock learners.

## Capture self-review
Single newruntime-evidence intake,not a duplicate oftheverifiedP1 fix orinitialAI-led policy. No actual tests/providers/learner observations executed inthiscapture. Modeldisclosure andphonetic/provenance remain real gates.
