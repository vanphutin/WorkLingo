import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { UserPreferencesDto } from './user-preferences.dto.js';

const pipe = new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true });

describe('user preferences DTO', () => {
  it.each(['vi', 'en'])('accepts supported locale %s', async (locale) => {
    await expect(pipe.transform({ locale }, { metatype: UserPreferencesDto, type: 'body' }))
      .resolves.toMatchObject({ locale });
  });

  it.each([
    { locale: 'en-US' }, { locale: 'VI' }, { locale: '' }, { locale: null },
    { locale: 1 }, {}, { locale: 'en', userId: 'another-user' },
  ])('rejects malformed or untrusted preferences %j', async (input) => {
    await expect(pipe.transform(input, { metatype: UserPreferencesDto, type: 'body' }))
      .rejects.toMatchObject({ status: 400 });
  });
});
