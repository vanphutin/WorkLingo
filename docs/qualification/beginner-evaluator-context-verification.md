# Beginner evaluator context verification — MND-20261028-003

Proposal: 84f561d607ebb4dbc17dab70dccfab6a267eba41a3de5ab9def437aa945be8c3.
Functional investigation concluded: P1 CONTEXT_GAP_CONFIRMED_AT_MOCKED_CONTRACT_BOUNDARY. Product unchanged; no real-provider grading claim.

## Actual evidence
Command: pnpm --filter @worklingo/api exec vitest run --config vitest.beginner-evaluator-context.config.ts
Final functional run: 36 tests,34 PASS,2 FAIL,0 skipped.17 existing service regressions PASS.17 new characterization/isolation assertions PASS.2 desired-contract assertions intentionally remain real FAIL (not test.fails,skipped or converted to PASS).
Initial fixture error: empty languageBlockReferences violated activity schema. Repaired synthetic references using existing fixture pattern;not a product defect. Final two failures are semantic context omissions,not fixture validation errors.

Exact captured input for both Adam/London and Emma/Osaka role cards:
~~~json
{"routing":{"userId":"00000000-0000-4000-8000-000000000002"},"activityType":"writing","learnerResponse":"Hello. I am Adam. I am from London.","levelCode":"MG_F0","prompt":"Introduce yourself using the card.","referenceText":"","requiredPhrases":[],"rubricId":"beginner-short-writing","rubricVersion":"1"}
~~~
The private task rubrics differ by name/place and permit contractions;neither criterion appears in request. Both actual adapters executed with mocked fetch only;both serialized bodies omit facts/criteria. Routing forwards input unchanged. Private cache input hashes differ by LessonVersion,so cache version isolation remains present. DTO retains public card and removes model/private rubric. Unsupported rubric ID/version/skill and mismatched pinned snapshot fail before evaluation. Existing service tests cover other malformed snapshots and duplicate/result paths.

## Failing desired assertions
1. Serialized provider context must differentiate opposite role-card facts — FAIL: identical serialized data.
2. Serialized context must contain task-specific acceptable alternatives — FAIL: missing accept-contractions criterion.
A synthetic response can be correct for one card and wrong for another while provider inputs are identical. This proves information loss,not observed live-provider false grading. Mock scores are not a semantic oracle.

## Isolation
Dedicated config imports only safe Beginner transpiler plugin;ordinary API vitest.config.ts never loaded. DB URLs/provider keys blank;no .env loader;mock PrismaClient construction/network fail closed;no application bootstrap. No real DB/HTTP/provider calls authorized or performed.

## Handoff for separately approved product fix — NOT CAPTURED
Investigate minimal server-only evaluation context from exact pinned snapshot contentReferences and foundation.responseRubrics. Possible bounded files: EvaluationService,evaluation input port,OpenAI serializer/shared Discovery path,and focused tests. Fail closed on missing required context;retain legacy behavior and exact-version/cache binding. Never solve missing evaluator context by exposing model/private criteria in learner DTO or by forcing sample-answer matching. Require a new proposal and matching owner approval;this mandate cannot edit those files.

## Dependency ruling
Owner unified approval explicitly permits independent offline content correction after confirmed P1 evidence if captured scope allows. Captured content dependency allows offline authoring after owner acknowledgement;latest direct approval supplies forward authority for this exact confirmed-risk branch. Functional investigation is concluded before content writes. P1 stays unresolved and blocks real learner evaluation and final AI qualification;content editing does not depend on fixing evaluator.

## Status and remaining checks
MND-20261028-003 remains implementing: no verified claim while desired-contract tests FAIL. Focused ESLint PASS;API tsc --noEmit PASS;API build PASS on run before the final four service-boundary legacy cases were added. Final checks will reconfirm after review. Four legacy cases cover generic EvaluationService dispatch with Foundation1.0/1.1 and Intermediate/IELTS labels;this is not full IELTS runtime/E2E qualification. No product fix,source edit,new mandate capture,readiness or parent lifecycle change.

## Independent review corrections
Read-only reviewer identified incomplete default-export/Socket and import-time network guards,weak historical conflict proof,and missing listening privacy cases. Harness regression first failed safely on import-time fetch identity (no network request made);then actual builtins/default exports/Socket.connect and import-time fetch were patched. Named fs readFileSync env refusal synchronized with builtins;negative probes pass. Added conflicting V2 lookup mock,assert no lookup and persisted V1 ID;listening keys/explanations/transcript redaction sentinels PASS. Legacy snapshots use the valid stored unversioned shape;source-format labels are test scenarios,not stored formatVersion values. Generic boundary regressions do not replace full Intermediate/IELTS integration.

Ruling: approved investigation deliberately retains2 desired-contract FAIL assertions instead of fixing product or relabeling them PASS. Local diagnostic commit is evidence of an unresolved defect,not a green product acceptance. No full default test suite run: ordinary API config reads.env and falls back DB,explicitly prohibited. Ledger kept in this allowlisted report rather than creating workflow scratch outside exact scope.

Final verification: full dedicated config run after formatting/review corrections:36 total,34 PASS,2 actual desired-contract FAIL,0 skipped,exit1. Focused ESLint PASS;API tsc --noEmit PASS;API tsc build PASS. Independent reviewer re-review reports no remaining Important P1-harness issues. Product context gap remains unresolved. Four exact files form a diagnostic evidence commit with explicitly failing desired contract;no product-green or verified claim.
