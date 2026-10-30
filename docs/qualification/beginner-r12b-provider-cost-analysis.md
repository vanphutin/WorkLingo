# Beginner R1.2b offline provider cost analysis

MND-20261030-001; mission WL-R12B-AUTONOMOUS-001; baseline 5b554e9cdce98daf11236265f38d8bec73f36b5e; measured 2026-10-30T01:20:55.311Z.

Decision: BLOCKED_DO_NOT_CALL_PROVIDER. One unchanged2048-token output reservation costs5.5296InkPoints at2700/million,above the entire1.5cap before input. This proves the existing reservation is infeasible; it is not measured spend or a universal lower bound for changed output limits.

|Phase|Starts|HTTP UTF8 bytes|Overhead reservation|Input reservation|Output reservation|Total InkPoints800/2700|
|---|---:|---:|---:|---:|---:|---:|
|pilot|20|57534|10240|67774|40960|164.8112|
|remainder|140|413599|71680|485279|286720|1162.3672|
|all|160|471133|81920|553053|327680|1327.1784|

Full160: input payload376.9064 + overhead65.536 + output884.736 =1327.1784. Pilot20: payload46.0272 + overhead8.192 + output110.592 =164.8112. Prior1404.736 uses the full650000input cap. Companion JSON separates every component and all160request hashes. All32anchors/negative cases remain intact.

Bytes are measured,tokens are not. Existing bytes+512 is conservative engineering reservation,not authenticated qwen tokenizer bounds.512overhead is assumed. HTTP framing/escaping is counted although billing ordinarily tokenizes chat contents. No guessed bytes-per-token ratio or cache discount is used; exact usage remains null.

Pricing is historical official UI observation recorded in docs/qualification/beginner-pilot-qualification-engineering.md:164-175,not reverified by this agent. Official reference: https://discovery.intern-ai.org.cn/token-plan/home?tabIndex=3&dockey=04-model-limits-and-pricing.md. Historical report records a divisor1000/per-million/example1e6 inconsistency; no cheaper interpretation permits calls. Current authenticated pricing/quota and exact endpoint retention/logging/training/deletion remain external requirements.

Coordinator supplement,2026-10-30 approximately08:29–08:32 Asia/Saigon: actual read-only official Discovery UI inspection again showed qwen3.8-27b cache100/input800/output2700 InkPoints per million,with the same inconsistent formula divisor1000 versus per-million label/example1e6. The points page showed9835.673 balance,10000 monthly platform grant,rolling5h10000/10000 and7day50000/50000,used0. These displayed limits/balance are observations,not authenticated runtime usage or entitlement attestations. Sources: the pricing URL above,https://discovery.intern-ai.org.cn/token-plan/points and https://discovery.intern-ai.org.cn/docs/. Help Center privacy search did not yield the exact endpoint's retention/logging/training/deletion contract;those remain UNVERIFIED. The companion JSON retains the generating agent's historical provenance;this dated supplement records the later coordinator observation separately. No key/cookie read,API call,account setting change or generation occurred;temporary research tabs were closed.

Method: buildGoldens then offlineAdapterProbe for every schedule row; actual EvaluationService,pinned snapshot and Discovery serializer with mock DB/intercept-only fetch. Buffer.byteLength of actual body; add512input/2048output each. Network/provider starts,credential reads and DB connections:0. No provider results or spend produced.

Metadata-only offline simulation removes empty referenceText/requiredPhrases,levelCode,context schema/UUID/activity identifiers and card slugs. It preserves exact prompt,response/injection text,roleCard text,private criteria/acceptable alternatives,system schema/safety,rubric/XML safeguards. User-content savings44080bytes; minimized wholeHTTP totals/costs are in JSON. Semantic facts duplicated between cards/private criteria remain. Traceability/contracts rely on identity fields,so production changes need review/tests. Simulation was not applied and cannot solve the budget cap.

Oracle companion emits128 AI_PROPOSED_NOT_ADJUDICATED rows with source/bundle/criteria/case hashes,facts,exact private criteria,authored alternatives,rejections,injection rules,rationale/confidence/evidence. Human identity/decisions/signature remain null; scalar bounds,feedback/full rubric and speaking phonetics retain NEEDS_HUMAN. No pronunciation judgment is inferred from transcripts. MG02-L4-W1 source requires greeting but frozen regex unit set omits it; all8fixtures greet. Reported without rewriting frozen oracle or approved thresholds.

Reproduction: pnpm --filter @worklingo/api exec tsx with an ad-hoc stdin module importing buildGoldens/offlineAdapterProbe; iterate schedule,lookup case,probe,measure p.bodies[0],group phases and apply stated arithmetic. Existing CLI preflight is unnecessary and could rewrite artifacts.

SKILL AUDIT
Used: mandate-steward -> scoped evidence/AI-human separation; verification-before-completion -> source/count/hash checks.
Verification: generation asserts160observations,20pilot,128unique proposals and frozen golden/results hashes unchanged. Semantic minimization equality checked per request.
Not used: TDD/framework/runtime skills; only three reports generated,no behavior/test/source changes.
