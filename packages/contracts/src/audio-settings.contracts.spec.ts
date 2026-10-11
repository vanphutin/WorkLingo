import { describe, expect, it } from 'vitest';

import {
  adminAudioSettingsSchema,
  audioSettingsSchema,
  audioSourceIdSchema,
  ttsProviderCapabilitySchema,
  updateAdminAudioSettingsSchema,
  updateAudioSettingsSchema,
} from './audio-settings.contracts.ts';
import {
  audioArtifactDtoSchema,
  generateAudioSchema,
  publishContentImportSchema,
} from './content-authoring.contracts.ts';

const uuid = '00000000-0000-4000-8000-000000000001';

describe('audio settings contracts', () => {
  it.each(['system-default', 'published-audio', 'browser-tts'] as const)(
    'accepts the supported learner source %s',
    (sourceId) => {
      expect(audioSourceIdSchema.parse(sourceId)).toBe(sourceId);
      expect(updateAudioSettingsSchema.parse({
        browserVoiceId: null,
        sourceId,
      })).toEqual({ browserVoiceId: null, sourceId });
    },
  );

  it('rejects unknown learner sources and credential-shaped fields', () => {
    expect(updateAudioSettingsSchema.safeParse({
      sourceId: 'unofficial-free-tts',
    }).success).toBe(false);
    expect(updateAudioSettingsSchema.safeParse({
      azureKey: 'must-never-reach-the-client-contract',
      sourceId: 'system-default',
    }).success).toBe(false);
  });

  it('allows a nullable or omitted browser voice without weakening source validation', () => {
    expect(updateAudioSettingsSchema.parse({ sourceId: 'browser-tts' })).toEqual({
      sourceId: 'browser-tts',
    });
    expect(audioSettingsSchema.parse({
      browserVoiceId: null,
      sourceId: 'system-default',
    })).toEqual({
      browserVoiceId: null,
      sourceId: 'system-default',
    });
  });

  it('exposes safe provider capabilities without accepting credentials', () => {
    const capability = {
      available: true,
      defaultVoiceId: 'en-US-JennyNeural',
      displayName: 'Azure Speech',
      id: 'azure-speech',
      simulation: false,
      supportedLocales: ['en-US'],
    };

    expect(ttsProviderCapabilitySchema.parse(capability)).toEqual(capability);
    expect(ttsProviderCapabilitySchema.safeParse({
      ...capability,
      apiKey: 'secret',
    }).success).toBe(false);
    expect(adminAudioSettingsSchema.safeParse({
      defaultVoiceId: capability.defaultVoiceId,
      providerId: capability.id,
      providers: [{ ...capability, subscriptionKey: 'secret' }],
    }).success).toBe(false);
    expect(updateAdminAudioSettingsSchema.safeParse({
      endpoint: 'https://example.invalid',
      providerId: 'azure-speech',
    }).success).toBe(false);
  });
});

describe('immutable audio candidate contracts', () => {
  it('accepts provider and voice selection when requesting generation', () => {
    expect(generateAudioSchema.parse({
      audioScriptSlug: 'workplace-intro',
      idempotencyKey: uuid,
      providerId: 'azure-speech',
      voiceId: 'en-US-JennyNeural',
    })).toMatchObject({
      providerId: 'azure-speech',
      voiceId: 'en-US-JennyNeural',
    });
  });

  it('requires publish selections to contain artifact UUIDs', () => {
    const base = {
      expectedDraftRevision: 1,
      expectedSourceHash: 'sha256:source',
      idempotencyKey: uuid,
    };

    expect(publishContentImportSchema.safeParse({
      ...base,
      selectedAudioArtifacts: { 'workplace-intro': uuid },
    }).success).toBe(true);
    expect(publishContentImportSchema.safeParse({
      ...base,
      selectedAudioArtifacts: { 'workplace-intro': 'not-a-uuid' },
    }).success).toBe(false);
  });

  it('includes the immutable variant key in artifact responses', () => {
    const parsed = audioArtifactDtoSchema.parse({
      adapterName: 'azure-speech',
      audioScriptSlug: 'workplace-intro',
      byteSize: 128,
      checksum: 'sha256:audio',
      contentImportId: uuid,
      createdAt: '2026-10-10T00:00:00.000Z',
      failureSummary: null,
      id: uuid,
      mimeType: 'audio/wav',
      scriptHash: 'sha256:script',
      status: 'READY',
      storageKey: 'audio/candidate.wav',
      updatedAt: '2026-10-10T00:00:00.000Z',
      variantKey: 'azure-speech:en-US-JennyNeural:default',
      voiceConfig: {},
    });

    expect(parsed.variantKey).toBe('azure-speech:en-US-JennyNeural:default');
  });
});
