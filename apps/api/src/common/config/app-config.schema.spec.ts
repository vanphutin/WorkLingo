import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseAppConfig } from './app-config.schema';

const validEnvironment = {
  API_PORT: '4000',
  DATABASE_URL: 'postgresql://worklingo:worklingo@127.0.0.1:5432/worklingo',
  SESSION_SECRET: 'a-local-secret-with-at-least-32-characters',
  WEB_PORT: '3000',
  WORKLINGO_DATA_DIR: './data',
} satisfies NodeJS.ProcessEnv;

describe('parseAppConfig', () => {
  it.each(['DATABASE_URL', 'SESSION_SECRET', 'WORKLINGO_DATA_DIR'] as const)(
    'rejects a missing %s',
    (key) => {
      const environment = { ...validEnvironment };
      delete environment[key];

      expect(() => parseAppConfig(environment)).toThrow(key);
    },
  );

  it('normalizes ports and the data directory', () => {
    const config = parseAppConfig(validEnvironment);

    expect(config.apiPort).toBe(4000);
    expect(config.webPort).toBe(3000);
    expect(path.isAbsolute(config.dataDir)).toBe(true);
    expect(config.dataDir).toBe(path.resolve('./data'));
  });

  it('rejects the documented placeholder session secret', () => {
    expect(() =>
      parseAppConfig({
        ...validEnvironment,
        SESSION_SECRET: 'replace-with-a-local-development-secret',
      }),
    ).toThrow('SESSION_SECRET');
  });
});
