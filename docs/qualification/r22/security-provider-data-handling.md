# R2.2 provider data handling

Research date: 2026-11-07. Status: public-policy and source inspection; no security certification and no live learner or synthetic inference transmission in this research.

## Existing outbound data boundary

The OpenAI-compatible adapter serializes activity type, learner response, level, prompt, reference text, required phrases, rubric identity/version and optional pinned beginner context. It supplies no audio in this path. These fields may contain private assessment material or learner text; untrusted markers are a prompt boundary, not anonymization. The adapter uses a configured base URL and bearer key, Responses structured output and `store:false`. Endpoint operator must be established independently; compatibility is not an OpenAI privacy guarantee.

Microsoft speech sends audio, reference text and locale, with its key in the subscription-key header and reference/configuration in the base64 pronunciation header. Base64 is encoding, not encryption. TLS protects transit; do not log headers, raw audio, prompts, answer keys, unredacted provider bodies or credentials. Existing environment variable names are documented in the companion comparison; no secret values were read or copied.

## Official provider policy evidence

The fetched [OpenAI API data-controls page](https://developers.openai.com/api/docs/guides/your-data) says API data is not used for model training unless the customer explicitly opts in. Default abuse-monitoring logs can include customer content and are retained for up to 30 days, with stated legal/safety exceptions. Modified abuse monitoring and zero data retention require eligibility and approval. `store:false` does not establish zero retention, approved residency, or exclusion from abuse monitoring. Account-specific opt-ins, retention approval and region have not been verified.

Microsoft's fetched [speech-to-text data privacy and security page](https://learn.microsoft.com/en-us/azure/ai-foundry/responsible-ai/speech-service/speech-to-text/data-privacy-security) states real-time speech input is processed in server memory, not stored at rest, with encrypted transit. Its no-data-trace section explicitly includes real-time STT, fast transcription, pronunciation assessment and speech translation: Microsoft does not retain or store customer-provided data for those paths. Batch transcription has different storage handling. This finding applies to the documented service path; it does not establish local application storage behavior, the configured account, residency or an intermediary proxy's practices. The earlier ai-services privacy URL did not resolve; the cited ai-foundry page was successfully fetched.

Discovery's exact endpoint retention, logging, training usage and deletion terms remain unestablished by the inspected evidence. Historical qualification artifacts explicitly retain this blocker. Keep sensitive-data processing disabled for an operator whose policy cannot be established; a large historical quota does not resolve privacy.

## Required operational controls

Use synthetic fictional content for engineering calibration; no production learner data is needed. Keep provider keys process-only or in existing authorized secret storage. Preserve existing permission boundaries and avoid copying `.env` values into reports. Allow only the intended HTTPS host/path; reject redirects and unexpected model/provider fallback. Enforce timeouts, body bounds, rate/request/token reservations and cancellation. Stop on unknown billable usage, ambiguous completion or quota uncertainty rather than auto-retrying across providers. Retain only minimal sanitized provider metadata in normal audit history and restrict any separately authorized diagnostic artifact.

Pronunciation evidence must remain traceable to actual audio and explicit returned dimensions. Text semantics cannot fill missing acoustic evidence. Do not claim consent, human validation, zero retention, expert review or learner observations from synthetic results. Version prompts, rubrics and context hashes without placing private content in broad logs.

## Remaining unknowns and live-run boundary

Current provider configuration, account quota, billing tariff/service mode, opt-ins, organization-specific retention controls, regional processing, proxy behavior and deployment model identity were not read or verified. A public price and historical approval are insufficient to conclude a new run is free or private. Before any actual calibration, the executor must establish existing allowance and exact endpoint privacy, bound spend without purchase or limit changes, capture actual safe metadata and explicitly label all results synthetic. This research made zero provider inference requests and makes no readiness claim.

## Assessment operations metadata and feedback isolation

CONTENT_ADMIN can inspect GET /admin/assessment-providers. Reading the endpoint returns configured capabilities and process-local health snapshots without probing a provider. It reveals no API keys, base URLs, learner IDs, prompt/response bodies or raw upstream messages. Recent health is capped at 20 safe records; totals count invocations rather than billable requests. These transient observations do not authorize sensitive-data processing or establish privacy, quota, uptime or assessment quality.

Semantic evaluation uses primary, verifier and a separate stateless learner-feedback request. The feedback serializer receives only submitted response, public rubric and level; private task context, hidden answers and reference sources are withheld. The wired disagreement adjudicator can add a fourth call. Provider cost remains null when unknown; health counters must not be relabeled token usage or financial evidence. Root integration tests exercise admin authorization and no-probe behavior against localhost fixtures; they do not constitute live-provider qualification.
