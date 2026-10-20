import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installLearningFixtures, type LearningFixtureState } from './fixtures/phase4-learning-contracts';
import { programsMessages } from '../src/i18n/messages/programs';
import { masteryMessages } from '../src/i18n/messages/mastery';
import { opaqueTextContrast } from './fixtures/phase4-a11y';

const baseline = process.env.WORKLINGO_PHASE4_BASELINE === 'true';
const mode = baseline ? process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true' ? 'before-production' : 'before' : process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true' ? 'production' : 'after';
const evidence = path.resolve(__dirname, process.env.WORKLINGO_PHASE4_EVIDENCE_ROOT ?? '../../../docs/ui-redesign/evidence/phase4', 'slice-2');
const observations: object[] = [];
test.afterEach(({}, info) => {
  const directory = path.join(evidence, `${mode}-${process.env.WORKLINGO_PHASE4_RUN ?? 'matrix'}-tests`);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, info.title.replace(/[^a-z0-9]+/giu, '-') + '.json'), JSON.stringify({ mode, title: info.title, status: info.status, fixtures: true, observations: observations.splice(0) }, null, 2) + '\n');
});
for (const theme of ['light', 'dark']) for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
  test(`learning matrix ${theme} ${width}`, async ({ page }) => {
    await page.context().addCookies([{ name: 'worklingo_locale', value: 'vi', domain: '127.0.0.1', path: '/' }]);
    await page.addInitScript((value) => localStorage.setItem('worklingo:theme:v1', value), theme);
    const failures: string[] = []; page.on('pageerror', (e) => failures.push(e.message));
    await installLearningFixtures(page);
    await page.setViewportSize({ width: width!, height: height! });
    for (const url of ['/dashboard', '/programs', '/mastery']) {
      await page.goto('http://127.0.0.1:33300' + url);
      await expect(page.locator('main h1')).toBeVisible();
      if (url === '/dashboard') await expect(page.locator('.next-mission-card h2')).toHaveText('Handle a workplace request');
      if (url === '/programs') await expect(page.locator('.program-card')).toHaveCount(4);
      if (url === '/mastery') await expect(page.locator('.mastery-block h3')).toHaveText('follow up');
      const bounds = await page.evaluate(() => ({ client: innerWidth, scroll: document.documentElement.scrollWidth }));
      if (!baseline) expect(bounds.scroll, url).toBeLessThanOrEqual(bounds.client);
      if (!baseline) observations.push(...await opaqueTextContrast(page, '.dashboard-container :is(h1,h2,h3,p,.stat-value,.stat-label), .program-catalog-page :is(h1,h2,p,dt,dd), .evidence-workspace :is(h1,h2,h3,p,strong)'));
      const file = `${mode}-${url.slice(1)}-${theme}-${width}.png`;
      await page.screenshot({ path: path.join(evidence, file), fullPage: true, animations: 'disabled' });
      observations.push({ url, theme, width, height, ...bounds, file });
    }
    expect(failures).toEqual([]);
  });
}

test('learning content reflows at narrow widths and CSS200 without hiding overflow', async ({ page }) => {
  test.skip(baseline && process.env.WORKLINGO_PHASE4_RUN !== 'red');
  await installLearningFixtures(page);
  for (const width of [320, 360, 390]) for (const url of ['/dashboard', '/programs', '/mastery']) {
    await page.setViewportSize({ width, height: 844 }); await page.goto('http://127.0.0.1:33300' + url);
    await expect(page.locator('main h1')).toBeVisible();
    if (url === '/mastery') await expect(page.locator('.mastery-block h3')).toHaveText('follow up');
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    const bounds = await page.evaluate(() => ({ client: innerWidth, scroll: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll('main *')].filter((el) => el.getBoundingClientRect().right > innerWidth + 1).slice(-12).map((el) => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right, minWidth: getComputedStyle(el).minWidth, whiteSpace: getComputedStyle(el).whiteSpace })) }));
    observations.push({ url, width, CSSZoom: 2, ...bounds });
    expect(bounds.scroll, `${url} ${width}`).toBeLessThanOrEqual(bounds.client);
  }
});

for (const state of ['empty', 'error'] as LearningFixtureState[]) test(`learning ${state} states preserve eligibility and retry`, async ({ page }) => {
  test.skip(baseline); const { requests } = await installLearningFixtures(page, { state });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of ['/dashboard', '/programs', '/mastery']) {
    await page.goto('http://127.0.0.1:33300' + url);
    if (state === 'error') {
      await expect(page.locator('main [role=alert]').first()).toBeVisible();
      const count = requests.length;
      await page.locator('main [role=alert] button').first().click();
      await expect.poll(() => requests.length).toBeGreaterThan(count);
      await expect(page.locator('main [role=alert]').first()).toBeVisible();
    }
    else if (url === '/dashboard') await expect(page.locator('.session-launcher button')).toBeDisabled();
    else if (url === '/programs') { await expect(page.locator('.program-catalog-state h2')).toHaveText(programsMessages.vi.empty); await expect(page.locator('.program-card')).toHaveCount(0); }
    else await expect(page.locator('.checkpoint-actions button').first()).toBeDisabled();
    await page.screenshot({ path: path.join(evidence, `${mode}-${url.slice(1)}-${state}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    observations.push({ url, state });
  }
});

test('saved mission, program availability and evidence filters keep existing contracts', async ({ page }) => {
  test.skip(baseline); const { requests } = await installLearningFixtures(page);
  await page.goto('http://127.0.0.1:33300/dashboard');
  await expect(page.locator('.next-mission-card a')).toHaveAttribute('href', '/sessions/55555555-5555-4555-8555-555555555555');
  await expect(page.locator('#session-duration-select')).toHaveCount(0);
  await page.locator('#dashboard-tab-weekly').click();
  await page.locator('#weekly-target-select').selectOption('4');
  await expect(page.locator('#weekly-target-select')).toHaveValue('4');
  expect(requests.some((r) => r.method === 'PATCH' && r.body === '{"targetDays":4}')).toBe(true);
  await page.goto('http://127.0.0.1:33300/programs');
  await expect(page.locator('.program-action:disabled')).toHaveCount(3);
  await page.locator('.program-action:not(:disabled)').click();
  await expect(page).toHaveURL(/\/dashboard$/u);
  expect(requests.some((r) => r.method === 'PUT' && new URL(r.url).pathname === '/api/v1/me/program-context')).toBe(true);
  await page.goto('http://127.0.0.1:33300/mastery');
  await expect(page.locator('.error-entries li')).toHaveCount(1);
  const filter = page.locator('.evidence-filter select');
  await filter.selectOption('writing');
  await expect(page.locator('.error-entries li')).toHaveCount(0);
  expect(requests.some((r) => new URL(r.url).searchParams.get('skill') === 'writing')).toBe(true);
  await filter.selectOption('reading');
  await expect(page.locator('.error-entries li')).toHaveCount(1);
  await page.locator('.evidence-section-links a[href="#checkpoint-heading"]').click();
  await expect(page.locator('#checkpoint-heading')).toBeInViewport();
  await page.locator('.checkpoint-actions button').first().click();
  await expect(page.locator('.checkpoint-result h3')).toHaveText(masteryMessages.vi.evaluationPending);
  await expect(page.getByRole('button', { name: masteryMessages.vi.confirmNext })).toHaveCount(0);
  const checkpoint = requests.find((r) => r.method === 'POST' && new URL(r.url).pathname === '/api/v1/me/checkpoint-assessments');
  expect(JSON.parse(checkpoint!.body!)).toMatchObject({ sessionId: '11111111-1111-4111-8111-111111111111', clientAssessmentId: expect.any(String) });
  observations.push({ resumeDestination: true, unavailableDisabled: 3, activationPayloadPreserved: true, evidenceFilterRequests: true, checkpointAnchor: true });
});

test('English evidence keeps authored content and form selection through appearance changes', async ({ page }) => {
  test.skip(baseline); await installLearningFixtures(page, { locale: 'en' });
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'en', domain: '127.0.0.1', path: '/' }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:33300/mastery');
  await expect(page.locator('.mastery-block h3')).toHaveText('follow up');
  const filter = page.locator('.evidence-filter select'); await filter.selectOption('reading');
  await page.locator('.theme-control').click();
  await expect(filter).toHaveValue('reading');
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  await page.evaluate(() => { document.documentElement.dataset.reduceTransparency = 'true'; document.documentElement.style.zoom = '2'; });
  await expect(page.locator('.evidence-nav-surface')).toHaveCSS('backdrop-filter', 'none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const assessment = page.locator('.checkpoint-actions button').first();
  await expect(assessment).toBeEnabled();
  await filter.focus(); await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Practice again', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(assessment).toBeFocused();
  const focus = await assessment.evaluate((el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); const inset = (parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset)) * 2; return { left: r.left - inset, right: r.right + inset, top: r.top - inset, bottom: r.bottom + inset, width: parseFloat(s.outlineWidth) }; });
  expect(focus.width).toBeGreaterThanOrEqual(2); expect(focus.left).toBeGreaterThanOrEqual(0); expect(focus.right).toBeLessThanOrEqual(390); expect(focus.top).toBeGreaterThanOrEqual(0); expect(focus.bottom).toBeLessThanOrEqual(844);
  observations.push({ locale: 'en', authoredContentPreserved: true, selectionPreserved: true, CSSZoom: 2, reducedTransparency: true, reducedMotion: true, forcedColors: true });
});

test('learning loading states announce pending data and resolve on real component routes', async ({ page }) => {
  test.skip(baseline); await installLearningFixtures(page);
  for (const item of [
    { url: '/dashboard', endpoint: '**/api/v1/me/progress', pending: '.dashboard-container[aria-busy=true]', loaded: '.next-mission-card' },
    { url: '/programs', endpoint: '**/api/v1/learning-programs', pending: '.program-catalog-state[role=status]', loaded: '.program-list' },
    { url: '/mastery', endpoint: '**/api/v1/me/memory-health', pending: '[aria-labelledby=memory-heading][aria-busy=true]', loaded: '.health-overall' },
  ]) {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route(item.endpoint, async (route) => { await gate; await route.fallback(); });
    await page.goto('http://127.0.0.1:33300' + item.url);
    await expect(page.locator(item.pending)).toBeVisible();
    await page.screenshot({ path: path.join(evidence, `${mode}-${item.url.slice(1)}-loading.png`), fullPage: true });
    release(); await expect(page.locator(item.loaded)).toBeVisible();
    await page.unroute(item.endpoint);
    observations.push({ url: item.url, loadingAnnouncement: true, resolved: true });
  }
});
