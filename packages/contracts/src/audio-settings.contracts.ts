import { z } from 'zod';

export const audioSourceIdSchema = z.enum([
  'system-default',
  'published-audio',
  'browser-tts',
]);
export type AudioSourceId = z.infer<typeof audioSourceIdSchema>;

export const audioSettingsSchema = z.object({
  sourceId: audioSourceIdSchema,
  browserVoiceId: z.string().min(1).nullable(),
}).strict();
export type AudioSettings = z.infer<typeof audioSettingsSchema>;

export const updateAudioSettingsSchema = z.object({
  sourceId: audioSourceIdSchema,
  browserVoiceId: z.string().min(1).nullable().optional(),
}).strict();
export type UpdateAudioSettingsInput = z.infer<typeof updateAudioSettingsSchema>;

export const ttsProviderCapabilitySchema = z.object({
  id: z.enum(['azure-speech', 'fake-tts']),
  displayName: z.string().min(1),
  available: z.boolean(),
  supportedLocales: z.array(z.string().min(1)),
  defaultVoiceId: z.string().min(1).nullable(),
  simulation: z.boolean(),
}).strict();
export type TtsProviderCapability = z.infer<typeof ttsProviderCapabilitySchema>;

export const adminAudioSettingsSchema = z.object({
  providerId: z.enum(['azure-speech', 'fake-tts']),
  defaultVoiceId: z.string().min(1).nullable(),
  providers: z.array(ttsProviderCapabilitySchema),
}).strict();
export type AdminAudioSettings = z.infer<typeof adminAudioSettingsSchema>;

export const updateAdminAudioSettingsSchema = z.object({
  providerId: z.enum(['azure-speech', 'fake-tts']),
  defaultVoiceId: z.string().min(1).nullable().optional(),
}).strict();
export type UpdateAdminAudioSettingsInput = z.infer<typeof updateAdminAudioSettingsSchema>;
