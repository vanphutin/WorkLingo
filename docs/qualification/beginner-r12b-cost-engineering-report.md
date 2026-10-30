# Beginner R1.2b cost engineering

MND-20261030-003. Production Discovery compaction is implemented and verified offline. Provider execution remains **BLOCKED_BY_BUDGET**: the 1.5 InkPoints / USD 0 limit is unchanged; live starts and actual spend are 0. Actual tokens are **NOT_MEASURED**.

Only validated Beginner wire metadata is removed: schema/version and activity identifiers, role-card slugs, empty reference text and empty required-phrase arrays. Exact learner response, prompt, level, rubric ID/version, ordered role-card text, private task criteria and acceptable alternatives remain. Nonempty references/phrases remain. Full system instructions, response schema, model qwen3.8-27b, Discovery endpoint, 2048 output reservation, response/refusal validation and retries are unchanged. Full context still reaches EvaluationService and cache identity; OpenAI production source is untouched. XML boundaries and escaping of <, > and & remain.

| Schedule | Before HTTP bytes | After HTTP bytes | Before reservation | After reservation |
|---|---:|---:|---:|---:|
| Pilot 20 | 57,534 | 51,904 | 164.8112 | 160.3072 |
| Remaining 140 | 413,599 | 374,189 | 1,162.3672 | 1,130.8392 |
| All 160 | 471,133 | 426,093 | 1,327.1784 | 1,291.1464 |

Reservations are InkPoints using owner-reported rates 800 input / 2700 output per million tokens, with no cache discount. Complete request-body UTF-8 bytes plus 512 per start are the inherited engineering input reservation method, **not an authenticated tokenizer upper bound**. The before payload uses the unchanged former serializer with the same full HTTP envelope; after bytes are captured from the real Discovery adapter through mock HTTP. The deterministic JSON records every observation, case, repeat, phase and byte count. All 128 cases, 160 starts, 20 pilot starts, 32 repeat anchors and negative cases are retained.

Savings: 45,040 HTTP bytes (9.56%) and 36.032 InkPoints (2.71% of full reservation). After-compaction single-start reservations range from 7.932 to 8.4496 InkPoints (body 2,491–3,138 bytes). Pilot starts range from 7.9664 to 8.1112. Each failed start consumes the same full reservation; an all-failed 160-start schedule therefore reserves 1,291.1464. The frozen 650,000 input / 327,680 output maximum reserves 1,404.736. Output-only reservation is 884.736 for 160 starts (110.592 pilot), already above 1.5. No output cap, criterion, threshold, repeat, model or endpoint was reduced to claim feasibility. Existing lower frozen pricing ceilings still reject the owner-reported high rates; no rate override was made.

Further input-only compression cannot satisfy the cap at these rates with unchanged output reservations. Stateful caching, tokenizer savings, shorter semantic criteria and reduced output reservations were not assumed. No live service, env file, credential or database was used. Mock responses prove contract preservation, not model scoring equivalence or learning efficacy.

Historical frozen authority remains checked at a4685e7 for the one authorized serializer change. Its historical CRLF checkout hash is reproduced from uniform LF Git source; all other frozen bytes remain checked in place. Current adapter source is bound to reviewed LF SHA256 fe5da55e7041dbab4a2dba4254ed6e46ad90c2713fd3a3711985ae478f9794be; only uniform LF/CRLF is accepted and mixed endings/source drift fail closed. The successor scope hash is bound in the mandate body, its current proposal approval hash is recomputed from the canonical proposal schema fields, and realProviderCalls must remain false. This is a local governance consistency check, not authentication of the owner. Coordinator final governance review remains required.

Verification actually run from repository root:

- RED: `pnpm --filter @worklingo/api exec vitest run --config test/beginner-pilot/autonomous-vitest.config.ts src/ai-gateway/infrastructure/discovery-language-evaluation.adapter.spec.ts` — 1 failed / 10 passed; exact redundant-field assertion failed before implementation. GREEN: 11 passed.
- RED: `pnpm --filter @worklingo/api exec tsx --test test/beginner-pilot/cost-benchmark.test.ts` — 1 failed because benchmark implementation was absent. GREEN: 1 passed; literal 20/160 byte and reservation totals verified.
- `pnpm --filter @worklingo/api exec tsx --test test/beginner-pilot/provider-calibration.test.ts test/beginner-pilot/cost-benchmark.test.ts` — 61 passed, 0 failed. Full private semantic strings checked across all 128 cases; legacy accounting/failures/repeats preserved.
- `pnpm --filter @worklingo/api exec vitest run --config test/beginner-pilot/autonomous-vitest.config.ts src/ai-gateway/infrastructure/discovery-language-evaluation.adapter.spec.ts src/ai-gateway/infrastructure/openai-language-evaluation.adapter.spec.ts src/teacher-ai/application/beginner-evaluator-context.spec.ts` — 66 passed, 0 failed. Includes real OpenAI adapter against owned loopback mock and real pinned context evaluation.
- `pnpm --filter @worklingo/api exec eslint` with the six owned TypeScript paths — exit 0.
- `pnpm --filter @worklingo/api exec tsc --noEmit` — failed on concurrently authored Gate C session nullability/declaration errors, none in the cost paths; coordinator notified. Final integrated typecheck belongs to coordinator.
- `git diff --check` — exit 0. Read full owned source diff plus new benchmark files and generated JSON. No dead code, new dependency or unrelated write identified. Experimental branch inversion in serializer caused 9 failures / 2 passes, then restored; final safe three-file suite returned 66 passes.

The benchmark artifact was generated by importing `buildCostBenchmark` under `tsx --input-type=module` and writing only the named JSON output. It makes mock HTTP calls only. Default API tests were intentionally excluded by explicit no-env/no-DB authority. Broader browser/Gate C qualification and independent final review are coordinator responsibilities; this report grants no release readiness.

Coordinator closure: subsequent integrated API typecheck, full API lint and API build each exited 0 after the Gate C fixes. The final combined Node suite passed106/106; broad safe API375/Web936 passed. Independent review found no remaining Critical/Important/P2 in the final implementation. Official pricing/quota provenance remains the dated read-only account observation in `beginner-r12b-provider-cost-analysis.md`; it is not a new authenticated billing or endpoint privacy attestation. Live starts/spend remain0. Local implementation commit:2c975f8.
