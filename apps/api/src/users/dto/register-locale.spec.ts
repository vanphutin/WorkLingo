import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { RegisterDto } from '../../auth/dto/register.dto.js';

const pipe = new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true });
const registration = {
  displayName: 'Locale Learner', email: 'locale@example.test', password: 'a-secure-local-password',
};

describe('registration locale DTO', () => {
  it.each(['vi', 'en'])('accepts supported locale %s', async (locale) => {
    await expect(pipe.transform({ ...registration, locale }, { metatype: RegisterDto, type: 'body' }))
      .resolves.toMatchObject({ locale });
  });

  it('accepts old clients omitting locale', async () => {
    await expect(pipe.transform(registration, { metatype: RegisterDto, type: 'body' }))
      .resolves.toMatchObject(registration);
  });

  it.each(['en-US', '', null, 1])('rejects invalid locale %s', async (locale) => {
    await expect(pipe.transform({ ...registration, locale }, { metatype: RegisterDto, type: 'body' }))
      .rejects.toMatchObject({ status: 400 });
  });
});
