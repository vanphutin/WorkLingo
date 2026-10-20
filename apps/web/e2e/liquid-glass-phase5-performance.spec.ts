import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { auditRoutes, prepareAuditRoute } from './fixtures/phase5-routes';

// Repeated observations on the same machine; not a GPU/FPS or Web Vitals certification.
test('bounded repeated scroll observations and build payload inventory', async ({ page }) => {
  const samples: object[] = [];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('worklingo:theme:v1', 'dark'));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  for (const url of ['/dashboard', '/admin/settings/ai']) {
    const route = auditRoutes.find(item => item[1] === url)!;
    await prepareAuditRoute(page, route);
    await page.goto('http://127.0.0.1:33300' + url);
    await expect(page.locator(route[2]).first()).toBeVisible();
    for (let repeat = 0; repeat < 3; repeat++) {
      const before = await cdp.send('Performance.getMetrics');
      const frames = await page.evaluate(async () => {
        const times: number[] = [];
        for (let frame = 0; frame < 60; frame++) {
          times.push(await new Promise<number>(resolve => requestAnimationFrame(resolve)));
          scrollTo(0, (frame % 30) * 40);
        }
        scrollTo(0, 0);
        return times.slice(1).map((time, i) => time - times[i]!);
      });
      const after = await cdp.send('Performance.getMetrics');
      const deltas = Object.fromEntries(['LayoutCount', 'RecalcStyleCount', 'LayoutDuration', 'ScriptDuration', 'TaskDuration'].map(name => [name, after.metrics.find(m => m.name === name)!.value - before.metrics.find(m => m.name === name)!.value]));
      frames.sort((a, b) => a - b);
      samples.push({ url, repeat, deltas, frameMedianMs: frames[29], frameP95Ms: frames[56] });
    }
  }
  const chunks = path.resolve(__dirname, '../.next/static/chunks');
  const files = readdirSync(chunks, { recursive: true }).map(String).filter(file => /\.(css|js)$/u.test(file));
  const bytes = (extension: string) => files.filter(file => file.endsWith(extension)).reduce((sum, file) => sum + statSync(path.join(chunks, file)).size, 0);
  const dir = path.resolve(__dirname, '../../../docs/ui-redesign/evidence/phase5', process.env.WORKLINGO_PHASE5_RUN ?? 'before');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'performance.json'), JSON.stringify({ viewport: [390, 844], theme: 'dark', samples, chunkBytes: { css: bytes('.css'), js: bytes('.js') }, limitation: 'Headless Chromium, three repeats, noisy same-host observation; no performance SLA assertion.' }, null, 2) + '\n');
});
