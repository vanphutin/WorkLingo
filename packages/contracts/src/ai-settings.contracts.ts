import { z } from 'zod';

export const aiProviderIdSchema = z.enum(['discovery', 'openai']);
export type AiProviderId = z.infer<typeof aiProviderIdSchema>;
export const updateAiSettingsSchema = z.object({ preferredProvider: z.enum(['system-default', 'discovery', 'openai']), fallbackEnabled: z.boolean() }).strict();
export const updateAdminAiSettingsSchema = z.object({ preferredProvider: aiProviderIdSchema, fallbackEnabled: z.boolean() }).strict();
export type UpdateAiSettings = z.infer<typeof updateAiSettingsSchema>;
export type AiRoutingPreference = z.infer<typeof updateAdminAiSettingsSchema>;
export const aiSettingsSchema = updateAiSettingsSchema.extend({
  accountId: z.string().uuid().nullable(),
  canManageSystem: z.boolean(),
  effectiveProvider: aiProviderIdSchema,
  effectiveFallbackEnabled: z.boolean(),
  systemFallbackEnabled: z.boolean(),
  simulation: z.boolean(),
  routingEnabled: z.boolean(),
  maxOutputTokens: z.number().int().positive(),
  providers: z.array(z.object({ id: aiProviderIdSchema, available: z.boolean(), model: z.string().nullable() }).strict()),
}).strict();
export type AiSettings = z.infer<typeof aiSettingsSchema>;
