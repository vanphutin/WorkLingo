import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
};

describe('local API startup', () => {
  it.each(['dev', 'start'])('loads workspace environment before %s', (script) => {
    expect(packageJson.scripts[script]).toBe(`node scripts/run-api.mjs ${script}`);
  });
});
