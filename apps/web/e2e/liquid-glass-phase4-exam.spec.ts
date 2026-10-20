import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installExamFixtures, sessionId, attemptId } from './fixtures/phase4-exam-contracts';
import { opaqueTextContrast } from './fixtures/phase4-a11y';
const baseline = process.env.WORKLINGO_PHASE4_BASELINE === 'true';
const mode = baseline ? 'before-production' : process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true' ? 'production' : 'development';
const evidence = path.resolve(__dirname, process.env.WORKLINGO_PHASE4_EVIDENCE_ROOT ?? '../../../docs/ui-redesign/evidence/phase4', 'slice-5'); const observations: object[] = [];
async function assertTimer(page: import('@playwright/test').Page, deadline: string) {
  const text = await page.getByRole('timer').innerText(); const match = text.match(/(\d+):(\d+)/u); expect(match).not.toBeNull();
  const shown = Number(match![1]) * 60 + Number(match![2]); const expected = (new Date(deadline).getTime() - Date.now()) / 1000;
  expect(Math.abs(shown - expected)).toBeLessThan(4);
}
test.afterEach(({}, info) => { const dir = path.join(evidence, `${mode}-${process.env.WORKLINGO_PHASE4_RUN ?? 'matrix'}-tests`); mkdirSync(dir, { recursive: true }); writeFileSync(path.join(dir, info.title.replace(/[^a-z0-9]+/giu, '-') + '.json'), JSON.stringify({ title: info.title, status: info.status, mode, fixtures: true, observations: observations.splice(0) }, null, 2) + '\n'); });
const cases = [
  ['integrated', '/ielts/practice', '.bridge-stage-card'], ['integrated', `/ielts/practice/${sessionId}`, '[role=timer]'], ['pathway', '/ielts/pathway', '.band-pathway-card'], ['mock', '/ielts/mock-tests', '.bridge-stage-card'], ['mock', `/ielts/mock-tests/${attemptId}`, '[role=timer]'],
] as const;
for (const theme of ['light', 'dark']) for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) test(`exam matrix ${theme} ${width}`, async ({ page }) => {
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'vi', domain: '127.0.0.1', path: '/' }]); await page.addInitScript((value) => localStorage.setItem('worklingo:theme:v1', value), theme); await page.setViewportSize({ width: width!, height: height! });
  for (const [kind, url, ready] of cases) {
    await page.unrouteAll(); await installExamFixtures(page, { kind }); await page.goto('http://127.0.0.1:33300' + url); await expect(page.locator(ready).first()).toBeVisible();
    const bounds = await page.evaluate(() => ({ client: innerWidth, scroll: document.documentElement.scrollWidth })); if (!baseline) { expect(bounds.scroll, url).toBeLessThanOrEqual(bounds.client); observations.push(...await opaqueTextContrast(page, 'main.bridge-shell :is(h1,h2,h3,p,strong,small,label > span)')); }
    const name = `${kind}-${url.split('/').length > 3 ? 'player' : 'catalog'}-${theme}-${width}`; await page.screenshot({ path: path.join(evidence, `${mode}-${name}.png`), fullPage: true }); observations.push({ url, name, ...bounds });
  }
});
test('exam launcher pathway and player reflow at320 CSS200', async ({ page }) => {
  test.skip(baseline && process.env.WORKLINGO_PHASE4_RUN !== 'red'); await page.setViewportSize({ width: 320, height: 844 });
  for (const [kind, url, ready] of cases) {
    await page.unrouteAll(); await installExamFixtures(page, { kind }); await page.goto('http://127.0.0.1:33300' + url); await expect(page.locator(ready).first()).toBeVisible(); await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    const bounds = await page.evaluate(() => ({ client: innerWidth, scroll: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll('main *')].filter((el) => el.getBoundingClientRect().right > innerWidth + 1).slice(-5).map((el) => ({ class: el.className, tag: el.tagName, right: el.getBoundingClientRect().right })) })); observations.push({ url, width: 320, CSSZoom: 2, ...bounds }); expect(bounds.scroll, url).toBeLessThanOrEqual(bounds.client);
  }
});
test('mock real editor autosave deadline theme locale resize navigation reload submit and pending result', async ({ page }) => {
  test.skip(baseline); const { data, requests } = await installExamFixtures(page, { kind: 'mock' }); const deadline = data.attempt.sectionDeadlineAt;
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`http://127.0.0.1:33300/ielts/mock-tests/${attemptId}`);
  const editor = page.getByRole('textbox').first(); await expect(editor).toHaveValue('My saved answer'); await editor.fill('Preserve this response through actual autosave');
  await expect.poll(() => requests.filter((r) => r.method === 'PUT').length).toBe(1); await editor.evaluate((el) => { el.setAttribute('data-identity', 'same-exam-editor'); });
  await page.locator('.theme-control').click(); await page.locator('.shell-header-surface select').selectOption('en'); await page.locator('.workspace-navigation-toggle').click(); await page.keyboard.press('Escape'); await page.setViewportSize({ width: 1440, height: 900 });
  await expect(editor).toHaveAttribute('data-identity', 'same-exam-editor'); await expect(editor).toHaveValue('Preserve this response through actual autosave'); expect(data.attempt.sectionDeadlineAt).toBe(deadline); await assertTimer(page, deadline);
  await page.reload(); await expect(editor).toHaveValue('Preserve this response through actual autosave'); expect(data.attempt.sectionDeadlineAt).toBe(deadline); await assertTimer(page, deadline);
  for (let section = 0; section < 3; section++) {
    for (const field of await page.locator('.bridge-response textarea').all()) await field.fill('This is a considered fixture response for this task. It preserves the actual exam input and the request contract.');
    const submit = page.locator('.bridge-stage-card button.bridge-primary'); await expect(submit).toBeEnabled(); await submit.click();
    if (section < 2) await expect(page.getByRole('textbox').first()).toBeVisible();
  }
  await expect(page.locator('.bridge-state h1')).toBeVisible(); expect(data.attempt.currentSection).toBe('COMPLETE'); expect(data.report.overallMockBand).toBeNull();
  await page.reload(); await expect(page.locator('.bridge-state h1')).toBeVisible();
  observations.push({ sameEditor: true, autosave: true, serverDeadlinePreserved: deadline, reloadResume: true, threeSectionSubmit: true, reportPending: true, scoring: 'fixture-only', writes: requests.filter((r) => r.method !== 'GET').map((r) => ({ method: r.method, path: new URL(r.url).pathname, body: r.body })) });
});
test('expired mock disables edits and submits existing server snapshot without save', async ({ page }) => {
  test.skip(baseline); const { data, requests } = await installExamFixtures(page, { kind: 'mock' }); data.attempt.sectionDeadlineAt = new Date(Date.now() + 1800).toISOString();
  await page.goto(`http://127.0.0.1:33300/ielts/mock-tests/${attemptId}`); await expect(page.getByRole('textbox').first()).toBeDisabled({ timeout: 6000 });
  const before = requests.filter((r) => r.method === 'PUT').length; await page.locator('.bridge-stage-card button.bridge-primary').click(); await expect.poll(() => data.attempt.currentSection).toBe('WRITING'); expect(requests.filter((r) => r.method === 'PUT')).toHaveLength(before); observations.push({ expiryDisablesEditor: true, noPostExpirySave: true, serverSectionAdvance: true });
});
test('mock multiple question keyboard navigation exposes text answer state and unclipped focus', async ({ page }) => {
  test.skip(baseline); const { data, requests } = await installExamFixtures(page, { kind: 'mock' });
  const original = data.attempt.sectionContent.reading[0]!.questions[0]!;
  data.attempt.sectionContent.reading[0]!.questions.push({ ...original, id: '99999999-9999-4999-8999-999999999998', order: 2, prompt: 'Explain the next step.' });
  await page.setViewportSize({ width: 320, height: 844 }); await page.goto(`http://127.0.0.1:33300/ielts/mock-tests/${attemptId}`);
  const fields = page.locator('.bridge-response textarea'); await expect(fields).toHaveCount(2);
  await expect(page.locator('.exam-answer-state').nth(0)).toHaveText('Đã trả lời'); await expect(page.locator('.exam-answer-state').nth(1)).toHaveText('Chưa trả lời');
  await fields.first().fill('An updated first response'); await page.evaluate(() => { document.documentElement.style.zoom = '2'; }); await fields.first().evaluate((el: HTMLElement) => el.blur()); await fields.first().focus(); await page.keyboard.press('Tab'); await expect(fields.nth(1)).toBeFocused();
  const focused = await fields.nth(1).evaluate((el) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el), n = (parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset)) * 2; return { left: r.left - n, right: r.right + n, top: r.top - n, bottom: r.bottom + n, outline: parseFloat(s.outlineWidth) }; });
  expect(focused.outline).toBeGreaterThanOrEqual(2); expect(focused.left).toBeGreaterThanOrEqual(0); expect(focused.right).toBeLessThanOrEqual(320); expect(focused.top).toBeGreaterThanOrEqual(0); expect(focused.bottom).toBeLessThanOrEqual(844);
  await fields.nth(1).fill('The next step stays available'); await expect(page.locator('.exam-answer-state').nth(1)).toHaveText('Đã trả lời'); await expect.poll(() => requests.filter((r) => r.method === 'PUT').length).toBeGreaterThan(0);
  observations.push({ twoRealQuestionFields: true, nativeTab: true, focusBounds: focused, visibleAnsweredStates: true, CSSZoom: 2 });
});
test('integrated blocks preserve answer duration snapshot deadline progression and completion', async ({ page }) => {
  test.skip(baseline); const { data, requests } = await installExamFixtures(page, { kind: 'integrated' });
  data.session = { ...data.session, blocks: data.session.blocks.map((block, index) => index === 0 ? { ...block, task: { kind: 'single_choice' as const, prompt: 'Choose a clear workplace response.', options: ['Clarify the request', 'Ignore it'] } } : block) };
  const pinned = JSON.stringify(data.session.plan); const ownership = data.session.blocks.map((block) => block.moduleVersionId);
  await page.goto(`http://127.0.0.1:33300/ielts/practice/${sessionId}`);
  const firstStarted = data.session.blocks[0]!.startedAt;
  for (let index = 0; index < 4; index++) {
    const block = data.session.blocks[index]!; await expect(page.getByRole('timer')).toBeVisible();
    if (block.task.kind === 'single_choice') { await page.getByRole('radio').first().check(); await page.locator('.theme-control').click(); await page.setViewportSize({ width: 390, height: 844 }); await expect(page.getByRole('radio').first()).toBeChecked(); }
    if (block.task.kind === 'text_response' || block.task.kind === 'spoken_response') await page.getByRole('textbox').fill('A complete response to the supplied task.');
    await page.locator('.bridge-stage-card > button.bridge-primary').click(); if (index < 3) await expect.poll(() => data.session.currentBlockIndex).toBe(index + 1);
  }
  await expect(page.locator('.bridge-state h1')).toBeVisible(); expect(data.session.completedAt).not.toBeNull(); expect(data.session.blocks[0]!.startedAt).toBe(firstStarted); expect(JSON.stringify(data.session.plan)).toBe(pinned); expect(data.session.blocks.map((block) => block.moduleVersionId)).toEqual(ownership); expect(JSON.parse(requests.find((r) => r.method === 'PUT')!.body!).answer).toBe(0); await page.reload(); await expect(page.locator('.bridge-state h1')).toBeVisible(); observations.push({ duration: data.session.plan.durationMinutes, pinnedPlan: true, profileVersionId: data.session.plan.profileVersionId, moduleVersions: ownership, answerPreserved: true, fourBlocks: true, reloadCompleted: true, writes: requests.filter((r) => r.method === 'PUT').length });
});
test('launchers preserve actual start payloads and pathway target is not measured score', async ({ page }) => {
  test.skip(baseline);
  const integrated = await installExamFixtures(page, { kind: 'integrated' }); integrated.data.availability.activeSessionId = null; await page.goto('http://127.0.0.1:33300/ielts/practice'); await expect(page.locator('.bridge-stage-card button')).toBeVisible(); await page.locator('.bridge-stage-card select').first().selectOption('90'); await page.locator('.bridge-stage-card button').click(); await page.waitForURL(/\/ielts\/practice\/[^/]+$/u); expect(new URL(page.url()).pathname).toBe('/ielts/practice/' + integrated.data.session.id); expect(integrated.requests.some((r) => r.method === 'POST' && JSON.parse(r.body!).durationMinutes === 90)).toBe(true);
  await page.unrouteAll(); const mock = await installExamFixtures(page, { kind: 'mock' }); mock.data.catalog.mocks[0]!.activeAttemptId = null; await page.goto('http://127.0.0.1:33300/ielts/mock-tests'); await page.locator('.bridge-shell > label select').selectOption('PRACTICE'); await page.locator('.bridge-stage-card button').click(); await page.waitForURL(/\/ielts\/mock-tests\/[^/]+$/u); expect(new URL(page.url()).pathname).toBe('/ielts/mock-tests/' + mock.data.attempt.id); expect(mock.requests.some((r) => r.method === 'POST' && JSON.parse(r.body!).mode === 'PRACTICE')).toBe(true);
  await page.unrouteAll(); const band = await installExamFixtures(page, { kind: 'pathway' }); await page.goto('http://127.0.0.1:33300/ielts/pathway'); await page.locator('.band-actions select').selectOption('7'); await page.locator('.band-actions button:not(.bridge-primary)').click(); await expect.poll(() => band.data.band.journey?.targetBand).toBe(7); await page.locator('.band-actions .bridge-primary').click(); await expect.poll(() => band.requests.filter((r) => r.method === 'POST').length).toBe(1); expect(band.data.band.journey?.canAdvance).toBe(false); observations.push({ startContracts: true, targetUpdate: true, noTargetAsScore: true, evaluationGate: true });
});
for (const state of ['locked', 'empty', 'error'] as const) test(`exam ${state} surfaces preserve eligibility`, async ({ page }) => {
  test.skip(baseline); for (const [kind, url] of [['integrated', '/ielts/practice'], ['pathway', '/ielts/pathway'], ['mock', '/ielts/mock-tests']] as const) { await page.unrouteAll(); await installExamFixtures(page, { kind, state }); await page.goto('http://127.0.0.1:33300' + url); if (state === 'error') await expect(page.locator('main [role=alert]')).toBeVisible(); else await expect(page.locator('.bridge-stage-card')).toBeVisible(); observations.push({ kind, state }); }
});
