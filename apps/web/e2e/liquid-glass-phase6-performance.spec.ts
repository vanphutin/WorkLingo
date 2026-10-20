import { test, expect } from '@playwright/test';
import { phase6Recorder } from './fixtures/phase6-evidence';
import { auditRoutes, prepareAuditRoute } from './fixtures/phase5-routes';
import { sessionId } from './fixtures/phase4-session-contracts';
import { attemptId } from './fixtures/phase4-exam-contracts';
import { importId } from './fixtures/phase4-authoring-contracts';

const observations = phase6Recorder();
test('repeated lab paint shift interaction and scroll observations', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const metrics = { lcp: [] as number[], shifts: [] as { start: number; value: number }[], interactions: [] as { id: number; duration: number }[], supported: PerformanceObserver.supportedEntryTypes };
    (window as Window & { phase6Metrics?: typeof metrics }).phase6Metrics = metrics;
    if (metrics.supported.includes('largest-contentful-paint')) new PerformanceObserver(list => metrics.lcp.push(...list.getEntries().map(entry => entry.startTime))).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => { for (const entry of list.getEntries()) { const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean }; if (!shift.hadRecentInput) metrics.shifts.push({ start: shift.startTime, value: shift.value }); } }).observe({ type: 'layout-shift', buffered: true });
    if (metrics.supported.includes('event')) new PerformanceObserver(list => { for (const entry of list.getEntries()) { const event = entry as PerformanceEntry & { interactionId: number }; if (event.interactionId > 0) metrics.interactions.push({ id: event.interactionId, duration: event.duration }); } }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  });
  for (const url of ['/dashboard', '/settings', `/sessions/${sessionId}`, `/ielts/mock-tests/${attemptId}`, `/admin/content/${importId}`, '/admin/operations']) for (let repeat = 0; repeat < 3; repeat++) {
    const route = auditRoutes.find(item => item[1] === url)!; await prepareAuditRoute(page, route);
    await page.goto('http://127.0.0.1:33300' + url); await expect(page.locator(route[2]).first()).toBeVisible();
    if (url.startsWith('/sessions/')) await page.locator('.reading-text').evaluate(el => { el.textContent = ((el.textContent ?? '') + '\n\n').repeat(80); });
    for (let interaction = 0; interaction < 6; interaction++) await page.locator('.theme-control').first().click();
    const measurement = await page.evaluate(async () => {
      const frames: number[] = []; for (let frame = 0; frame < 60; frame++) { frames.push(await new Promise<number>(resolve => requestAnimationFrame(resolve))); scrollTo(0, frame * 20); }
      const metrics = (window as Window & { phase6Metrics: { lcp: number[]; shifts: { start: number; value: number }[]; interactions: { id: number; duration: number }[]; supported: string[] } }).phase6Metrics;
      let windowStart = 0, previous = 0, sum = 0, cls = 0;
      for (const shift of metrics.shifts) { if (shift.start - previous > 1000 || shift.start - windowStart > 5000) { sum = 0; windowStart = shift.start; } sum += shift.value; cls = Math.max(cls, sum); previous = shift.start; }
      const durations = [...new Map(metrics.interactions.map(event => [event.id, Math.max(event.duration, ...metrics.interactions.filter(other => other.id === event.id).map(other => other.duration))])).values()];
      return { lcpMs: metrics.lcp.at(-1) ?? null, CLSObservedSessionWindow: cls, sampledInteractionMaxMs: durations.length ? Math.max(...durations) : null, observedInteractionCount: durations.length, eventTiming: metrics.supported.includes('event'), frameIntervals: frames.slice(1).map((time, i) => time - frames[i]!) };
    });
    observations.push({ url, repeat, ...measurement, environment: 'Lab: headless Chromium,390x844, loopback fixtures, no network/CPU throttle, 6 theme clicks,60 scroll frames; reading text repeated80x as synthetic long passage; not field INP/CWV or60FPS qualification', baseline: 'No equivalent pre-redesign LCP/CLS/interaction baseline; Phase5 scroll observations only' });
  }
});
