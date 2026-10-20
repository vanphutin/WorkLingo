import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installAuthoringFixtures, importId } from './fixtures/phase4-authoring-contracts';
import { opaqueTextContrast } from './fixtures/phase4-a11y';
const baseline = process.env.WORKLINGO_PHASE4_BASELINE === 'true';
const mode = baseline ? 'before-production' : process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true' ? 'production' : 'development';
const evidence = path.resolve(__dirname, '../../../docs/ui-redesign/evidence/phase4/slice-6'); const observations: object[] = [];
test.afterEach(({}, info) => { const dir = path.join(evidence, `${mode}-${process.env.WORKLINGO_PHASE4_RUN ?? 'matrix'}-tests`); mkdirSync(dir, { recursive: true }); writeFileSync(path.join(dir, info.title.replace(/[^a-z0-9]+/giu, '-') + '.json'), JSON.stringify({ title: info.title, status: info.status, fixtures: true, observations: observations.splice(0) }, null, 2) + '\n'); });
const cases = [
  ['content', '/admin/content', '.content-table'], ['content', '/admin/content/new', '#raw-source-input'], ['content', `/admin/content/${importId}`, '.editor-textarea'],
  ['curriculum', '/admin/curriculum', '.curriculum-header'], ['orientation', '/admin/ielts-orientation', '.orientation-editor'], ['bridge', '/admin/ielts-bridge', '.bridge-editor'],
  ['integrated', '/admin/ielts-integrated', '.bridge-stage-card input'], ['band', '/admin/ielts-band-curriculum', '.bridge-response textarea'], ['mock', '/admin/ielts-mocks', '.bridge-response textarea'],
] as const;
for (const theme of ['light', 'dark']) for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) test(`authoring matrix ${theme} ${width}`, async ({ page }) => {
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'vi', domain: '127.0.0.1', path: '/' }]); await page.addInitScript((value) => localStorage.setItem('worklingo:theme:v1', value), theme); await page.setViewportSize({ width: width!, height: height! });
  for (const [kind, url, ready] of cases) {
    await page.unrouteAll(); await installAuthoringFixtures(page, { kind }); await page.goto('http://127.0.0.1:33300' + url); await expect(page.locator(ready).first()).toBeVisible();
    const bounds = await page.evaluate(() => ({ client: innerWidth, scroll: document.documentElement.scrollWidth })); if (!baseline) { expect(bounds.scroll, url).toBeLessThanOrEqual(bounds.client); observations.push(...await opaqueTextContrast(page, '.admin-main-content :is(h1,h2,h3,p,strong,small,label > span)')); }
    const name = url.replace('/admin/', '').replaceAll('/', '-'); await page.screenshot({ path: path.join(evidence, `${mode}-${name}-${theme}-${width}.png`), fullPage: true }); observations.push({ url, theme, width, ...bounds });
  }
});
test('authoring reflow at320 CSS200 retains visible editor and controls', async ({ page }) => {
  test.skip(baseline && process.env.WORKLINGO_PHASE4_RUN !== 'red'); await page.setViewportSize({ width: 320, height: 844 });
  for (const [kind, url, ready] of cases) {
    await page.unrouteAll(); await installAuthoringFixtures(page, { kind }); await page.goto('http://127.0.0.1:33300' + url); await expect(page.locator(ready).first()).toBeVisible(); await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    await expect(page.locator(ready).first()).toBeVisible();
    const bounds = await page.evaluate(() => ({ client: innerWidth, scroll: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll('.admin-main-content *')].filter((el) => el.getBoundingClientRect().right > innerWidth + 1).slice(-6).map((el) => ({ class: el.className, tag: el.tagName, right: el.getBoundingClientRect().right })) })); observations.push({ url, CSSZoom: 2, ...bounds }); expect(bounds.scroll, url).toBeLessThanOrEqual(bounds.client);
  }
});
test('content real source autosave retains editor through appearance and validates parser preview', async ({ page }) => {
  test.skip(baseline); const { data, requests } = await installAuthoringFixtures(page, { kind: 'content', locale: 'en' });
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'en', domain: '127.0.0.1', path: '/' }]);
  await page.goto(`http://127.0.0.1:33300/admin/content/${importId}`); const editor = page.locator('.editor-textarea'); await expect(editor).toBeVisible();
  const source = data.content.rawSource + '\n'; await editor.fill(source); await editor.evaluate((el) => el.setAttribute('data-identity', 'same-source'));
  await page.locator('.theme-control').click(); await page.setViewportSize({ width: 390, height: 844 }); await expect(editor).toHaveValue(source); await expect(editor).toHaveAttribute('data-identity', 'same-source');
  await expect.poll(() => data.content.draftRevision).toBe(2); expect(data.content.rawSource).toBe(source);
  await page.getByRole('tab', { name: /validation/iu }).click(); await page.locator('.validation-panel button').first().click(); await expect.poll(() => data.content.status).toBe('VALIDATED');
  await page.getByRole('tab', { name: /preview/iu }).click(); await expect(page.locator('.lesson-preview-container')).toBeVisible();
  await page.getByRole('tab', { name: /publish/iu }).click(); await expect(page.locator('.publish-card,.published-card').first()).toBeVisible();
  observations.push({ realSourceSaved: true, editorIdentity: true, parserValidation: true, previewAndPublishView: true, writes: requests.filter((r) => r.method !== 'GET').map((r) => ({ method: r.method, url: r.url })) });
});
for (const kind of ['orientation', 'bridge', 'integrated', 'band', 'mock'] as const) test(`authoring ${kind} draft identity save revision and publish gate`, async ({ page }) => {
  test.skip(baseline); const { data, requests } = await installAuthoringFixtures(page, { kind, locale: 'en' });
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'en', domain: '127.0.0.1', path: '/' }]);
  const route = cases.find((item) => item[0] === kind)!; await page.goto('http://127.0.0.1:33300' + route[1]); await expect(page.locator(route[2]).first()).toBeVisible();
  const field = kind === 'orientation' ? page.locator('input[name=courseTitle]') : kind === 'bridge' ? page.locator('.bridge-editor__module input').first() : kind === 'integrated' ? page.locator('.bridge-stage-card input').first() : page.locator('.bridge-response textarea').first();
  const original = await field.inputValue(); let changed = original;
  if (kind === 'orientation' || kind === 'bridge') changed += ' — long authored workplace title';
  if (kind === 'integrated') { changed = String(Number(original) + 1); const second = page.locator('.bridge-stage-card input').nth(1); await second.fill(String(Number(await second.inputValue()) - 1)); }
  if (kind === 'band' || kind === 'mock') { const parsed = JSON.parse(original); parsed.title += ' revised'; changed = JSON.stringify(parsed, null, 2); }
  await field.fill(changed); await field.evaluate((el) => el.setAttribute('data-identity', 'same-authoring-field')); await page.locator('.theme-control').click(); await page.setViewportSize({ width: 390, height: 844 }); await expect(field).toHaveValue(changed); await expect(field).toHaveAttribute('data-identity', 'same-authoring-field');
  const publish = kind === 'orientation' ? page.locator('.orientation-admin__toolbar button').nth(2) : kind === 'bridge' ? page.locator('.bridge-admin__toolbar button').nth(2) : kind === 'mock' ? page.locator('.bridge-stage-card').first().locator('button.bridge-primary').last() : page.locator('.bridge-actions button.bridge-primary'); await expect(publish).toBeDisabled();
  await page.getByRole('button', { name: /^save draft$/iu }).click();
  await expect.poll(() => kind === 'integrated' ? data.integrated[0]!.draftRevision : data[kind].draftRevision).toBe(2); await expect(publish).toBeDisabled();
  if (kind === 'integrated') expect(data.integrated[0]!.draft.allocations[0]!.targetMinutes).toBe(Number(changed));
  expect(requests.some((r) => r.method === 'PUT' && JSON.parse(r.body!).expectedRevision === 1)).toBe(true);
  await page.reload(); await expect(field).toHaveValue(changed); observations.push({ kind, draftIdentity: true, saveRevision: [1, 2], reload: true, publicationGate: true });
});
test('content table can be reached and scrolled with the native keyboard', async ({ page }) => {
  test.skip(baseline); await installAuthoringFixtures(page, { kind: 'content' }); await page.setViewportSize({ width: 320, height: 844 }); await page.goto('http://127.0.0.1:33300/admin/content'); const region = page.locator('.content-table-wrapper'); await expect(region).toBeVisible(); await region.focus(); await expect(region).toBeFocused(); await page.keyboard.press('ArrowRight'); await expect.poll(() => region.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0); observations.push({ namedTableRegion: true, nativeKeyboardHorizontalScroll: true });
});
test('orientation validation publication and stale revision preserve UI gates', async ({ page }) => {
  test.skip(baseline); const { data } = await installAuthoringFixtures(page, { kind: 'orientation', locale: 'en' }); await page.context().addCookies([{ name: 'worklingo_locale', value: 'en', domain: '127.0.0.1', path: '/' }]);
  await page.goto('http://127.0.0.1:33300/admin/ielts-orientation'); const buttons = page.locator('.orientation-admin__toolbar button'); await expect(buttons.nth(2)).toBeDisabled(); await buttons.nth(1).click(); await expect(buttons.nth(2)).toBeEnabled(); await buttons.nth(2).click(); await expect.poll(() => data.orientation.versions.length).toBe(1);
  await expect(page.locator('.orientation-versions li')).toHaveCount(1); await expect(buttons.first()).toBeEnabled();
  data.orientation = { ...data.orientation, draftRevision: data.orientation.draftRevision + 1 }; await page.locator('input[name=courseTitle]').fill('Local draft kept on conflict'); await buttons.first().click(); await expect(page.locator('.orientation-notice--error')).toBeVisible(); await expect(page.locator('input[name=courseTitle]')).toHaveValue(data.orientation.draft.title); await expect(buttons.nth(2)).toBeDisabled(); observations.push({ validateBeforePublish: true, publication: true, staleRevisionError: true, existingConflictReload: true });
});
for (const state of ['empty', 'error'] as const) test(`authoring ${state} actual states`, async ({ page }) => {
  test.skip(baseline); for (const [kind, url] of cases.filter((item) => item[1] !== '/admin/content/new' && !item[1].includes(importId))) {
    if (state === 'empty' && (kind === 'orientation' || kind === 'band')) continue;
    await page.unrouteAll(); await installAuthoringFixtures(page, { kind, state }); await page.goto('http://127.0.0.1:33300' + url);
    if (state === 'error') await expect(page.locator('.admin-main-content [role=alert]').first()).toBeVisible(); else await expect(page.locator('.admin-main-content')).toBeVisible();
    observations.push({ kind, state });
  }
});
test('curriculum blockers form cancel and authoring native focus remain accessible at320 CSS200', async ({ page }) => {
  test.skip(baseline); await page.setViewportSize({ width: 320, height: 844 }); const { requests } = await installAuthoringFixtures(page, { kind: 'curriculum', locale: 'en' }); await page.context().addCookies([{ name: 'worklingo_locale', value: 'en', domain: '127.0.0.1', path: '/' }]);
  await page.goto('http://127.0.0.1:33300/admin/curriculum'); await expect(page.getByRole('button', { name: /archive path.*General English/iu })).toBeDisabled(); await page.locator('.curriculum-header .curriculum-actions button').last().click(); await expect(page.locator('#path-name')).toBeVisible(); await page.locator('#path-name').fill('Unsaved authoring path'); await page.locator('.theme-control').click(); await expect(page.locator('#path-name')).toHaveValue('Unsaved authoring path'); await page.locator('.curriculum-form-card').getByRole('button', { name: /^cancel$/iu }).click(); expect(requests.filter((r) => r.method !== 'GET')).toHaveLength(0);
  for (const [kind, url, ready] of cases.filter((item) => ['content','orientation','bridge','integrated','band','mock'].includes(item[0]) && item[1] !== '/admin/content')) {
    await page.unrouteAll(); await installAuthoringFixtures(page, { kind }); await page.goto('http://127.0.0.1:33300' + url); await expect(page.locator(ready).first()).toBeVisible(); await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    const region = page.locator(ready).first(); const control = ['INPUT', 'TEXTAREA', 'SELECT'].includes(await region.evaluate((el) => el.tagName)) ? region : region.locator('input:not([type=file]),textarea,select').first(); await control.focus(); await expect(control).toBeFocused();
    const bounds = await control.evaluate((el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el), offset = 2 * (parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset)); return { left: r.left - offset, right: r.right + offset, top: r.top - offset, bottom: r.bottom + offset, outline: parseFloat(s.outlineWidth) }; });
    expect(bounds.outline).toBeGreaterThanOrEqual(2); expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(320); observations.push({ url, CSSZoom: 2, focus: bounds });
    const clips = await control.evaluate((el) => { const result: { left: number; right: number; class: string }[] = []; for (let parent = el.parentElement; parent; parent = parent.parentElement) { if (/hidden|auto|scroll|clip/u.test(getComputedStyle(parent).overflowX)) { const r = parent.getBoundingClientRect(); result.push({ left: r.left, right: r.right, class: parent.className }); } } return result; });
    for (const clip of clips) { expect(bounds.left, clip.class).toBeGreaterThanOrEqual(clip.left); expect(bounds.right, clip.class).toBeLessThanOrEqual(clip.right); }
  }
});
