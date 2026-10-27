# Gate A — Existing Azure Speech Free resource alignment

**PREAPPROVAL ONLY · MND-20261027-002 · 2026-10-27.** This addendum revises Gate A documents in response to the owner's explicit request. It does not approve production, change the Azure resource or authorize a provider call.

## Authority and precedence

For Gate A, read this addendum and the current [A scope](../../../mandate/reports/2026-10-27-beginner-r12b-gate-a-scope.json) before the [original master plan](2026-10-27-beginner-r12b-qualification.md). The shared master remains the historical preapproval baseline frozen by B/C; only its A paid-tier/eastus/positive-spend/tariff assumptions and references to paid takes are superseded here. All other tasks, tools, artifact contract, counts, media/QA/storage boundaries and rollback remain unchanged. Gate B and C scope files, proposals and hashes remain untouched. No earlier hash authorizes the revised A scope.

The owner's request authorizes documentation alignment only. Record the changed proposal through Mandate CLI update→triaged; keep approval=null. Parent, offline-authoring and R1.2a lifecycles remain unchanged. Do not use a clarification about Azure for Students as execution approval.

## Observed resource versus subscription

The owner-provided Portal screenshot in this conversation shows API Kind `SpeechServices`, Pricing tier `Free`, and endpoint `https://eastasia.api.cognitive.microsoft.com/`. This corresponds to the Speech Free/F0 resource tier, with East Asia inferred from its regional endpoint. Portal context identifies resource `video-sub-ai`; its key association has not been checked. The owner reports Azure for Students and educational/personal learning use; subscription/student eligibility was not independently inspected. No tenant/subscription identifier, key, credential or account private content is copied here.

Azure for Students is a subscription/benefit context; F0 is the current Speech resource SKU. This plan preserves both. It requests no downgrade, upgrade, new resource, billing-setting change or consumption of S0 student credits.

## Revised execution proposal

| Field | Gate A proposal after alignment |
|---|---|
| Resource kind / tier | Existing `SpeechServices` / `Free (F0)` only |
| Purpose | Private educational qualification candidates for this student project; no commercial production/release claim |
| Region | `eastasia` (East Asia) |
| Synthesis URL | `https://eastasia.tts.speech.microsoft.com/cognitiveservices/v1` |
| Voice | `en-US-JennyNeural`, still proposed, subject to availability/real pronunciation QA in East Asia |
| Spend | USD0 pilot and USD0 inclusive total; no paid/S0 fallback, upgrade, top-up or credit-funded replacement |
| Call/character limits | Pilot ≤9 calls/1000 counted characters; inclusive ≤72 calls/10000 counted characters; ≤3 takes/script, counting failed requests/retries |
| Request scheduling | One in flight; ≥10 seconds between request starts; at most6 starts in any rolling60 seconds; shared resource usage may reduce available capacity |
| Quota response | On429/quota exhaustion or uncertain free status, stop and report; no automatic retry/provider/tier switch |

Microsoft lists the regional synthesis URL in the [Speech REST reference](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/rest-text-to-speech). This is the TTS URL for the same region, not a change to the generic endpoint displayed in Portal. The [quota documentation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-services-quotas-and-limits) lists F0 real-time TTS at20 transactions/60 seconds and no batch synthesis. Use the real-time endpoint only. The [pricing page](https://azure.microsoft.com/en-us/pricing/details/speech/) lists500000 free neural characters/month; remaining quota and other usage on this actual resource are unknown. The internal10000-character ceiling is deliberately smaller and does not assert10000 characters are currently available. SSML optional pronunciation content can affect counted characters; keep exact request/count receipts.

The [Azure for Students page](https://azure.microsoft.com/en-us/free/students/) describes student benefits; a student subscription does not change the observed resource SKU. General [Product Terms](https://www.microsoft.com/licensing/terms/en-US/productoffering/MicrosoftAzure/allprograms) discuss paid-tier prebuilt output rights. This educational scope does not treat those commercial rights as already granted to F0, nor assert that student status by itself settles every output-use term. Before any future call, record the applicable educational-service/input/output-use basis for the limited private QA purpose. No commercial publication, redistribution or blanket production rights are requested. An unresolved applicable-use restriction is reported, not bypassed by changing the tier.

## Zero-spend preflight and unchanged limits

- Verify matching new A approval/hash, exact allowlist, source/script fingerprints, root ownership/ACL/reparse boundaries, and the existing resource's Free/F0 identity. Owner confirms that the process-only credential belongs to the observed existing Free resource; no key lookup/env read is added. Screenshot is evidence of displayed tier, not authentication of a future credential.
- Require a recent actual Free/F0/quota confirmation and applicable educational-use evidence. Save evidence only in the already allowlisted private `A/rights-and-tariff.json` (legacy filename retained to avoid expanding paths); it records no tariff as zero-cost quota use, not a paid quote. Do not manufacture remaining quota from the monthly headline allowance. Unknowns remain unknown and can block calls.
- Use `WL_QUAL_AZURE_KEY` only if a later execution approval permits its use; never read.env, print the key or send it anywhere except the exact allowlisted HTTPS synthesis endpoint. No account login, Azure management action, resource discovery or credential retrieval is granted by this addendum.
- USD0 covers provider spend only; no paid hiring/recording or student-credit/S0 consumption. Free quota failure stops the run. Any nonzero expected charge or F0/S0 uncertainty is fail-closed; do not assume a student credit makes paid usage equivalent to F0.
- TDD requirements for the two already proposed offline tool files additionally include `f0_eastasia_only`, `nonzero_spend_or_paid_fallback_denied`, `quota_exhaustion_stops_without_retry`, `one_inflight_and_rolling_rate_limit`, `wrong_resource_or_missing_educational_use_evidence_denied`; existing redaction/hash/path/idempotency/WAV tests remain. These are future requirements, not newly created code or executed tests.
- MG01-L1 first:3 actual selected audio files and actual human sound/pronunciation QA before expanding to the other21. File count,72-take maximum, actual SHA-256, immutable candidate selection, storage root, private manifests and preservation/rollback remain as in the master. No new media path or resource ID is authorized. Pronunciation/teacher decisions remain open.
- No DB/.env/API/import/publication, product/config/schema edits, human pedagogy sign-off, learner rehearsal/enrollment, OS/security changes, merge/push/deploy. The owner's willingness to grant DB access is not needed here. All candidate/readiness flags remain unchanged until separately approved operations and actual evidence.

## Baseline and handoff

Revised A documents use source baseline HEAD `a168d487066e7681a8c64dce1480a05a595c87af`, an ancestor of the eventual documentation commit. Existing26 protected content/product/document hashes and the exact future source/media allowlist remain identical. Original master/review/inventory hashes remain frozen; this addendum is an additional frozen artifact and the new A plan_reference. B/C artifacts and their hashes remain byte-identical. Validate all scopes/proposal bindings/register and review the document diff before local commit. No tests needing real media, DB, providers or people are run for this documentation change.

Acceptance for this documentation task: resource/tier/purpose/region/endpoint/USD0 and no-fallback policy agree across A scope/proposal/handoff; no claim of changing Azure; new matching proposal hash recorded with approval=null; all existing readiness/lifecycle boundaries preserved. The next action is human review of this revised A proposal, not an implicit start of audio generation.
