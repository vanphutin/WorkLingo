import { describe, expect, it } from 'vitest';
import { updateAiSettingsSchema, updateAdminAiSettingsSchema } from './ai-settings.contracts.ts';
describe('AI preferences contracts', () => {
  it('permits only named configured choices and rejects owner/secrets', () => {
    expect(updateAiSettingsSchema.parse({ preferredProvider: 'system-default', fallbackEnabled: false })).toEqual({ preferredProvider: 'system-default', fallbackEnabled: false });
    expect(updateAiSettingsSchema.safeParse({ preferredProvider: 'discovery', fallbackEnabled: true, apiKey: 'secret' }).success).toBe(false);
    expect(updateAdminAiSettingsSchema.safeParse({ preferredProvider: 'system-default', fallbackEnabled: true }).success).toBe(false);
  });
});
