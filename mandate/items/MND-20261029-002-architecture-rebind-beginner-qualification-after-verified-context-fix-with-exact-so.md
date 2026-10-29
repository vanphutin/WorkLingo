---
{
  "schema_version": 1,
  "id": "MND-20261029-002",
  "status": "verified",
  "created": "2026-10-29",
  "updated": "2026-10-29T06:39:35.948Z",
  "title": "Rebind Beginner qualification after verified context fix with exact-source offline probes",
  "type": "architecture",
  "owner": "Codex",
  "priority": "P1",
  "confidence": "high",
  "effort": "m",
  "impact": 4,
  "problem": "Current297qualification decisions retain40P1REVISE andoldengineeringevidence despiteverifiedfix ffa475c;48supportlinks stilltargethistoricalIDs.8sourcebundles unchanged;no realgrading/phonetic/learnerproof inferred.",
  "value": "Remove stale technical blockers with traceable newruntime evidence andminimum16real-taskmockprobes,while exposingremaining calibration/provenance/model/GateC requirements withoutautomaticPASS.",
  "scope": [
    "Post-fix R1.2b297-decision intake,notproduct repair",
    "Fournewoffline artifacts/tests;no existing file edits",
    "No liveprovider/DB/GateC/readiness authority"
  ],
  "dedupe_key": "beginner:r12b:post-context-fix:qualification-rebind-16-probes:ffa475c",
  "evidence": [
    {
      "kind": "document",
      "reference": "docs/qualification/beginner-evaluator-context-fix-verification.md:1",
      "observation": "MND-20261029-001verified;60isolatedtestsPASS;realprovideraccuracy explicitlynotmeasured."
    },
    {
      "kind": "document",
      "reference": "docs/qualification/beginner-pilot-ai-led-review.json:1",
      "observation": "297currentdecisions144PASS40REVISE113NEEDS;all40REVISE citeAI-POL-002;48supportIDsnotcurrent."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-29-beginner-post-context-requalification-scope.json:1",
      "observation": "Exactfour-fileallowlist,unchanged8sourcebundles,newcodebinding andevidencegatesfrozen."
    },
    {
      "kind": "document",
      "reference": "mandate/reports/2026-10-29-beginner-post-context-requalification-capture-authorization.md:1",
      "observation": "Owner authorizesauditandconditionalcapture,notexecution."
    }
  ],
  "acceptance": [
    "Only four new files;no edits to existing product,Lesson,audio,rubric,policy/human/frozen result records or old mandates. No Discovery/provider,DB/env,HTTP,STT,TTS,GateC,OS,publish,merge,push,deploy or readiness transitions.",
    "Ledger covers exact297 current decisions(112cells177items8Lesson decisions),144prior textPASS40P1REVISE113NEEDS_EVIDENCE. Each links original ID/digest and exact unchanged official source bundle plus new verified code/fix-report evidence. No prior verdict rewritten or auto copied into a new PASS.",
    "Forty prior REVISE records exclusively citing AI-POL-002 get disposition CONTRACT_RESOLVED_REASSESSMENT_REQUIRED,not automatic assessment PASS. Distinguish verified context-delivery closure from unmeasured model scoring. No confirmed residual pedagogical REVISE is invented;new substantiated issues need precise source evidence and separate correction scope.",
    "New isolated suite captures16 real authored S/W task contexts through EvaluationService with mock pinned snapshots/Prisma/provider. Compare exact roleCards/taskCriteria/allowed alternatives to actual source and official bundle;mock versionIDs labeled synthetic,never actual DB LessonVersion/release IDs. Reuse existing60tests without repairing P1 again.",
    "Dedicated config imports safe transpiler/setup only,explicit envDir isolation and blank DB/provider secrets,fake providers;include exactly new probe and two existing context/service specs. Never load ordinary .env/DB-fallback config. Tests assert bound-version/privacy,missing context denial,source/rubric/script/bundle integrity and no writes outside mocks.",
    "Reconcile six support groups and48 stale references in a NEW ledger:resolve current-round IDs for correct source/lesson/bundle,then check actual affected lessons rather than mechanically map every group to all8. eraser support is assessed only in MG02-L1. Missing provenance/reviewer evidence remains explicit,not fabricated.",
    "Prepare96 candidate calibration cases(16tasks x6 classes:authored correct,allowed alternative,wrong fact,missing fact,cross-role/near-far/quantity error,prompt injection) with proposed outcome reasoning,citations and hash;no executed scores or claims of reviewer approval. Speaking transcript cases evaluate language only,not phonetics/STT. Golden adjudication and numerical acceptance thresholds must be frozen by owner before any separate live-provider run.",
    "NEEDS_EVIDENCE primary buckets remain auditable:40audio/phonetic(24assets16cells),49provenance(41occurrences8cells;11distinct expression/IPA pairs),16learner-comprehension/progression cells,8planned demonstration outline cells. Exact review-model/version disclosure is a global prerequisite;do not silently relax policy if unavailable.",
    "Existing24WAV/script bytes unchanged;owner GateA soundQA preserved but not relabeled independent phonetic evidence. Prepare minimal expert evidence form bound to exact hashes,11unique lexeme/IPA references+41occurrence mappings and six support dispositions. Authored-inline provenance is allowed if explicitly evidenced/adjudicated;never invent LanGeek/masterEntryId/CEFR mapping.",
    "GateC remains existing MND-20261027-004 triaged with no approval:propose refreshing that scope,not duplicating it. Reuse proposed3consenting adults x8first-exposure observations,45-minute planner vs proposed35-50active median/2of3 range;all criteria require owner acceptance,not observed evidence. Keep GateC downstream of eligible Lesson review;not a circular prerequisite for source-only assessment.",
    "Offline tests/schema/digest/unique coverage and negative stale-reference/cross-bundle/incomplete-context controls PASS. Report all failures/skips,source/probe hashes,limits and approval-needed gates. Offline execution completion is not AI_QUALIFIED,GateBverified,R1.2bCONTENT_READY or learner/publication access.",
    "Separate source-design review from real learner-outcome evidence for16load/progression cells:no circular GateC-before-design qualification. Review/reuse eight existing bounded support outlines;new proposals only in newreports,with alternate assessment facts and explicit PLANNED status,no performed demonstration claims."
  ],
  "risk": {
    "level": "medium",
    "breaking": false,
    "data_change": false,
    "external_effect": false,
    "rollback": "Withdraw onlynewledger/probe outputs;preserveoldhistory/product/source/audio/DB/readiness."
  },
  "backlog_reference": "docs/IMPLEMENTATION_ROADMAP.md",
  "plan_reference": "docs/superpowers/plans/2026-10-29-beginner-post-context-requalification.md",
  "sprint_reference": null,
  "approval": {
    "actor": "WorkLingo product owner (direct human message)",
    "reference": "docs/qualification/beginner-pilot-post-context-requalification.md:3",
    "at": "2026-10-29T06:18:26.396Z",
    "proposal_hash": "194ec25bb2deae37eabc137b6646e30927d3b825303073abfce91c8b500a438e"
  },
  "verification": [
    {
      "command": "pnpm --filter @worklingo/api exec vitest run --config vitest.beginner-requalification.config.ts (106 PASS,0 FAIL,0 skipped)",
      "result": "passed",
      "reference": "docs/qualification/beginner-pilot-post-context-requalification.md"
    },
    {
      "command": "pnpm exec eslint apps/api/vitest.beginner-requalification.config.ts apps/api/test/beginner-pilot/post-context-requalification.spec.ts",
      "result": "passed",
      "reference": "docs/qualification/beginner-pilot-post-context-requalification.md"
    },
    {
      "command": "pnpm --filter @worklingo/api exec tsc --noEmit",
      "result": "passed",
      "reference": "docs/qualification/beginner-pilot-post-context-requalification.md"
    },
    {
      "command": "47 frozen repository hashes and24 WAVs;297-lineage schema/digest negative controls;independent review plus7 RED then106 GREEN",
      "result": "passed",
      "reference": "docs/qualification/beginner-pilot-post-context-requalification.md"
    }
  ],
  "history": [
    {
      "at": "2026-10-29T01:33:50.298Z",
      "actor": "mandate-steward",
      "from": null,
      "to": "captured",
      "reason": "Evidence-backed proposal captured; no implementation approval.",
      "event": "capture",
      "reference": null
    },
    {
      "at": "2026-10-29T01:35:35.256Z",
      "actor": "mandate-steward",
      "from": "captured",
      "to": "captured",
      "reason": "Proposal revised; prior approval revoked; requires new triage.",
      "event": "update",
      "reference": null
    },
    {
      "at": "2026-10-29T06:18:26.060Z",
      "actor": "Codex",
      "from": "captured",
      "to": "triaged",
      "reason": "Exact captured scope reviewed; proposal/baseline/allowlist hashes verified against direct owner approval.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-29T06:18:26.396Z",
      "actor": "WorkLingo product owner (direct human message)",
      "from": "triaged",
      "to": "approved",
      "reason": "Matching execution approval for proposal 194ec25bb2deae37eabc137b6646e30927d3b825303073abfce91c8b500a438e; four offline files and mocks only.",
      "event": "transition",
      "reference": "docs/qualification/beginner-pilot-post-context-requalification.md:3"
    },
    {
      "at": "2026-10-29T06:18:26.742Z",
      "actor": "Codex",
      "from": "approved",
      "to": "implementing",
      "reason": "Begin approved exact-source offline probes and new ledger; no old artifact/readiness/provider/DB changes.",
      "event": "transition",
      "reference": null
    },
    {
      "at": "2026-10-29T06:39:35.948Z",
      "actor": "Codex",
      "from": "implementing",
      "to": "verified",
      "reason": "Only approved four-file offline evidence intake verified.106 scoped mock tests,lint,typecheck,immutable bindings and independent-review corrections pass;no assessment/readiness/provider/DB/GateC authority is granted.",
      "event": "transition",
      "reference": null
    }
  ]
}
---

## Post-fix qualification successor,capture only

UsesverifiedMND-20261029-001 as input,never repairsP1again. ParentAI-ledpolicyMND-20261028-004 remains frozen. Currentowner authorizesnewscope capture,notexecution.

Frozen scope mandate/reports/2026-10-29-beginner-post-context-requalification-scope.json SHA256 349229f93cbbad4fcf5ef5f44bf96dc0baf2eecababf48eca30e42e3a65d2d86. Plan LF SHA256 ab6d169726dd80b68e6ddbd9b1c60e3b3400ffd69b3e7dd860309dbe7e11d119. Baseline ffa475cb732742a4c945f6758160bf3884084698;baselinefingerprint 3f24f8316c43f35437cd2b87042bdc171ec4fd1d70834d29b251019fc92d6b1e;allowlistfingerprint 292e165a02fd4f36786cc1329b2ce06abaa5d68384629811abb99e05af8ec5c9.

## Exact boundary
Fournewfiles only:isolated config/probe plusJSON/MDdeltaevidence.297intake rows,16actualauthored S/Wcontext probes,sixsupportdispositions and96candidate calibrationcases. No oldverdict copied intoPASS;rawsource/taskrubric/audio bundleidentities unchanged,newengineeringenvelope separate.

## Deferred real-world gates
No Discovery/otherprovider,DB/env/HTTP/STT/TTS,GateC,oldpolicy/content/audio edits,contact,merge/push/deploy orreadiness. FutureDiscoverycalibration needs resource/model/budget/golden approval;expertphonetics/provenance/model evidence cannotbe invented. Renew existingtriagedGateC onlyunder separate authority;do notcreate duplicate.

## Acceptance
See frozen exact tests/ledger gates. Existing60PASS is inputevidence,notlivegradingproof. Rollback withdrawsonlynewoutputs. Matching humanexecutionapproval needed before fourfiles arecreated.
