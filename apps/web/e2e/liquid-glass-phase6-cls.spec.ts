import { test, expect } from '@playwright/test';
import { phase6Recorder } from './fixtures/phase6-evidence';
import { installSettingsFixtures } from './fixtures/phase4-settings-contracts';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { phase6Root } from './fixtures/phase6-evidence';
const observations = phase6Recorder();
test('controlled Operations initial data insertion shift attribution', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'vi', domain: '127.0.0.1', path: '/' }]);
  await page.addInitScript(() => {
    const shifts: object[] = [];
    (window as Window & { shifts?: object[] }).shifts = shifts;
    new PerformanceObserver(list => { for (const entry of list.getEntries()) {
      const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean; sources: { node?: Element; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }[] };
      if (!shift.hadRecentInput) shifts.push({ start: shift.startTime, value: shift.value, sources: shift.sources.map(source => ({ node: source.node?.className, previous: source.previousRect.toJSON(), current: source.currentRect.toJSON() })) });
    } }).observe({ type: 'layout-shift', buffered: true });
  });
  for (let repeat = 0; repeat < 3; repeat++) {
    await page.goto('about:blank'); await page.unrouteAll({ behavior: 'wait' }); await installSettingsFixtures(page, { kind: 'operations' });
    await page.goto('http://127.0.0.1:33302/admin/operations'); await expect(page.locator('.observability-table')).toBeVisible();
    await page.evaluate(async () => { for (let frame = 0; frame < 30; frame++) await new Promise(requestAnimationFrame); });
    const shifts = await page.evaluate(() => (window as Window & { shifts?: { value: number }[] }).shifts ?? []);
    const totalShift = shifts.reduce((sum, shift) => sum + shift.value, 0);
    observations.push({ repeat, originalCommittedBaseline: process.env.WORKLINGO_PHASE6_BASELINE === 'true', shifts, totalShift, environment: 'Same Chromium390x844,localeVI,loopback API fixture, optimized build, initial insertion only; no theme clicks or synthetic passage' });
    expect(totalShift).toBeLessThanOrEqual(.1);
  }
});

test('pending Operations summary retains filter geometry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'vi', domain: '127.0.0.1', path: '/' }]);
  await installSettingsFixtures(page, { kind: 'operations' });
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/v1/admin/operations/summary', async route => { await gate; await route.fallback(); });
  const directory = path.join(phase6Root, 'operations-shift', process.env.WORKLINGO_PHASE6_RUN ?? 'visual'); mkdirSync(directory, { recursive: true });
  try {
    await page.goto('http://127.0.0.1:33302/admin/operations'); await expect(page.getByRole('status')).toBeVisible();
    const before = await page.locator('.observability-filters').boundingBox();
    await page.screenshot({ path: path.join(directory, 'pending.png'), fullPage: true });
    release(); await expect(page.locator('.observability-table')).toBeVisible();
    const after = await page.locator('.observability-filters').boundingBox();
    await page.screenshot({ path: path.join(directory, 'loaded.png'), fullPage: true });
    observations.push({ before, after, snapshotCommit: process.env.WORKLINGO_PHASE6_SNAPSHOT_REF ?? null, method: 'Same fixture; hold only summary response, retain real pending and loaded rendering' });
    expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);
  } finally { release(); }
});
