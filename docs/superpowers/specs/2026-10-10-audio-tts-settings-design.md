# Audio Playback, TTS Providers, and Settings Design

**Date:** 2026-10-10  
**Status:** Approved direction; implementation pending  
**Scope:** Repair Admin and Learner audio, prefer Azure Speech when configured, provide a zero-credential browser fallback, and add extensible audio settings.

## 1. Problem

WorkLingo currently treats a structurally valid WAV file as usable lesson speech. In local mode, `fake-tts` generates a deterministic tone rather than spoken English. Admin preview and Learner playback consume the same artifact lifecycle, so both surfaces can present audio that is technically playable but not useful for learning.

The streaming endpoints also advertise byte-range support without implementing `Range` responses. This is unreliable across browser media implementations and makes failures difficult to distinguish from missing artifacts or provider errors.

The repository already has a Microsoft/Azure Speech REST adapter, but the current local configuration selects `fake` and has no Azure credentials. Existing tests validate WAV structure and endpoint ownership, not intelligible speech, provider readiness, browser fallback, or real media range behavior.

## 2. Goals

1. Admin can hear a spoken preview for every audio script, even in local development without cloud credentials.
2. Admin can generate canonical Azure Speech audio when Azure is configured.
3. Learners can choose a durable playback source from Settings.
4. Learner playback remains usable when canonical audio is missing, corrupt, or temporarily unavailable.
5. Provider credentials remain server-only and never enter API responses, browser storage, logs, or the database.
6. Provider and voice choices are represented by stable IDs so additional providers can be added without redesigning the Settings UI.
7. Published lesson-version bindings remain immutable.

## 3. Non-goals

- User-supplied Azure, Google, or OpenAI API keys.
- Generating a separate stored audio artifact for every learner.
- Replacing the existing lesson-version audio lifecycle.
- Offline browser speech synchronization between devices.
- Claiming that Azure's free allowance is unlimited or guaranteed.
- Adding unofficial or reverse-engineered free TTS services.

## 4. Product Decisions

### 4.1 Playback sources

The learner-facing source IDs are:

| Source ID | Meaning |
|---|---|
| `system-default` | Prefer canonical published audio, then fall back to browser TTS |
| `published-audio` | Play the immutable artifact bound to the session's lesson version |
| `browser-tts` | Read the learner-safe transcript with the browser Speech Synthesis API |

The database stores source IDs as strings validated by the current contract rather than as a PostgreSQL enum. This keeps persistence forward-compatible while the API remains fail-closed for unknown IDs.

`system-default` is the default for existing and new learners. If `published-audio` is explicitly selected and playback fails, the UI offers a deliberate “Use browser voice” recovery action; it does not silently change the saved preference.

### 4.2 Server TTS providers

The server provider IDs initially are:

| Provider ID | Purpose |
|---|---|
| `azure-speech` | Preferred release-quality server TTS when credentials are configured |
| `fake-tts` | Deterministic pipeline/test artifact only |

`browser-tts` is not a server provider and never enters the generation job queue. It is a playback capability implemented in the web application.

Azure credentials remain in environment configuration. Non-secret defaults, such as the selected provider ID and default Azure voice ID, may be stored in system audio settings. Selecting an unavailable provider is rejected safely.

Azure F0 currently advertises a limited monthly neural TTS allowance. WorkLingo treats that as an external quota, not a product guarantee, and exposes provider unavailability/rate limiting without leaking provider responses.

### 4.3 Local-first behavior

- Browser TTS is the useful zero-credential spoken preview and learner fallback.
- Fake TTS remains available to deterministic tests and local content-pipeline rehearsal.
- Fake artifacts retain the existing simulation label and are never presented as release-quality speech.
- Configuring Azure upgrades future generation; it does not rewrite already published lesson versions.

## 5. Architecture

### 5.1 Provider registry

Replace direct injection of one `TextToSpeechPort` into generation code with a `TextToSpeechProviderRegistry`.

The registry:

- owns adapters keyed by stable provider ID;
- exposes only safe capability metadata (`id`, display name, availability, supported locale, default voice);
- resolves a provider for a generation job;
- rejects unknown or unavailable providers with stable safe errors;
- never serializes credentials or raw provider errors.

The existing Azure and fake adapters continue implementing `TextToSpeechPort`. Generation jobs snapshot `providerId`, `voiceId`, and a server-generated artifact candidate ID when enqueued so changing the system default cannot change an already accepted job.

### 5.2 Canonical artifact flow

```text
Admin script
  -> browser spoken preview (no persisted artifact), or
  -> server generation request
  -> provider/voice snapshot in durable job
  -> Azure/fake adapter
  -> local object storage
  -> AudioArtifact READY
  -> publish binds artifact to immutable LessonVersion
  -> Learner session streams that exact version-bound artifact
```

An Admin browser preview never satisfies the publish requirement. Publishing still requires a READY persisted artifact. Existing fake-artifact publication remains available for local rehearsal and stays visibly marked as simulation audio.

Every generation request creates or idempotently returns an immutable candidate artifact. A READY or lesson-version-bound artifact is never reset to `GENERATING`, overwritten, or pointed at a new storage object. Regeneration creates a new candidate, and the Admin explicitly selects the READY candidate to publish. Provider failure marks only that new candidate failed, preserving every earlier READY artifact.

### 5.3 Playback resolver

The web application resolves playback from the saved learner preference:

1. `published-audio`: render the authenticated audio stream.
2. `browser-tts`: render browser speech controls for the learner-safe transcript.
3. `system-default`: try published audio and expose browser speech automatically when the media request fails.

The browser speech controller is a reusable client hook with explicit Play, Pause/Resume, and Stop operations. It cancels speech on activity change and unmount, never autoplays, selects an English voice when available, and reports unsupported browsers with transcript-only fallback.

### 5.4 HTTP audio streaming

Admin and Learner streams use one range-response helper:

- no `Range`: `200`, complete body, correct `Content-Length`;
- valid single range: `206`, `Content-Range`, bounded slice and correct length;
- invalid or unsatisfiable range: `416` and `Content-Range: bytes */<size>`;
- `Accept-Ranges: bytes` only when this behavior is active;
- `Cache-Control: private, no-store` for authenticated streams;
- `X-Content-Type-Options: nosniff`.

Owner and role authorization occurs before range processing. Multiple ranges are not supported in this slice.

## 6. Persistence

### 6.1 Learner profile

Add:

```text
audioSourceId       String  default "system-default"
browserVoiceId      String? nullable
```

`browserVoiceId` is a best-effort device voice identifier. If unavailable on another device, the client chooses the first English voice and does not corrupt the saved setting.

### 6.2 System audio settings

Add one singleton `AudioSystemSetting` row containing:

```text
id                  "default"
providerId          String
defaultVoiceId      String?
updatedById         UUID?
createdAt/updatedAt timestamps
```

No secret, endpoint credential, subscription key, or raw provider response is stored. The row controls future Admin generation only. Every update creates an audit record containing old/new provider and voice IDs.

Migration defaults preserve current behavior:

- learners receive `system-default`;
- system provider defaults to the configured environment provider;
- absence of a row is resolved from safe application configuration.

### 6.3 Immutable artifact candidates

Extend `AudioArtifact` with a stable `variantKey` derived from the canonical provider ID, voice ID, and normalized non-secret voice configuration. Replace the current uniqueness assumption with a generation identity that permits multiple immutable candidates for the same content import, script slug, and script hash.

`LessonVersionAudioArtifact` continues binding one selected artifact per script slug. Publishing receives the selected artifact IDs, validates that every candidate is READY and matches the current script hash, and then writes immutable references. Once an artifact is READY or referenced, generation code cannot update its bytes, checksum, storage key, provider, voice, or status.

Upgrade migration derives a deterministic legacy variant key for existing artifacts and preserves every existing lesson-version reference.

## 7. API Contracts

### Learner

`GET /api/v1/me/audio-settings`

Returns saved source, browser voice ID, and safe source descriptors. It contains no provider secrets.

`PATCH /api/v1/me/audio-settings`

Accepts:

```json
{
  "sourceId": "system-default",
  "browserVoiceId": null
}
```

The update is owner-scoped and rejects unknown source IDs with `422 AUDIO_SOURCE_UNSUPPORTED`.

### Admin

`GET /api/v1/admin/audio-settings`

Returns server provider capability metadata, current default provider/voice, and whether Azure is configured. “Configured” is a boolean only.

`PATCH /api/v1/admin/audio-settings`

Updates the non-secret default provider and voice. Unknown provider/voice or an unavailable provider is rejected. Existing artifacts and published versions are unchanged.

`POST /api/v1/admin/content-imports/:id/generate-audio`

Adds optional `providerId` and `voiceId`. The canonical request hash and durable job payload include both fields and the immutable candidate ID. Replay with a different provider/voice returns the existing idempotency conflict.

The publish contract identifies the selected READY artifact for each audio-script slug. The backend rejects stale hashes, foreign candidates, duplicate slug bindings, simulation artifacts when the current environment disallows them, and candidates already mutated from their accepted generation snapshot.

Stable errors include:

| HTTP | Code | Meaning |
|---:|---|---|
| 404 | `AUDIO_NOT_FOUND` | Owned/version-bound artifact is absent |
| 409 | `AUDIO_GENERATION_CONFLICT` | Same generation key targets different settings |
| 422 | `AUDIO_SOURCE_UNSUPPORTED` | Unknown learner playback source |
| 422 | `TTS_PROVIDER_UNAVAILABLE` | Selected server provider lacks valid configuration |
| 429/503 | existing safe provider code | Quota/rate-limit or temporary provider failure |

## 8. Web Experience

### 8.1 Learner Settings

Add `/settings/audio` and a Settings link in the learner navigation.

The page contains:

- source radio cards with plain-language descriptions;
- browser voice selector shown only for browser-capable choices;
- a short test sentence and explicit Preview/Stop controls;
- saved state, retryable error state, and unsupported-browser explanation;
- a note that published lesson audio is version-bound.

Controls work by keyboard, retain visible focus, use text in addition to icons/color, meet the 44px touch target, and use at least 16px form text on mobile.

### 8.2 Learner lesson audio

The Listening activity uses the settings resolver and retains the transcript at all times. It never autoplays. A failed canonical stream shows the failure and recovery control instead of removing all audio controls.

### 8.3 Admin Settings and preview

Add `/admin/settings/audio` and an Admin navigation link.

The page shows safe provider readiness, the selected future-generation provider, Azure voice ID, and a spoken browser preview. Credential entry is not offered in the browser; setup instructions point to local environment configuration.

The content-authoring audio panel distinguishes:

- `Preview in browser` — immediate spoken preview, not publishable;
- `Generate artifact` — durable configured server-provider job;
- simulation artifacts — clearly labeled and never described as release voice.

## 9. Failure Handling

- Azure authentication, timeout, rate limit, malformed response, and quota failures map through existing safe provider errors.
- Generation failure marks only its new candidate and preserves every previous READY artifact; a failed regeneration must not destroy usable audio.
- The UI uses bounded job polling and stops on unmount or terminal state.
- Browser speech errors do not alter stored artifacts or learner progress.
- Missing transcript disables browser speech with an explicit transcript-unavailable message.
- A Settings API failure does not block the lesson; `system-default` behavior is used for that render only.

## 10. Security and Privacy

- Azure keys and endpoints remain server-side environment configuration.
- Capability APIs expose booleans and IDs only.
- Audio streams remain authenticated and owner/role scoped.
- Logs contain provider ID, voice ID, artifact/job IDs, safe error code, and correlation ID only.
- No raw script, learner answer, transcript, cookie, token, key, or provider body is logged.
- Browser speech receives only transcript text already authorized for the current learner activity.

## 11. Testing Strategy

### Domain and unit

- provider registry resolution and unavailable-provider rejection;
- generation request/job snapshots provider and voice;
- same idempotency key with changed provider/voice conflicts;
- READY and published artifacts reject mutation;
- Azure adapter success, auth failure, timeout, 429, malformed WAV;
- fake TTS is classified as simulation, not release speech;
- range parsing for complete, partial, suffix, invalid, and unsatisfiable requests;
- settings contracts reject unknown sources and never serialize secrets.

### Integration

- learner settings ownership and persistence;
- Admin settings authorization and audit;
- generation with Azure stub stores provider/voice provenance;
- failed regeneration preserves prior READY artifact;
- publish binds the explicitly selected candidate while older lesson versions keep their original bytes;
- Admin and Learner streams return `200`, `206`, and `416` correctly;
- learner session remains bound to its original lesson-version artifact;
- backup/restore includes new settings fields/table.

### Web

- Settings source and voice selection;
- browser speech unavailable/error paths;
- no autoplay and cleanup on navigation;
- canonical playback, explicit published-only failure, and system-default fallback;
- Admin provider readiness and browser preview;
- keyboard labels, focus, mobile touch targets, and no overflow.

### End to end

Desktop and mobile journeys cover:

1. local fake pipeline plus browser spoken preview;
2. Azure-stub generation, publish, Admin playback, and Learner playback;
3. learner switches to browser TTS and retains the preference after reload;
4. canonical audio failure recovers according to the selected source;
5. authenticated partial-content requests for both Admin and Learner.

The final repository gate remains `pnpm verify`.

## 12. Acceptance Criteria

1. Admin and Learner can hear spoken content without relying on the fake tone.
2. Azure is used for new canonical artifacts when configured and selected.
3. The application remains useful without Azure credentials through browser TTS.
4. Learner source preference survives reload and is owner-scoped.
5. Adding a future source/provider requires a new registry descriptor/adapter and contract value, not a Settings-page redesign.
6. Audio streams work with browser byte-range requests and never bypass authorization.
7. Published lesson versions and existing session audio remain immutable.
8. Secrets and raw provider responses never reach persistence, logs, or clients.
9. Full verification and independent review have no unresolved Critical or Important findings.

## 13. External References

- Azure Speech pricing and F0 allowance: https://azure.microsoft.com/en-us/pricing/details/speech/
- Azure Text to Speech REST API: https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech

