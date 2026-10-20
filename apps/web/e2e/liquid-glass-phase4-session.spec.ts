import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installSessionFixtures, sessionId } from './fixtures/phase4-session-contracts';
import { opaqueTextContrast } from './fixtures/phase4-a11y';

const baseline = process.env.WORKLINGO_PHASE4_BASELINE === 'true';
const mode = baseline ? 'before-production' : process.env.WORKLINGO_FOUNDATION_PRODUCTION === 'true' ? 'production' : 'development';
const evidence = path.resolve(__dirname, process.env.WORKLINGO_PHASE4_EVIDENCE_ROOT ?? '../../../docs/ui-redesign/evidence/phase4', 'slice-3');
const observations: object[] = [];
test.afterEach(({}, info) => {
  const directory = path.join(evidence, `${mode}-${process.env.WORKLINGO_PHASE4_RUN ?? 'matrix'}-tests`); mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, info.title.replace(/[^a-z0-9]+/giu, '-') + '.json'), JSON.stringify({ mode, title: info.title, status: info.status, fixtures: true, observations: observations.splice(0) }, null, 2) + '\n');
});
async function appearance(page: Page, theme = 'light') {
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'vi', domain: '127.0.0.1', path: '/' }]);
  await page.addInitScript((value) => localStorage.setItem('worklingo:theme:v1', value), theme);
}
for (const theme of ['light', 'dark']) for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) test(`session matrix ${theme} ${width}`, async ({ page }) => {
  await appearance(page, theme); await page.setViewportSize({ width: width!, height: height! });
  for (const item of [
    { kind: 'onboarding', skill: 'reading', url: '/onboarding' },
    { kind: 'placement', skill: 'reading', url: `/onboarding/placement/${sessionId}` },
    ...(['reading', 'listening', 'speaking', 'writing'] as const).map((skill) => ({ kind: 'session', skill, url: `/sessions/${sessionId}` })),
  ] as const) {
    await page.unrouteAll(); await installSessionFixtures(page, { kind: item.kind, skill: item.skill });
    await page.goto('http://127.0.0.1:33300' + item.url);
    await expect(page.locator(item.kind === 'onboarding' ? '.onboarding-methods' : '.activity-container')).toBeVisible();
    if (item.skill === 'writing') await expect(page.locator('textarea')).toBeEnabled();
    const bounds = await page.evaluate(() => ({ client: innerWidth, scroll: document.documentElement.scrollWidth }));
    if (!baseline) { expect(bounds.scroll, item.url).toBeLessThanOrEqual(bounds.client); observations.push(...await opaqueTextContrast(page, '.onboarding-page :is(h1,h2,p,strong,small), .session-layout :is(h1,h2,h3,p,label)')); }
    const name = `${item.kind}-${item.skill}-${theme}-${width}`;
    await page.screenshot({ path: path.join(evidence, `${mode}-${name}.png`), fullPage: true, animations: 'disabled' });
    observations.push({ name, url: item.url, ...bounds });
  }
});
test('learning content reflow at320 and390 CSS200 preserves full questions and controls', async ({ page }) => {
  test.skip(baseline && process.env.WORKLINGO_PHASE4_RUN !== 'red'); await appearance(page);
  for (const width of [320, 390]) for (const skill of ['reading', 'listening', 'speaking', 'writing'] as const) {
    await page.unrouteAll(); await installSessionFixtures(page, { skill }); await page.setViewportSize({ width, height: 844 });
    await page.goto(`http://127.0.0.1:33300/sessions/${sessionId}`); await expect(page.locator('.activity-container')).toBeVisible();
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    const bounds = await page.evaluate(() => ({ client: innerWidth, scroll: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll('.session-layout *')].filter((el) => el.getBoundingClientRect().right > innerWidth + 1).slice(-10).map((el) => ({ class: el.className, right: el.getBoundingClientRect().right, minWidth: getComputedStyle(el).minWidth })) }));
    observations.push({ width, skill, CSSZoom: 2, ...bounds }); expect(bounds.scroll, `${width}/${skill}`).toBeLessThanOrEqual(bounds.client);
  }
});
test('actual writing draft survives theme navigation resize pause reload and submit', async ({ page }) => {
  test.skip(baseline); await appearance(page); const { requests, data } = await installSessionFixtures(page, { skill: 'writing' });
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto(`http://127.0.0.1:33300/sessions/${sessionId}`);
  const editor = page.locator('textarea'); await expect(editor).toBeEnabled();
  await editor.fill('Hello teammate, I am eager to work with you on this new project.');
  await expect.poll(() => requests.filter((r) => r.method === 'PUT').length).toBe(1);
  await editor.evaluate((el) => { el.dataset.identity = 'same-editor'; });
  await page.locator('.theme-control').click();
  await page.locator('.shell-header-surface select').selectOption('en');
  await page.locator('.workspace-navigation-toggle').click(); await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(editor).toHaveAttribute('data-identity', 'same-editor');
  await expect(editor).toHaveValue(/Hello teammate/);
  await page.locator('.session-actions button').click(); await expect(editor).toBeDisabled();
  await page.locator('.session-actions button').click(); await expect(editor).toBeEnabled();
  await page.reload(); await expect(editor).toHaveValue(/Hello teammate/);
  await page.locator('.activity-footer button').click();
  await expect(page.locator('.session-completed-card')).toBeVisible(); await expect(page.locator('.teacher-feedback')).toBeVisible();
  expect(data.session.status).toBe('completed');
  const submit = requests.find((r) => r.method === 'POST' && r.url.endsWith('/attempts'))!;
  expect(JSON.parse(submit.body!)).toMatchObject({ sessionId, response: { text: 'Hello teammate, I am eager to work with you on this new project.' }, clientAttemptId: expect.any(String) });
  observations.push({ stableEditor: true, autosave: true, reloadResume: true, pauseResume: true, actualSubmission: true, inlinePendingEvaluation: true });
});
test('pending writing save retains latest edit selection and next revision through presentation changes', async ({ page }) => {
  test.skip(baseline); await appearance(page); const { requests } = await installSessionFixtures(page, { skill: 'writing' });
  let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; }); let saves = 0;
  await page.route('**/draft', async (route) => { if (route.request().method() === 'PUT' && saves++ === 0) await gate; await route.fallback(); });
  await page.goto(`http://127.0.0.1:33300/sessions/${sessionId}`); const editor = page.locator('textarea'); await expect(editor).toBeEnabled();
  await editor.fill('First in-flight draft'); await expect.poll(() => saves).toBe(1);
  await editor.fill('Latest unsaved working draft stays here'); await editor.evaluate((el: HTMLTextAreaElement) => { el.setSelectionRange(7, 14); el.dataset.identity = 'pending-editor'; });
  await page.locator('.theme-control').click(); await page.setViewportSize({ width: 390, height: 844 });
  await expect(editor).toHaveValue('Latest unsaved working draft stays here'); await expect(editor).toHaveAttribute('data-identity', 'pending-editor');
  expect(await editor.evaluate((el: HTMLTextAreaElement) => [el.selectionStart, el.selectionEnd])).toEqual([7, 14]);
  release(); await expect.poll(() => requests.filter((r) => r.method === 'PUT').length).toBe(2);
  expect(requests.filter((r) => r.method === 'PUT').map((r) => JSON.parse(r.body!))).toEqual([{ expectedRevision: 0, text: 'First in-flight draft' }, { expectedRevision: 1, text: 'Latest unsaved working draft stays here' }]);
  observations.push({ inFlightSave: true, latestEdit: true, selection: [7, 14], revisionOrder: [0, 1], sameEditor: true });
});
test('native lesson audio retains playback node and authored transcript through appearance resize', async ({ page }) => {
  test.skip(baseline); await appearance(page); await installSessionFixtures(page, { skill: 'listening' });
  await page.goto(`http://127.0.0.1:33300/sessions/${sessionId}`); const audio = page.locator('.audio-player-panel audio');
  await expect(audio).toBeVisible(); await audio.evaluate(async (el: HTMLAudioElement) => { el.dataset.identity = 'same-audio'; el.loop = true; await el.play(); });
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(0);
  await page.locator('.theme-control').click(); await page.setViewportSize({ width: 390, height: 844 });
  await expect(audio).toHaveAttribute('data-identity', 'same-audio'); expect(await audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(false);
  await expect(page.locator('.transcript-text')).toContainText('engineering team');
  await audio.evaluate((el: HTMLAudioElement) => el.pause());
  observations.push({ nativeWavPlayback: true, sameAudioNode: true, playbackRetained: true, transcriptPreserved: true, realProvider: false });
});
test('reading answer persists through appearance changes and advances actual checkpoint', async ({ page }) => {
  test.skip(baseline); await appearance(page); const { data } = await installSessionFixtures(page);
  await page.goto(`http://127.0.0.1:33300/sessions/${sessionId}`); const answer = page.getByRole('radio').nth(1);
  await answer.check(); await page.locator('.theme-control').click(); await page.setViewportSize({ width: 390, height: 844 }); await expect(answer).toBeChecked();
  await page.locator('.activity-footer button').click(); await expect(page.locator('.listening-activity')).toBeVisible(); expect(data.session.currentCheckpoint).toBe(2);
  observations.push({ answerRetained: true, realCheckpointAdvance: true });
});
test('onboarding choices keep unavailable level disabled and placement start resumable', async ({ page }) => {
  test.skip(baseline); await appearance(page); const { data, requests } = await installSessionFixtures(page, { kind: 'onboarding' });
  await page.goto('http://127.0.0.1:33300/onboarding');
  await page.locator('input[name=onboarding-method]').first().check();
  await expect(page.locator('.onboarding-level input:disabled')).toHaveCount(1);
  await page.locator('input[name=onboarding-method]').nth(1).check();
  await page.locator('.onboarding-choice-panel button').click();
  await expect(page).toHaveURL(new RegExp(`/onboarding/placement/${sessionId}$`)); await expect(page.locator('.activity-container')).toBeVisible();
  expect(data.onboarding.activePlacementAttempt?.learningSessionId).toBe(sessionId);
  expect(requests.some((r) => r.method === 'POST' && r.url.endsWith('/placement-attempts'))).toBe(true);
  observations.push({ disabledLevel: true, placementStart: true, pinnedVersion: data.session.lessonVersionId });
});
test('recording track and native recorder survive theme resize and navigation then release on stop', async ({ page }) => {
  test.skip(baseline); await appearance(page);
  await page.addInitScript(() => {
    // Synthetic input into the native MediaRecorder; no physical microphone or upload certification.
    const state = { requested: 0, ended: 0 }; Object.assign(window, { phase4Recorder: state });
    navigator.mediaDevices.getUserMedia = async () => { state.requested++; const context = new AudioContext(); const oscillator = context.createOscillator(); const destination = context.createMediaStreamDestination(); oscillator.connect(destination); oscillator.start(); for (const track of destination.stream.getTracks()) { const original = track.stop.bind(track); track.stop = () => { state.ended++; original(); oscillator.stop(); void context.close(); }; } return destination.stream; };
  });
  await installSessionFixtures(page, { skill: 'speaking' }); await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`http://127.0.0.1:33300/sessions/${sessionId}`);
  await page.locator('.speaking-recorder .primary-action-button').click(); await expect(page.locator('.recording-stop-button')).toBeVisible();
  await page.locator('.theme-control').click(); await page.locator('.workspace-navigation-toggle').click(); await page.keyboard.press('Escape'); await page.setViewportSize({ width: 768, height: 1024 });
  expect(await page.evaluate(() => (window as unknown as { phase4Recorder: { requested: number; ended: number } }).phase4Recorder)).toEqual({ requested: 1, ended: 0 });
  await page.locator('.recording-stop-button').click(); await expect(page.locator('.recording-preview audio')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { phase4Recorder: { ended: number } }).phase4Recorder.ended)).toBe(1);
  await expect(page.locator('.recording-preview .continue-button')).toBeDisabled(); await page.locator('.recording-consent input').check(); await expect(page.locator('.recording-preview .continue-button')).toBeEnabled();
  observations.push({ nativeMediaRecorderSyntheticInput: true, sameTrack: true, releasedOnStop: true, consentGate: true, physicalMicrophone: false, uploadVerified: false });
});
for (const kind of ['onboarding', 'placement', 'session'] as const) test(`${kind} error retry retains actual owner`, async ({ page }) => {
  test.skip(baseline); await appearance(page); const { data, requests } = await installSessionFixtures(page, { kind, state: 'error' });
  const url = kind === 'onboarding' ? '/onboarding' : kind === 'placement' ? `/onboarding/placement/${sessionId}` : `/sessions/${sessionId}`;
  const alert = page.locator(kind === 'onboarding' ? '.onboarding-status-error' : '.session-error-container [role=alert]');
  await page.goto('http://127.0.0.1:33300' + url); await expect(alert).toBeVisible();
  data.mode = 'loaded'; const count = requests.length; await alert.getByRole('button').click();
  await expect(page.locator(kind === 'onboarding' ? '.onboarding-methods' : '.activity-container')).toBeVisible(); expect(requests.length).toBeGreaterThan(count); observations.push({ kind, retryRecovered: true });
});
test('completion empty onboarding and pending request states use existing semantic UI', async ({ page }) => {
  test.skip(baseline); await appearance(page);
  await installSessionFixtures(page, { state: 'empty' }); await page.goto(`http://127.0.0.1:33300/sessions/${sessionId}`);
  await expect(page.locator('.session-completed-card')).toBeVisible(); await expect(page.locator('.session-completed-card a')).toHaveAttribute('href', '/dashboard');
  await page.unrouteAll(); await installSessionFixtures(page, { kind: 'onboarding', state: 'empty' });
  let release!: () => void; const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/me/onboarding', async (route) => { await gate; await route.fallback(); });
  await page.goto('http://127.0.0.1:33300/onboarding'); await expect(page.locator('.onboarding-page[aria-busy=true]')).toBeVisible(); release();
  await page.locator('input[name=onboarding-method]').first().check(); await expect(page.locator('.onboarding-choice-panel button')).toBeDisabled();
  observations.push({ completedRoute: true, noEligibleLevelGate: true, loadingAnnouncement: true });
});
test('narrow onboarding and learning native focus reaches choices and submit with visible indicators', async ({ page }) => {
  test.skip(baseline); await appearance(page); await page.setViewportSize({ width: 320, height: 844 });
  for (const kind of ['onboarding', 'session'] as const) {
    await page.unrouteAll(); await installSessionFixtures(page, { kind });
    await page.goto('http://127.0.0.1:33300' + (kind === 'onboarding' ? '/onboarding' : `/sessions/${sessionId}`));
    if (kind === 'onboarding') { await page.locator('input[name=onboarding-method]').first().check(); await page.locator('.onboarding-level input:not(:disabled)').check(); }
    else await page.getByRole('radio').nth(1).check();
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    const first = page.locator(kind === 'onboarding' ? 'input[name=onboarding-method]' : '.activity-container input:checked').first();
    // check() already focused the reading radio before zoom. Re-enter focus so
    // native scrolling runs at the new scale; focus() on the same node does not.
    await first.evaluate((el: HTMLElement) => el.blur()); await first.focus();
    const expected = kind === 'onboarding' ? ['starting-level', 'confirm'] : ['continue']; const reached: string[] = [];
    for (let i = 0; i < (kind === 'onboarding' ? 3 : 2); i++) {
      const focus = await page.evaluate(() => { const el = document.activeElement as HTMLElement; const r = el.getBoundingClientRect(), s = getComputedStyle(el); const n = (parseFloat(s.outlineWidth) + parseFloat(s.outlineOffset)) * 2; return { name: el.getAttribute('name'), tag: el.tagName, text: el.textContent, left: r.left - n, right: r.right + n, top: r.top - n, bottom: r.bottom + n, outline: parseFloat(s.outlineWidth) }; });
      expect(focus.outline, JSON.stringify(focus)).toBeGreaterThanOrEqual(2); expect(focus.left, JSON.stringify(focus)).toBeGreaterThanOrEqual(0); expect(focus.right, JSON.stringify(focus)).toBeLessThanOrEqual(320); expect(focus.top, JSON.stringify(focus)).toBeGreaterThanOrEqual(0); expect(focus.bottom, JSON.stringify(focus)).toBeLessThanOrEqual(844);
      if (focus.name === 'starting-level') reached.push('starting-level'); if (focus.tag === 'BUTTON') reached.push(kind === 'onboarding' ? 'confirm' : 'continue');
      await page.keyboard.press('Tab');
    }
    expect(reached).toEqual(expected); observations.push({ kind, width: 320, CSSZoom: 2, nativeTab: true, reached, indicatorBounds: true });
  }
});
