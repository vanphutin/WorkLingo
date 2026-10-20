import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installOrientationBridgeFixtures, moduleId } from './fixtures/phase4-orientation-bridge-contracts';
import { opaqueTextContrast } from './fixtures/phase4-a11y';
const baseline = process.env.WORKLINGO_PHASE4_BASELINE === 'true';
const mode = baseline ? 'before-production' : process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true' ? 'production' : 'development';
const evidence = path.resolve(__dirname, '../../../docs/ui-redesign/evidence/phase4/slice-4');
const observations: object[] = [];
test.afterEach(({}, info) => { const directory = path.join(evidence, `${mode}-${process.env.WORKLINGO_PHASE4_RUN ?? 'matrix'}-tests`); mkdirSync(directory, { recursive: true }); writeFileSync(path.join(directory, info.title.replace(/[^a-z0-9]+/giu, '-') + '.json'), JSON.stringify({ title: info.title, status: info.status, mode, fixtures: true, observations: observations.splice(0) }, null, 2) + '\n'); });
for (const theme of ['light', 'dark']) for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) test(`bridge matrix ${theme} ${width}`, async ({ page }) => {
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'vi', domain: '127.0.0.1', path: '/' }]); await page.addInitScript((value) => localStorage.setItem('worklingo:theme:v1', value), theme); await page.setViewportSize({ width: width!, height: height! });
  for (const [kind, url, ready] of [['orientation', '/ielts/orientation', '.orientation-question'], ['bridge', '/ielts/bridge', '.bridge-module-card'], ['bridge', `/ielts/bridge/${moduleId}`, '.bridge-stage-card']] as const) {
    await page.unrouteAll(); await installOrientationBridgeFixtures(page, { kind }); await page.goto('http://127.0.0.1:33300' + url); await expect(page.locator(ready)).toBeVisible();
    const bounds = await page.evaluate(() => ({ client: innerWidth, scroll: document.documentElement.scrollWidth }));
    if (!baseline) { expect(bounds.scroll).toBeLessThanOrEqual(bounds.client); observations.push(...await opaqueTextContrast(page, '.orientation-player :is(h1,h2,p,legend,label), .bridge-shell :is(h1,h2,p,legend,label)')); }
    const name = `${kind}-${url === '/ielts/bridge' ? 'catalog' : 'player'}-${theme}-${width}`; await page.screenshot({ path: path.join(evidence, `${mode}-${name}.png`), fullPage: true }); observations.push({ url, name, ...bounds });
  }
});
test('orientation and bridge narrow reflow retains controls at CSS200', async ({ page }) => {
  test.skip(baseline && process.env.WORKLINGO_PHASE4_RUN !== 'red');
  for (const width of [320, 390]) for (const [kind, url, ready] of [['orientation', '/ielts/orientation', '.orientation-question'], ['bridge', `/ielts/bridge/${moduleId}`, '.bridge-stage-card']] as const) {
    await page.unrouteAll(); await installOrientationBridgeFixtures(page, { kind }); await page.setViewportSize({ width, height: 844 }); await page.goto('http://127.0.0.1:33300' + url); await expect(page.locator(ready)).toBeVisible(); await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    const bounds = await page.evaluate(() => ({ client: innerWidth, scroll: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll('main *')].filter((el) => el.getBoundingClientRect().right > innerWidth + 1).slice(-5).map((el) => ({ class: el.className, right: el.getBoundingClientRect().right })) })); observations.push({ url, width, CSSZoom: 2, ...bounds }); expect(bounds.scroll).toBeLessThanOrEqual(bounds.client);
    if (!baseline) {
      const control = page.locator(kind === 'orientation' ? '.orientation-question input' : '.bridge-actions button').first(); await control.focus();
      if (kind === 'orientation') { await page.keyboard.press('Space'); await page.keyboard.press('Tab'); }
      const focus = await page.evaluate(() => { const el = document.activeElement!; const r = el.getBoundingClientRect(), s = getComputedStyle(el); const n = (parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset)) * 2; return { tag: el.tagName, left: r.left - n, right: r.right + n, top: r.top - n, bottom: r.bottom + n, outline: parseFloat(s.outlineWidth) }; });
      expect(focus.tag).toBe('BUTTON'); expect(focus.outline).toBeGreaterThanOrEqual(2); expect(focus.left).toBeGreaterThanOrEqual(0); expect(focus.right).toBeLessThanOrEqual(width); expect(focus.top).toBeGreaterThanOrEqual(0); expect(focus.bottom).toBeLessThanOrEqual(844); observations.push({ url, width, nativeKeyboard: true, focus });
    }
  }
});
test('orientation answer feedback version revisions and resume retain actual controls', async ({ page }) => {
  test.skip(baseline); const { data, requests } = await installOrientationBridgeFixtures(page); await page.goto('http://127.0.0.1:33300/ielts/orientation');
  await expect(page.locator('.orientation-player__primary')).toBeDisabled(); await page.getByRole('radio').first().check(); await page.locator('.orientation-player__primary').click(); await expect(page.locator('.orientation-feedback.incorrect')).toBeVisible(); expect(data.orientation.progress?.currentSlideIndex).toBe(1);
  const correct = page.getByRole('radio').nth(1); await correct.check(); await correct.evaluate((el) => { el.setAttribute('data-identity', 'same-radio'); }); await page.locator('.theme-control').click(); await page.setViewportSize({ width: 390, height: 844 }); await expect(correct).toBeChecked(); await expect(correct).toHaveAttribute('data-identity', 'same-radio'); await page.locator('.orientation-player__primary').click(); await expect(page.locator('.orientation-player__slide h1')).toHaveText('Ready'); await page.reload(); await expect(page.locator('.orientation-player__slide h1')).toHaveText('Ready'); await page.locator('.orientation-player__primary').click(); await expect(page.locator('.orientation-player--complete')).toBeVisible();
  expect(data.orientation.progress?.completedAt).not.toBeNull(); expect(requests.filter((r) => r.method === 'PUT').map((r) => JSON.parse(r.body!).expectedRevision)).toEqual([2, 3, 4]); observations.push({ version: data.orientation.progress?.orientationVersionId, wrongAnswerGate: true, answerState: true, reloadResume: true, completed: true });
});
test('bridge sequential stages preserve timed deadline answer and completion snapshots', async ({ page }) => {
  test.skip(baseline); const { data, requests } = await installOrientationBridgeFixtures(page, { kind: 'bridge' }); await page.goto(`http://127.0.0.1:33300/ielts/bridge/${moduleId}`); await expect(page.locator('.bridge-stage-card')).toBeVisible();
  for (let index = 0; index < 10; index++) {
    await expect(page.locator('.bridge-stage-nav [aria-current=step]')).toHaveText(new RegExp(String(index + 1)));
    const stage = data.session.module.stages[index]!;
    if (stage.timeLimitSeconds) { await page.locator('.bridge-stage-card > .bridge-primary').click(); await expect(page.getByRole('timer')).toBeVisible(); const deadline = data.session.progress.timedStageDeadlineAt; await page.locator('.theme-control').click(); await page.setViewportSize({ width: 390, height: 844 }); expect(data.session.progress.timedStageDeadlineAt).toBe(deadline); }
    if (stage.task.kind === 'single_choice') { await expect(page.locator('.bridge-actions button')).toBeDisabled(); await page.getByRole('radio').first().check(); }
    await page.locator('.bridge-actions button').click();
    if (index < 9) await expect.poll(() => data.session.progress.currentStageIndex).toBe(index + 1);
  }
  await expect(page.locator('.bridge-state')).toBeVisible(); expect(data.session.progress.completedAt).not.toBeNull(); await page.reload(); await expect(page.locator('.bridge-state')).toBeVisible();
  observations.push({ pinnedVersion: data.session.module.id, stageSequence: true, timerPreserved: true, completeResume: true, writes: requests.filter((r) => r.method === 'PUT').length });
});
test('orientation and bridge pending transport announces loading then resolves', async ({ page }) => {
  test.skip(baseline);
  for (const kind of ['orientation', 'bridge'] as const) {
    await page.unrouteAll(); await installOrientationBridgeFixtures(page, { kind }); let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route(kind === 'orientation' ? '**/me/ielts-orientation' : '**/me/ielts-bridge/catalog', async (route) => { await gate; await route.fallback(); });
    await page.goto('http://127.0.0.1:33300/ielts/' + (kind === 'orientation' ? 'orientation' : 'bridge'));
    await expect(page.locator(kind === 'orientation' ? '.orientation-player[aria-busy=true]' : '.bridge-state [role=status]')).toBeVisible(); release(); await expect(page.locator(kind === 'orientation' ? '.orientation-question' : '.bridge-module-card')).toBeVisible(); observations.push({ kind, pendingResolved: true });
  }
});
test('orientation narration speed and volume controls expose44px touch targets', async ({ page }) => {
  test.skip(baseline); await installOrientationBridgeFixtures(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('http://127.0.0.1:33300/ielts/orientation');
  await expect(page.locator('.orientation-narration select')).toBeVisible();
  for (const control of await page.locator('.orientation-narration select, .orientation-narration input[type=range]').all()) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  observations.push({ narrationTouchTargets: 44 });
});
for (const state of ['locked', 'empty', 'error'] as const) test(`orientation and bridge ${state} states remain honest`, async ({ page }) => {
  test.skip(baseline); for (const kind of ['orientation', 'bridge'] as const) { await page.unrouteAll(); await installOrientationBridgeFixtures(page, { kind, state }); await page.goto('http://127.0.0.1:33300/ielts/' + (kind === 'orientation' ? 'orientation' : 'bridge')); const owner = page.locator(kind === 'orientation' ? '.orientation-player' : '.bridge-shell'); await expect(owner).toBeVisible(); if (state === 'error') await expect(owner.getByRole('alert')).toBeVisible(); else if (kind === 'orientation') await expect(page.locator('.orientation-player--locked')).toBeVisible(); else await expect(page.locator('.bridge-module-card')).toHaveCount(0); observations.push({ kind, state }); }
});
