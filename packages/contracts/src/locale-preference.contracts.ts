import { z } from 'zod';

export const uiLocaleSchema = z.enum(['vi', 'en']);

export const userPreferencesSchema = z.object({
  locale: uiLocaleSchema,
}).strict();

export type UiLocale = z.infer<typeof uiLocaleSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
