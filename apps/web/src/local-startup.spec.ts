import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(
  readFileSync('package.json', 'utf8'),
) as { scripts: Record<string, string> };

describe('local web startup', () => {
  it.each(['dev', 'start'])('uses the cross-platform launcher for %s', (script) => {
    expect(packageJson.scripts[script]).toBe(`node scripts/run-next.mjs ${script}`);
  });
});
