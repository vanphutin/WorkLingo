# Audio Playback, TTS Providers, and Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair Admin and Learner spoken audio, prefer Azure Speech for canonical artifacts when configured, provide browser TTS fallback, and persist extensible audio-source settings without weakening lesson-version immutability.

**Architecture:** Introduce shared audio contracts and settings persistence, a server-side TTS provider registry, immutable generation candidates, and a reusable authenticated byte-range responder. The web uses one browser-speech controller and a saved source resolver; Azure credentials remain environment-only while non-secret provider/voice defaults and learner playback choices are persisted.

**Tech Stack:** TypeScript, NestJS, Prisma/PostgreSQL, Zod, Next.js 16/React, Web Speech API, Vitest, Supertest, Playwright

**Spec:** `docs/superpowers/specs/2026-10-10-audio-tts-settings-design.md`

## Global Constraints

- Preserve all unrelated Increment 5 onboarding changes; stage only explicit audio-task files.
- Azure credentials stay in environment configuration and never enter database rows, API responses, logs, browser storage, or tests.
- `fake-tts` remains a clearly labeled deterministic simulation provider and is never described as spoken release audio.
- Learner source IDs are exactly `system-default`, `published-audio`, and `browser-tts` in this slice.
- Server provider IDs are exactly `azure-speech` and `fake-tts`; browser TTS is not a server provider.
- Browser speech never autoplays and is cancelled on activity change and component unmount.
- READY or lesson-version-referenced audio artifacts are immutable; regeneration creates a new candidate.
- Existing LessonVersion audio references and sessions keep their original artifact bytes.
- Unknown provider/source IDs fail closed with stable safe errors.
- All changes follow RED → GREEN → REFACTOR and each task ends in an atomic commit.

## Review Focus

- Two generation requests with the same idempotency key but different provider/voice: preserve the first candidate and return a safe conflict.
- Azure regeneration fails after a prior READY artifact exists: mark only the new candidate FAILED and keep the prior artifact playable/publishable.
- A browser sends suffix, invalid, or unsatisfiable byte ranges: return correct `206` or `416` without reading another user's artifact.
- A saved browser voice is absent on a second device: select an English fallback without changing the persisted preference.
- Settings/API/provider failures occur during a lesson: keep the transcript and lesson interaction usable, never autoplay, and expose an explicit recovery action.

---

### Task 1: Persist audio settings and immutable candidate contracts

**Files:**
- Create: `apps/api/prisma/migrations/20261010000100_audio_tts_settings/migration.sql`
- Create: `packages/contracts/src/audio-settings.contracts.ts`
- Create: `packages/contracts/src/audio-settings.contracts.spec.ts`
- Create: `apps/api/test/integration/audio-settings-schema.integration.spec.ts`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/src/content-authoring.contracts.ts`
- Modify: `apps/api/test/integration/backup-restore.integration.spec.ts`

**Interfaces:**
- Produces: `AudioSourceId`, `audioSettingsSchema`, `updateAudioSettingsSchema`, `ttsProviderCapabilitySchema`, `adminAudioSettingsSchema`, and `updateAdminAudioSettingsSchema`.
- Produces: additive `GenerateAudioInput.providerId?: string`, `voiceId?: string`, `AudioArtifactDto.variantKey`, and `PublishContentImportInput.selectedAudioArtifacts: Record<string, string>`.
- Produces persistence: `LearnerProfile.audioSourceId`, `LearnerProfile.browserVoiceId`, singleton `AudioSystemSetting`, and `AudioArtifact.variantKey` plus unique `generationKey`.

- [ ] **Step 1: Write failing contract tests**

Add tests asserting the three exact learner source IDs, unknown-source rejection, nullable browser voice, provider capability without credential-shaped fields, selected artifact UUID values, and strict rejection of `apiKey`, `secret`, or `endpointCredential` fields.

- [ ] **Step 2: Write failing schema and upgrade tests**

Assert new learners default to `system-default`; existing profiles backfill to that value; `AudioSystemSetting` accepts only the `default` singleton ID; existing artifacts receive `variantKey = legacy:<adapterName>` and `generationKey = legacy:<artifactId>`; existing LessonVersion references remain unchanged; multiple new candidates can share import/slug/script hash but not `generationKey`.

- [ ] **Step 3: Run RED**

Run: `pnpm --filter @worklingo/contracts test`

Run: `pnpm --filter @worklingo/api exec vitest run test/integration/audio-settings-schema.integration.spec.ts test/integration/backup-restore.integration.spec.ts`

Expected: FAIL because the contracts, columns, table, and candidate identity do not exist.

- [ ] **Step 4: Add migration, Prisma relations, and contracts**

Drop the old `(contentImportId, audioScriptSlug, scriptHash)` uniqueness, add indexed candidate lookup fields, backfill before installing non-null constraints, and keep every existing foreign key/reference intact. Store source/provider IDs as strings; validation belongs to contracts/services.

- [ ] **Step 5: Run GREEN**

Run: `pnpm --filter @worklingo/api exec prisma generate`

Run both Step 3 commands. Expected: all selected tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma packages/contracts/src apps/api/test/integration/audio-settings-schema.integration.spec.ts apps/api/test/integration/backup-restore.integration.spec.ts
git commit -m "feat: persist extensible audio settings"
```

### Task 2: Add the safe TTS provider registry

**Files:**
- Create: `apps/api/src/ai-gateway/application/text-to-speech-provider.registry.ts`
- Create: `apps/api/src/ai-gateway/application/text-to-speech-provider.registry.spec.ts`
- Modify: `apps/api/src/ai-gateway/domain/text-to-speech.port.ts`
- Modify: `apps/api/src/ai-gateway/ai-gateway.module.ts`
- Modify: `apps/api/src/ai-gateway/infrastructure/fake-tts.adapter.ts`
- Modify: `apps/api/src/ai-gateway/infrastructure/fake-tts.adapter.spec.ts`
- Modify: `apps/api/src/ai-gateway/infrastructure/microsoft-tts.adapter.ts`
- Modify: `apps/api/src/ai-gateway/infrastructure/microsoft-tts.adapter.spec.ts`
- Modify: `apps/api/src/common/config/app-config.schema.ts`
- Modify: `apps/api/src/common/config/app-config.schema.spec.ts`

**Interfaces:**
- Produces: `TtsProviderDescriptor { id; displayName; available; defaultVoiceId; supportedVoiceIds; releaseQuality }`.
- Produces: `TextToSpeechProviderRegistry.list(): readonly TtsProviderDescriptor[]`, `resolve(providerId: string): TextToSpeechPort`, and `assertVoiceSupported(providerId: string, voiceId: string): void`.
- Produces: canonical adapter IDs `azure-speech` and `fake-tts`; unavailable resolution throws safe `TTS_PROVIDER_UNAVAILABLE` without configuration details.

- [ ] **Step 1: Write failing registry/config tests**

Cover Azure available only with key plus region, fake always available but `releaseQuality: false`, unknown/unavailable rejection, unsupported voice rejection, capability objects containing no secret values, and configured default provider/voice in `supportedVoiceIds`. Pin the review case where an unavailable Azure selection cannot silently fall back to fake.

- [ ] **Step 2: Extend Azure adapter failure tests**

Assert auth failure, timeout, 429, invalid WAV and valid Azure WAV map to existing safe provider errors and `provider.name === 'azure-speech'`; no response body or key appears in errors.

- [ ] **Step 3: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/ai-gateway/application/text-to-speech-provider.registry.spec.ts src/ai-gateway/infrastructure/fake-tts.adapter.spec.ts src/ai-gateway/infrastructure/microsoft-tts.adapter.spec.ts src/common/config/app-config.schema.spec.ts`

Expected: FAIL because generation still injects one selected port and uses `microsoft-tts` provenance.

- [ ] **Step 4: Implement registry and safe descriptors**

Construct registered adapters in `AiGatewayModule`; do not put browser TTS in the registry. Keep `WORKLINGO_TTS_PROVIDER` backward-compatible by mapping `microsoft` to canonical `azure-speech` internally.

- [ ] **Step 5: Run GREEN and mutation check**

Run Step 3. Temporarily allow unavailable Azure to resolve as fake and confirm the fail-closed test fails; restore and rerun green.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/ai-gateway apps/api/src/common/config
git commit -m "feat: register safe text to speech providers"
```

### Task 3: Make Admin generation and publishing artifact-immutable

**Files:**
- Modify: `apps/api/src/content-authoring/application/audio-generation.service.ts`
- Modify: `apps/api/src/content-authoring/application/audio-generation.service.spec.ts`
- Modify: `apps/api/src/content-authoring/application/audio-generation.handler.ts`
- Modify: `apps/api/src/content-authoring/application/audio-generation.handler.spec.ts`
- Modify: `apps/api/src/content-authoring/application/content-publisher.service.ts`
- Modify: `apps/api/src/content-authoring/application/content-publisher.service.spec.ts`
- Modify: `apps/api/src/content-authoring/dto/generate-audio.dto.ts`
- Modify: `apps/api/src/content-authoring/dto/content-import.dto.ts`
- Modify: `apps/api/test/integration/content-audio.integration.spec.ts`
- Modify: `apps/api/test/integration/content-publish.integration.spec.ts`

**Interfaces:**
- Consumes: Task 1 candidate fields/contracts and Task 2 registry.
- Produces: generation jobs carrying `{ artifactId, providerId, voiceId, variantKey }` and publication bound only to `selectedAudioArtifacts`.

- [ ] **Step 1: Write failing immutable-generation tests**

Assert accepted generation atomically creates one GENERATING candidate, job, and receipt; exact replay returns it; changed provider/voice conflicts; regeneration creates a second candidate; Azure failure marks only the second candidate; a READY or referenced candidate never changes storage key/checksum/status.

- [ ] **Step 2: Write failing publish-selection tests**

Assert one selected READY candidate per required script, reject foreign/stale/FAILED/duplicate-slug candidates, bind only selected IDs, and prove publishing N+1 or regenerating cannot change bytes referenced by N. Add the review case for two concurrent generations with the same key.

- [ ] **Step 3: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/content-authoring/application/audio-generation.service.spec.ts src/content-authoring/application/audio-generation.handler.spec.ts src/content-authoring/application/content-publisher.service.spec.ts test/integration/content-audio.integration.spec.ts test/integration/content-publish.integration.spec.ts`

Expected: FAIL because generation upserts a mutable business-key row and publish selects the first READY artifact implicitly.

- [ ] **Step 4: Implement candidate creation and explicit publish binding**

Derive `variantKey` from canonical provider/voice/non-secret voice configuration. Create the receipt/candidate/job in one transaction. Handler updates only its GENERATING candidate using a guarded update. Publisher verifies selected candidates again inside its lock/transaction before creating LessonVersion references.

- [ ] **Step 5: Run GREEN and regressions**

Run Step 3 plus `pnpm --filter @worklingo/api exec vitest run test/integration/versioned-learner-audio.integration.spec.ts`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/content-authoring apps/api/test/integration/content-audio.integration.spec.ts apps/api/test/integration/content-publish.integration.spec.ts apps/api/test/integration/versioned-learner-audio.integration.spec.ts
git commit -m "fix: preserve immutable generated audio artifacts"
```

### Task 4: Implement authenticated byte-range streaming

**Files:**
- Create: `apps/api/src/media/domain/audio-byte-range.ts`
- Create: `apps/api/src/media/domain/audio-byte-range.spec.ts`
- Create: `apps/api/src/media/application/audio-stream-response.ts`
- Create: `apps/api/src/media/application/audio-stream-response.spec.ts`
- Modify: `apps/api/src/content-authoring/audio.controller.ts`
- Modify: `apps/api/src/learning-sessions/learning-sessions.controller.ts`
- Modify: `apps/api/test/integration/content-audio.integration.spec.ts`
- Modify: `apps/api/test/integration/versioned-learner-audio.integration.spec.ts`

**Interfaces:**
- Produces: `parseSingleByteRange(header: string | undefined, size: number): FullRange | PartialRange | UnsatisfiableRange`.
- Produces: `sendAudio(response, requestRange, content): void` with `200`, `206`, or `416`, private/no-store caching, and `nosniff`.

- [ ] **Step 1: Write failing table-driven range tests**

Cover absent range, `bytes=0-99`, open-ended, suffix, clamped end, malformed, multiple ranges, zero-size and unsatisfiable starts with literal expected offsets/statuses.

- [ ] **Step 2: Write failing authorized stream tests**

For both Admin and Learner routes assert complete `200`, partial/suffix `206`, invalid `416`, exact headers/body slices, foreign-owner `404` before range behavior, and no storage key leakage.

- [ ] **Step 3: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/media/domain/audio-byte-range.spec.ts src/media/application/audio-stream-response.spec.ts test/integration/content-audio.integration.spec.ts test/integration/versioned-learner-audio.integration.spec.ts`

Expected: FAIL because controllers advertise ranges but always return the full body.

- [ ] **Step 4: Implement parser/responder and wire both controllers**

Support one RFC-style bytes range only. Authorize and load the artifact before parsing/responding; do not add public or tokenized media URLs.

- [ ] **Step 5: Run GREEN**

Run Step 3. Expected: all selected tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/media apps/api/src/content-authoring/audio.controller.ts apps/api/src/learning-sessions/learning-sessions.controller.ts apps/api/test/integration/content-audio.integration.spec.ts apps/api/test/integration/versioned-learner-audio.integration.spec.ts
git commit -m "fix: stream authorized audio byte ranges"
```

### Task 5: Expose owner-scoped Learner and Admin audio settings

**Files:**
- Create: `apps/api/src/audio-settings/audio-settings.module.ts`
- Create: `apps/api/src/audio-settings/audio-settings.controller.ts`
- Create: `apps/api/src/audio-settings/admin-audio-settings.controller.ts`
- Create: `apps/api/src/audio-settings/application/audio-settings.service.ts`
- Create: `apps/api/src/audio-settings/application/audio-settings.service.spec.ts`
- Create: `apps/api/src/audio-settings/dto/update-audio-settings.dto.ts`
- Create: `apps/api/src/audio-settings/dto/update-admin-audio-settings.dto.ts`
- Create: `apps/api/test/integration/audio-settings-api.integration.spec.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: Task 1 contracts/persistence and Task 2 provider descriptors.
- Produces: `getLearnerSettings`, `updateLearnerSettings`, `getAdminSettings`, and `updateAdminSettings` service methods.
- Produces routes: `GET/PATCH /api/v1/me/audio-settings` and `GET/PATCH /api/v1/admin/audio-settings`.

- [ ] **Step 1: Write failing service and HTTP tests**

Cover defaults, persistence/reload, learner isolation, all three source IDs, unknown-source `422 AUDIO_SOURCE_UNSUPPORTED`, nullable/missing browser voice, Admin authorization, unavailable-provider `422 TTS_PROVIDER_UNAVAILABLE`, unsupported server voice rejection, audit old/new IDs, and response scans proving no credential-shaped values.

- [ ] **Step 2: Run RED**

Run: `pnpm --filter @worklingo/api exec vitest run src/audio-settings/application/audio-settings.service.spec.ts test/integration/audio-settings-api.integration.spec.ts`

Expected: FAIL because the module/routes do not exist.

- [ ] **Step 3: Implement settings transactions**

Use authenticated actor identity, strict DTO validation, registry capability checks, singleton upsert for Admin settings, and audit entries containing IDs only. A missing singleton resolves from safe app config without writing during GET.

- [ ] **Step 4: Run GREEN, lint, and typecheck**

Run Step 2, `pnpm --filter @worklingo/api lint`, and `pnpm --filter @worklingo/api typecheck`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/audio-settings apps/api/src/app.module.ts apps/api/test/integration/audio-settings-api.integration.spec.ts
git commit -m "feat: expose audio source settings"
```

### Task 6: Add browser speech controls and Settings pages

**Files:**
- Create: `apps/web/src/features/audio/use-browser-speech.ts`
- Create: `apps/web/src/features/audio/use-browser-speech.test.tsx`
- Create: `apps/web/src/features/audio/browser-speech-controls.tsx`
- Create: `apps/web/src/features/audio/browser-speech-controls.test.tsx`
- Create: `apps/web/src/features/audio/audio-settings-panel.tsx`
- Create: `apps/web/src/features/audio/audio-settings-panel.test.tsx`
- Create: `apps/web/src/features/audio/admin-audio-settings-panel.tsx`
- Create: `apps/web/src/features/audio/admin-audio-settings-panel.test.tsx`
- Create: `apps/web/src/lib/api/audio-settings-client.ts`
- Create: `apps/web/src/lib/api/audio-settings-client.test.ts`
- Create: `apps/web/src/app/(learner)/settings/audio/page.tsx`
- Create: `apps/web/src/app/(learner)/settings/audio/layout.tsx`
- Create: `apps/web/src/app/(admin)/admin/settings/audio/page.tsx`
- Create: `apps/web/src/app/(admin)/admin/settings/audio/layout.tsx`
- Modify: `apps/web/src/app/(learner)/layout.tsx`
- Modify: `apps/web/src/app/(learner)/layout.test.tsx`
- Modify: `apps/web/src/app/(admin)/layout.tsx`
- Modify: `apps/web/src/app/(admin)/layout.test.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Produces: `useBrowserSpeech({ text, preferredVoiceId, lang }): BrowserSpeechController` with `play`, `pauseOrResume`, `stop`, support/status, and resolved voice.
- Produces: settings clients and accessible `/settings/audio` plus `/admin/settings/audio` pages.

- [ ] **Step 1: Write failing browser-speech tests**

Assert no autoplay, English voice resolution, missing saved voice fallback without PATCH, play/pause/resume/stop, utterance error, unsupported browser, cancellation on text change/unmount, and no speech after unmount.

- [ ] **Step 2: Write failing Settings/client/layout tests**

Assert source cards, conditional voice selector, preview sentence, save/retry/reload, safe Admin provider readiness, unavailable-provider disablement, Settings navigation, keyboard names, and API credentials inclusion. Include the review case where Settings GET fails but the page gives a retry rather than crashing the shell.

- [ ] **Step 3: Run RED**

Run: `pnpm --filter @worklingo/web test --run src/features/audio src/lib/api/audio-settings-client.test.ts src/app/'(learner)'/layout.test.tsx src/app/'(admin)'/layout.test.tsx`

Expected: FAIL because audio settings UI/client and speech controller do not exist.

- [ ] **Step 4: Implement focused controls and pages**

Keep browser voice enumeration/client state inside the audio feature. Use 44px controls, visible focus, text labels, a 16px mobile select, reduced-motion-safe behavior, and no autoplay/celebratory animation.

- [ ] **Step 5: Run GREEN, lint, typecheck, and build**

Run Step 3 plus `pnpm --filter @worklingo/web lint`, `pnpm --filter @worklingo/web typecheck`, and `pnpm --filter @worklingo/web build`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/audio apps/web/src/lib/api/audio-settings-client.ts apps/web/src/lib/api/audio-settings-client.test.ts apps/web/src/app/'(learner)'/settings apps/web/src/app/'(admin)'/admin/settings apps/web/src/app/'(learner)'/layout.tsx apps/web/src/app/'(learner)'/layout.test.tsx apps/web/src/app/'(admin)'/layout.tsx apps/web/src/app/'(admin)'/layout.test.tsx apps/web/src/app/globals.css
git commit -m "feat: add extensible audio settings UI"
```

### Task 7: Integrate source resolution into Admin and Learner audio

**Files:**
- Create: `apps/web/src/features/audio/lesson-audio-player.tsx`
- Create: `apps/web/src/features/audio/lesson-audio-player.test.tsx`
- Modify: `apps/web/src/features/learning-session/activity-renderers/listening-activity.tsx`
- Modify: `apps/web/src/features/learning-session/activity-renderers/listening-activity.test.tsx`
- Modify: `apps/web/src/features/admin-content/audio-preview.tsx`
- Modify: `apps/web/src/features/admin-content/audio-preview.test.tsx`
- Modify: `apps/web/src/features/admin-content/content-authoring-workspace.tsx`
- Modify: `apps/web/src/features/admin-content/content-authoring-workspace.test.tsx`
- Modify: `apps/web/src/features/admin-content/publish-panel.tsx`
- Modify: `apps/web/src/features/admin-content/publish-panel.test.tsx`
- Modify: `apps/web/src/lib/api/api-client.ts`
- Modify: `apps/web/src/lib/api/api-client.test.ts`
- Modify: `apps/web/src/features/admin-content/admin.css`

**Interfaces:**
- Consumes: Task 1 publish/generation contracts, Task 5 APIs, and Task 6 browser speech controls.
- Produces: source-aware `LessonAudioPlayer` and explicit Admin browser-preview/candidate-selection flow.

- [ ] **Step 1: Write failing Learner resolution tests**

Assert `published-audio` never silently changes source; `browser-tts` does not request media; `system-default` starts canonical and exposes browser speech after media error; transcript remains visible; settings failure uses render-only system default; source change/reload is honored; no autoplay.

- [ ] **Step 2: Write failing Admin generation/publish tests**

Assert browser preview speaks without creating an artifact, generation submits provider/voice, bounded polling stops, candidates remain listed separately, simulation label remains, one READY candidate per script is explicitly selected, and publish sends selected IDs. Cover failed regeneration retaining the prior READY candidate.

- [ ] **Step 3: Run RED**

Run: `pnpm --filter @worklingo/web test --run src/features/audio/lesson-audio-player.test.tsx src/features/learning-session/activity-renderers/listening-activity.test.tsx src/features/admin-content/audio-preview.test.tsx src/features/admin-content/content-authoring-workspace.test.tsx src/features/admin-content/publish-panel.test.tsx src/lib/api/api-client.test.ts`

Expected: FAIL because both UIs assume one implicit persisted artifact.

- [ ] **Step 4: Implement source resolver and candidate selection**

Fetch settings independently from session/activity data so a settings failure cannot block learning. Use stable candidate IDs in form state, clear selection only when its artifact becomes invalid/stale, and preserve the published-version notice.

- [ ] **Step 5: Run GREEN and web regressions**

Run Step 3 plus `pnpm --filter @worklingo/web test --run`, lint, typecheck, and build.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/audio apps/web/src/features/learning-session/activity-renderers/listening-activity.tsx apps/web/src/features/learning-session/activity-renderers/listening-activity.test.tsx apps/web/src/features/admin-content apps/web/src/lib/api/api-client.ts apps/web/src/lib/api/api-client.test.ts
git commit -m "fix: restore spoken audio across admin and learner"
```

### Task 8: Verify audio journeys and document operation

**Files:**
- Create: `apps/web/e2e/audio-settings.spec.ts`
- Create: `apps/web/e2e/helpers/audio-settings.ts`
- Modify: `apps/web/e2e/admin-content-authoring.spec.ts`
- Modify: `apps/web/e2e/foundation-session.spec.ts`
- Modify: `apps/web/e2e/teacher-ai-learning.spec.ts`
- Modify: `apps/web/playwright.config.ts`
- Modify: `.env.example`
- Modify: `docs/API_CONTRACTS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/LOCAL_DEVELOPMENT.md`
- Modify: `docs/TEST_STRATEGY.md`
- Modify: `docs/INCREMENT_4_DEMO.md`

**Interfaces:**
- Consumes: Tasks 1–7.
- Produces: desktop/mobile acceptance proof and safe local/Azure operating instructions.

- [ ] **Step 1: Write failing desktop/mobile Playwright journeys**

Cover local browser spoken preview, fake simulation labeling, Azure-stub generation/publish/Admin playback/Learner playback, saved browser-source reload, system-default recovery after canonical failure, explicit published-only failure, authenticated `206` for Admin/Learner, keyboard access, 44px controls, and no horizontal overflow.

- [ ] **Step 2: Run RED and diagnose the first product failure**

Run: `pnpm --filter @worklingo/web exec playwright test e2e/audio-settings.spec.ts`

Expected: at least one journey FAIL before final wiring; do not weaken assertions.

- [ ] **Step 3: Complete only wiring exposed by E2E**

Keep provider stubbing test-only. Do not add production clock/provider control endpoints or real credentials.

- [ ] **Step 4: Update documentation**

Document Azure F0 as a limited external allowance, exact environment fields, credential setup without values, browser support/fallback, immutable candidate selection, local simulation behavior, troubleshooting, and rollback to `system-default`.

- [ ] **Step 5: Run full verification and independent review**

Run: `pnpm verify`

Expected: format, setup regression, lint, typecheck, unit/integration tests, production build, and desktop/mobile Playwright all PASS.

Review correctness, readability, architecture, security/privacy, accessibility, and query/media performance. Mutation-check provider fail-closed behavior, candidate immutability, selected publish binding, owner authorization before range handling, missing browser voice fallback, and no-autoplay cleanup. Resolve every Critical/Important finding.

- [ ] **Step 6: Commit**

```bash
git add apps/web/e2e apps/web/playwright.config.ts .env.example docs
git commit -m "test: qualify configurable audio playback"
```
