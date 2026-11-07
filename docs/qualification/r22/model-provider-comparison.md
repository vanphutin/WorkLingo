# R2.2 model and provider comparison

Research date: 2026-11-07. Repository inspection and public documentation only; no credentials read, account changes, inference requests or spending. This is engineering selection evidence, not measured model quality or learner validation.

## Existing integration evidence

| Provider/model | Repository evidence | Suitable responsibility | Limits |
|---|---|---|---|
| Discovery / `qwen3.8-27b` | Default in `apps/api/src/common/config/app-config.schema.ts`; configured through `DISCOVERY_API_KEY`, `DISCOVERY_BASE_URL`, `DISCOVERY_MODEL` | Semantic evaluation behind existing adapter | Historical pricing-unit conflict and exact endpoint privacy remain unresolved; current account quota unknown |
| OpenAI / configurable | `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` must be supplied together; no default model. Historical `docs/intermediate-ai-lessons.md` records a gpt-4o-mini HTTP 200 experiment | Text semantics, Vietnamese feedback, strict structured output through Responses | Historical success does not establish current configured model, credit balance, access, latency or calibration |
| Microsoft Speech | `MICROSOFT_SPEECH_KEY`, `MICROSOFT_SPEECH_REGION`, `MICROSOFT_SPEECH_LANGUAGE`; STT provider switch `WORKLINGO_STT_PROVIDER` | Audio-derived transcription and pronunciation evidence | Actual adapter exposes only a subset of provider capabilities |
| Local Qwen3-0.6B-Q8_0 | Historical separate synthetic experiment in beginner provider-options artifact | Offline engineering comparator | Small local-model results cannot establish remote-provider qualification or production quality |

Other routing controls include `AI_ROUTING_ENABLED`, `AI_DEFAULT_PROVIDER`, `AI_FALLBACK_ENABLED`, `AI_MAX_OUTPUT_TOKENS`, `PROVIDER_TIMEOUT_MS` and `PROVIDER_MAX_ATTEMPTS`. No environment values were inspected. An OpenAI-compatible base URL does not establish that the operator is OpenAI; validate the actual destination before applying OpenAI policy or tariff.

## Official source findings

The fetched [gpt-4o-mini model page](https://developers.openai.com/api/docs/models/gpt-4o-mini) supports Responses and structured output, text output, text/image input and explicitly no audio support. Its displayed text rates are USD 0.15 input, USD 0.075 cached input and USD 0.60 output per million tokens. Confirm the selected service mode before budgeting; the flattened page also contains a Batch selector. A purely illustrative uncached 2,000-input/500-output text evaluation at these displayed rates is USD 0.0006, excluding retries, verification calls, speech and other services. This is arithmetic, not observed billing. No newer model substitution is required merely for novelty.

[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) documents constrained schema output. The existing adapter already uses Responses `text.format` with `json_schema`, strict mode, local Zod validation, refusal handling and `store:false`. Schema validity does not prove correct assessment, evidence grounding or calibration. Existing serializer explicitly tells the language model not to emit pronunciation or aggregate scores. Text transcripts cannot justify phoneme, stress or intonation judgments.

Microsoft's fetched [pronunciation assessment documentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment) describes phoneme/word/full-text granularity, accuracy, fluency, completeness and optional prosody. Prosody addresses stress, intonation, speaking speed and rhythm, requires enabling it, and is available for en-US. Baseline pronunciation pricing follows standard speech-to-text; feature-specific charges must be considered.

The fetched [Azure Speech pricing page](https://azure.microsoft.com/en-us/pricing/details/speech/) lists Free F0 standard real-time transcription at five audio hours per month, shared with custom real-time transcription. It separately lists pronunciation prosody as an enhanced feature. Paid numeric cells rendered as `$-`; no paid hourly rate is asserted here. Published free allowance is not proof of this account's remaining allowance, eligible pronunciation features or current resource tier.

## Actual Microsoft adapter boundary

`apps/api/src/ai-gateway/infrastructure/microsoft-speech.adapter.ts` sends reference text, audio bytes and locale to regional short-audio REST recognition with detailed output, HundredMark, Phoneme granularity, Comprehensive dimension and miscue enabled. The R2.2 extension retains aggregate scores and nested word/phoneme/syllable timing, optional accuracy and error types, bound to the submitted audio checksum. The handler preserves these in assessmentEvidence with measured PCM duration; synthetic or locally unvalidated evidence stays unverified. Intelligibility, stress and intonation remain explicitly unassessed. No explicit prosody opt-in is sent. An optional ProsodyScore parser does not establish a working prosody feature. Do not infer a zero score from absent evidence; return unavailable/abstain for unsupported dimensions. Speaking content semantics may use the transcript; acoustic dimensions must use genuinely retained audio-derived evidence.

## Authorization and calibration decision

The R2.2 mission authorizes synthetic engineering and provider research, prefers existing quota, and prohibits buying credits, topups or increasing limits. Historical `beginner-r12b-provider-options.json` records additional USD zero, 1.5 InkPoints and remoteInferenceAuthorized false for that earlier scope. `beginner-r12b-cost-accounting-final.json` records an October 30 Discovery balance observation but a pricing-unit conflict, unverified billing and blocked budget reservations. These are historical scope-specific facts, not a fresh balance or reusable permission receipt. Historical Azure F0 owner evidence relates to synthesis, not verified current pronunciation quota.

Recommendation: reuse the existing semantic and speech abstractions; implement offline synthetic contracts first. A small actual synthetic calibration is conditional on verifying the exact endpoint/operator, current existing account allowance, applicable tariff, privacy and bounded request accounting. Current inspected evidence does not establish those conditions, so this research does not authorize or perform a live run. Never silently fall back to a paid provider. Record requested and observed model separately, actual input/output usage, request starts/failures, cost currency/unit and unavailable metadata explicitly; do not convert byte estimates into observed tokens.

## Source access and uncertainty

Official pages above were fetched on 2026-11-07. Official OpenAI web search was attempted but the exposed search tool returned unavailable; public HTTPS pages were used. Official [pricing](https://developers.openai.com/api/docs/pricing) was also fetched. No account console, credential, billing API or provider inference endpoint was accessed. No accuracy, latency, scoring agreement, current deployment identity or provider availability was measured.

## Implemented capability and health visibility

The existing LanguageEvaluationPort exposes optional getAssessmentCapabilities/getAssessmentHealth; direct OpenAI/Discovery and the routing adapter implement them. No second registry or provider probe is introduced. Capabilities report identitySource CONFIGURATION and configuredModel; these are deployment settings, not an observed model snapshot or verified account access. All four semantic skill routes are described, with no acoustic dimensions. OpenAI reports STRICT_SCHEMA_REQUESTED; Discovery reports PROMPT_JSON_VALIDATED, rather than claiming enforced JSON schema. Routing describes primary/preferred, verifier/alternate and feedback/preferred role selection with no silent assessment fallback.

Health is process-local per adapter instance: invocation attempts/successes/failures and the last 20 timestamp/latency/outcome/safe-error-code observations. UNOBSERVED means no invocation; HEALTHY means the last invocation succeeded, not provider SLA or calibrated accuracy. DEGRADED means the last invocation failed. Counters include aborted/unavailable invocations and are not billing or outbound-request counts. Restart clears them. Unknown actual model, usage or cost stays null in result metadata.

## Cost per complete semantic assessment

A semantic assessment normally makes three calls: primary scoring, verifier scoring and a separate learner-feedback call. The feedback call omits private sources, hidden answers and private task criteria. Current history orchestration wires a separate adjudicator role on disagreement; budget up to four calls. Objective answer verification makes zero AI calls. Speech recognition/assessment, failed calls and explicit reruns are separate accounting items; no automatic cheaper provider fallback is used for assessment roles.

The USD 0.0006 example above describes one illustrative text call. Three identical-size calls would total USD 0.0018, or USD 0.0024 for four, solely under that same hypothetical rate/token assumption. Actual roles have different payloads and may use different providers; these figures are not measured application cost. Do not set costUsd from an estimate; it remains null until genuine usage and a verified applicable tariff establish it. No current allowance or spending authority is inferred from these examples.
