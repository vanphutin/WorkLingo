# R1.2b qualification preapproval audit — 2026-10-27

Request: prepare independent A audio, B human pedagogy and C timed-rehearsal scopes after OFFLINE_AUTHORING_COMPLETE. Authority now is read-only audit plus planning/register capture only. Later user message says willing to grant DB/.env access if needed; neither is necessary or accessed. No audio generation, upload, TTS/provider call, source edit, human trial, database operation or lifecycle change to existing mandates.

## Verified baseline and bounded reads

Worktree `C:/Users/ASUS/.codex/worktrees/vocabulary-master-library/WorkLingo`, branch `codex/foundation-basic-readiness`, initial clean HEAD `1673f2ca28266f001e7d1d14514976df8b91d628`. Six offline-authoring commits are ancestors. Dossier/verification report remain NOT_READY/implementing, with prior52 passing tests reported historically; this planning task does not rerun or reclassify those as media/human evidence.

Read all eight authored UTF-8 sources locally with structural extraction; inspected all24 scripts, bindings/line evidence, instruction/practice support, response tasks/rubrics and source hashes. Retain [exact inventory](../../docs/qualification/beginner-pilot-audio-inventory.json), not a second authored source. Read MG01/MG02 Knowledge Map, existing R1.2b implementation/authoring plans and relevant architecture/decision boundaries. No PDF, vocabulary DB, learner records, credentials or.env was read.

Observed contracts:

- `packages/content-format/src/audio-narration.ts:7` uses spokenText override only when configured; fingerprint includes rendition metadata when present. No override exists in the24 authored scripts.
- `apps/api/src/content-authoring/application/content-publisher.service.ts:182` demands distinct selected artifact IDs per script, correct import/slug/READY/scriptHash; it rechecks under transaction locks. Offline filenames are not sufficient to publish, and no UUID is invented.
- `apps/api/src/content-authoring/application/audio-generation.handler.ts:1` imports Prisma/jobs/storage and writes artifacts. Reusing this handler would violate a no-DB audio scope; the proposed A tool is offline and separate.
- `apps/api/src/ai-gateway/infrastructure/microsoft-tts.adapter.ts:1` emits WAV24000Hz/16-bit/mono; `azure-dialogue-ssml.ts:57` escapes script text inside voice tags, without a general rate/phoneme passthrough. Proposed offline SSML settings are not claims about current product support.
- `apps/api/src/storage/infrastructure/local-object-storage.adapter.ts:1` writes generated keys under its configured root. That production adapter/root is not used by A/B/C.
- `docs/ARCHITECTURE.md:169` binds published media to exact historical LessonVersion. No asset replacement or latest fallback is proposed.

24 distinct monologue scripts;1019 plain characters/223 whitespace-delimited words; no existing verified audio. Each of the24 listening activities has one local script binding. Contract justifies24 final selected WAVs, at most72 takes under proposed cap; no24 extra delivery copies or extra video/model audio. Live teacher pronunciation demonstration remains an explicit support dependency. All eight source SHA-256 values match the existing dossier. Candidate media hashes remain null until bytes exist.

Read-only tool inventory found `C:/ffmpeg/bin/ffmpeg.exe` and `ffprobe.exe`. Proposed private qualification root `C:/Users/ASUS/AppData/Local/WorkLingo/qualification/r12b-20261027` does not exist; it was not created. Executable hashes are frozen in scopes; runtime ACL/reparse/owner verification remains NOT_RUN until relevant approval. No OS change is proposed.

## New findings / decisions still open

1. Actual TTS pipeline requires DB; choose offline local production without invoking it. Later binding/import/preview requires separate identity-bound authority and existing runtime guards.
2. Current escaped SSML cannot honor arbitrary injected markup. Offline controls must be explicit and recorded; no source spoken_text change or product patch is authorized by A.
3. Names/places and letter-name rendering require a real teacher; a single narration default cannot prove correctness. Candidate voice Jenny/AmE and eastus are proposals, not selected account configuration.
4. Very short content likely risks under-duration:223 words across all assessment audio. Proposed35–50 active-minute acceptance and n=3 are awaiting owner approval, not measured suitability. Pilot may stop after under-duration is observed.
5. Canonical rehearsal asks Admin preview. Offline pack is a proposed content-only method deviation that must be explicitly accepted in C approval, otherwise C is BLOCKED pending an environment amendment. No R1.2a verification or runtime equivalence assumed.
6. Human review has no concrete correction request yet. B writes exact-diff requests but has zero source modifications; any repair requires matching amendment and A/B/C invalidation by changed hashes.

## Provider research and budget basis

Primary public sources inspected2026-10-27: [Azure pricing](https://azure.microsoft.com/en-us/pricing/details/speech/), [Microsoft Product Terms](https://www.microsoft.com/licensing/terms/en-US/productoffering/MicrosoftAzure/allprograms), [voice catalog](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts), [SSML](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/speech-synthesis-markup). General terms mention paid-tier commercial prebuilt output rights; actual owner's subscription/terms/input rights still need confirmation. Dynamic pricing contains placeholders, so no current numeric price is asserted. CapUSD1 pilot /USD5 inclusive total and exampleUSD30/M are proposed ceiling/sensitivity only. No paid endpoint was called. Human narration and compensated reviewer/volunteer work require actual quotes; no engagement is authorized.

## Planning verification and limits

Before handoff: verify inventory totals/bindings/hashes, protected baseline/frozen documents, exact path lists, plan links, CLI proposal hashes and register validation; independent read-only builder check; final Git diff. These prove preapproval consistency only. A/B/C implementation tests, audio signal/listening QA, teacher appointment/sign-off and actual timing are NOT_RUN. No gate READY flag is advanced. Existing parent/R1.2a/R1.2b states stay unchanged. Separate child proposals follow the frozen implementing author's scope instead of editing it.

Master plan: [qualification plan](../../docs/superpowers/plans/2026-10-27-beginner-r12b-qualification.md). All three child scopes must remain independent with matching approval; master plan or A approval cannot authorize B/C.

Independent builder check (Planck, read-only) raised two material questions before freezing. Addressed in plan: teacher-added explanation/demonstration is excluded from qualifying time, B freezes ≤60s demonstration outline, ≤2min clarification also excluded; concept teaching during assessment prevents passing. Individual timings/codes stay in private C JSON, Git contains aggregates only; withdrawal rows removed within7 days and other retention has cancellation/decision/90-day maximum deadlines. These are explicit proposals for owner approval, not human acceptance or a trial result. No second reviewer or product change required.
