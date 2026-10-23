import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

const packageJson = JSON.parse(
  readFileSync('package.json', 'utf8'),
) as { scripts: Record<string, string> };

describe('local web startup', () => {
  it('keeps the API proxy alive beyond the two-minute lesson generation deadline', () => {
    expect(nextConfig.experimental?.proxyTimeout).toBeGreaterThan(120000);
    expect(nextConfig.experimental?.proxyTimeout).toBeLessThanOrEqual(150000);
  });
  it.each(['dev', 'start'])('uses the cross-platform launcher for %s', (script) => {
    expect(packageJson.scripts[script]).toBe(`node scripts/run-next.mjs ${script}`);
  });
});
