import { describe, expect, it } from 'vitest';

import { authUserSchema, registerInputSchema } from './auth.contracts.ts';
import { uiLocaleSchema, userPreferencesSchema } from './index.ts';

const registration = {
  displayName: 'Locale Learner', email: 'locale@example.test', password: 'a-secure-local-password',
};
const legacyUser = {
  displayName: 'Locale Learner', email: 'locale@example.test',
  id: '00000000-0000-4000-8000-000000000001', onboardingStatus: 'PENDING', roles: ['LEARNER'],
};

describe('auth locale compatibility', () => {
  it('retains a supported registration locale and accepts legacy registration', () => {
    expect(registerInputSchema.parse({ ...registration, locale: 'en' })).toHaveProperty('locale', 'en');
    expect(registerInputSchema.parse(registration)).not.toHaveProperty('locale');
  });

  it.each(['en-US', '', null, 1])('rejects invalid registration locale %s', (locale) => {
    expect(registerInputSchema.safeParse({ ...registration, locale }).success).toBe(false);
  });

  it('retains response locale while accepting old auth responses', () => {
    expect(authUserSchema.parse({ ...legacyUser, locale: 'vi' })).toHaveProperty('locale', 'vi');
    expect(authUserSchema.parse(legacyUser)).not.toHaveProperty('locale');
  });

  it('rejects unsupported response locale', () => {
    expect(authUserSchema.safeParse({ ...legacyUser, locale: 'en-US' }).success).toBe(false);
  });
});

describe('locale preference contracts', () => {
  it('exports strict supported locale and owner-free preferences schemas', () => {
    expect(uiLocaleSchema.parse('vi')).toBe('vi');
    expect(uiLocaleSchema.parse('en')).toBe('en');
    expect(userPreferencesSchema.parse({ locale: 'en' })).toEqual({ locale: 'en' });
    for (const locale of ['en-US', 'VI', '', null, 1, undefined]) {
      expect(uiLocaleSchema.safeParse(locale).success).toBe(false);
      expect(userPreferencesSchema.safeParse({ locale }).success).toBe(false);
    }
    expect(userPreferencesSchema.safeParse({ locale: 'vi', userId: legacyUser.id }).success).toBe(false);
  });
});
