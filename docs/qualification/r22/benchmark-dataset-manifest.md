# R2.2 benchmark dataset manifest

Status: IMPLEMENTED synthetic seed dataset; TESTED reference-schema admission. AI_QUALIFIED: NOT_RUN. HUMAN_VALIDATED: NOT_RUN.

Version: `r22-benchmark/1`. Files: `content/assessment/r22/sources.v1.json`, `cases.v1.jsonl`, `references.v1.jsonl`.

There are 50 cases: Reading 11, Listening 11, Writing 11, Speaking 17. The source is an explicitly authored synthetic meeting message. Source-backed means each expected fact can be traced to this included message; it does not mean externally validated research or human participant evidence. Simple language is used without claiming a validated CEFR classification or publishing new curriculum. Published WorkLingo content coverage must be established separately before qualification.

Each text skill covers correct facts, paraphrases, grammatical mistakes with preserved meaning, critical factual errors, partial/short answers, contradiction, prompt injection, ambiguous wording, unnecessary length, an anchor and malformed/empty responses. Level ranges represent authored acceptable bands. Writing language dimensions require separate task-specific references before full rubric qualification; the seed currently supplies meaning ranges only.

Speaking includes equivalent textual scenarios plus planned clean/noisy/silent/corrupt and Vietnamese/regional English audio scenarios. Every audio artifact and checksum is null with NOT_RECORDED provenance. No tone, invented recording, transcript, alignment or scenario label is acoustic ground truth. Speaking acceptance and criterion levels remain null/empty until actual secure audio, acoustic evidence and independently adjudicated references exist. Listening cases are textual benchmark specifications: playback assets and their exact hashes must be supplied before actual Listening qualification.

Reference provenance is separate from candidate outputs. Supported kinds are deterministic_answer_key, source_backed_authored, synthetic_authored, ai_adjudicated and human_verified. No supplied case claims AI consensus or human verification. AI-adjudicated admission requires separate primary, verifier and adjudicator decision artifacts, model identities, request IDs and SHA-256 artifacts. Human verification requires a recorded human review artifact; the schema can check existence of metadata, not authenticity of the review.

Run JSONL rows use benchmarkRunSchema in assessment-benchmark.ts: unique runId, known caseId, accepted boolean/null, raw structured verdict, actual provider/model/family/synthetic metadata, nullable measured latency/tokens/cost, nullable confidence probability and independently observed leakage/rubric/injection/disagreement labels. Null means unmeasured, never success. Invalid verdicts count in schema failures and do not enter scored criterion metrics. Missing/duplicate/unscored dimensions do not become numeric observations; coverage must be inspected with every metric.

Candidate generation must remain separate from reference authoring/adjudication. Do not generate a candidate verdict from these expected levels and report the resulting agreement as model evidence. The CLI self-test uses one independent plumbing fixture and does not evaluate this dataset.

CLI (from repository root):

```powershell
pnpm --filter @worklingo/api exec tsx scripts/assessment-benchmark.ts --self-test
pnpm --filter @worklingo/api exec tsx scripts/assessment-benchmark.ts --runs C:/absolute/recorded-runs.jsonl --output C:/absolute/new-report.json
```

The CLI has no provider calls, environment-file loading or database client. Output files use exclusive creation; existing failure reports cannot be overwritten. Preserve datasets and old reports when revising prompts/models. Repeated anchor measurements share case identity but use distinct run IDs.
