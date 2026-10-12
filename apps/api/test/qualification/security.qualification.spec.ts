import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('pilot security qualification', () => {
  it('keeps trusted proxy disabled by default and requires a production rate-limit key', () => {
    const config = readFileSync(path.resolve(process.cwd(), 'src/common/config/app-config.schema.ts'), 'utf8');
    expect(config).toContain("TRUST_PROXY_HOPS");
    expect(config).toMatch(/RATE_LIMIT_HASH_KEY/u);
    expect(config).toMatch(/production/u);
  });

  it('exposes operations as read-only controller routes', () => {
    const controller = readFileSync(path.resolve(process.cwd(), 'src/operations/admin-operations.controller.ts'), 'utf8');
    expect(controller).toContain("@Roles('CONTENT_ADMIN', 'SYSTEM_ADMIN')");
    expect(controller).not.toMatch(/@(Post|Put|Patch|Delete)\(/u);
  });
});
