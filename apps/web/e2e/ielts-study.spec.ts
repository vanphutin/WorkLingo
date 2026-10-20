import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { publishIeltsStudyFixture } from './helpers/ielts-study';
import { completeSelfPlacementViaApi, expectNoHorizontalOverflow, registerLearner } from './helpers/learner-onboarding';

test.beforeAll(async ({ baseURL }) => {
  test.setTimeout(90_000);
  if (!baseURL) throw new Error('Missing isolated browser URL');
  await publishIeltsStudyFixture(baseURL);
});

test('topic study starts 90/120/150 minutes and resumes with Intermediate unchanged', async ({ page }, info) => {
  test.setTimeout(120_000);
  await registerLearner(page, { displayName: 'Topic learner', email: `${randomUUID()}@test.local` });
  await completeSelfPlacementViaApi(page);
  const before = await (await page.request.get('/api/v1/me/program-context')).json();
  const contextMutations: string[] = [];
  page.on('request', request => { if (request.method() === 'PUT' && new URL(request.url()).pathname.endsWith('/program-context')) contextMutations.push(request.url()); });
  for (const minutes of [90, 120, 150]) {
    await page.goto('/ielts/learn');
    await page.getByRole('button', { name: 'Choose topic Education' }).click();
    await expect(page.getByText('useful phrase 0', { exact: true })).toBeVisible();
    await page.getByLabel('Planned study time').selectOption(String(minutes));
    await page.getByRole('button', { name: `Start ${minutes}-minute session` }).click();
    await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]+$/u);
    await expect(page.getByText('IELTS · Education', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const href = page.url();
    const sessionId = href.split('/').at(-1)!;
    const initial = await (await page.request.get(`/api/v1/learning-sessions/${sessionId}`)).json();
    expect(initial.durationMinutes).toBe(minutes);
    expect(initial.plan.blocks).toHaveLength(minutes / 15);
    // Persist through the existing activity API, then prove the real UI resumes
    // the next checkpoint. No session/evidence rows are fabricated here.
    const firstActivityId = initial.plan.blocks[0].activityIds[0] as string;
    const submitted = await page.request.post(`/api/v1/activities/${firstActivityId}/attempts`, { data: { clientAttemptId: randomUUID(), sessionId, response: { text: 'My name is Linh. I work with a study group.' } } });
    expect(submitted.status()).toBe(201);
    await page.reload();
    const resumed = await (await page.request.get(`/api/v1/learning-sessions/${sessionId}`)).json();
    expect(resumed.currentCheckpoint).toBe(1);
    expect(resumed.plan).toEqual(initial.plan);
    await expect(page.getByText('IELTS · Education', { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    if (minutes === 90) {
      const screenshot = info.outputPath('ielts-topic-session.png'); await page.screenshot({ path: screenshot, fullPage: true }); await info.attach('IELTS topic session', { path: screenshot, contentType: 'image/png' });
    }
  }
  await page.goto('/ielts/learn');
  await expect(page.getByRole('link', { name: 'Resume Education' })).toBeVisible();
  expect(await (await page.request.get('/api/v1/me/program-context')).json()).toEqual(before);
  expect(contextMutations).toEqual([]);
});

test('independent hub, introduction replay and history work in both locales and themes',async({page},info)=>{
  test.setTimeout(90000);
  await registerLearner(page,{displayName:'New visitor',email:`${randomUUID()}@test.local`});
  await completeSelfPlacementViaApi(page);
  for(const locale of ['en','vi']) for(const theme of ['light','dark']) {
    await page.goto('/ielts');
    await page.locator('.language-control select').first().selectOption(locale);
    await expect(page.locator('.language-control select').first()).toHaveAttribute('aria-busy','false');
    await page.evaluate(value=>{localStorage.setItem('worklingo:theme:v1',value);},theme);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
    await expect(page.getByRole('heading',{name:locale==='en'?'Choose your next step':'Chọn bước tiếp theo của bạn'})).toBeVisible();
    const links=page.locator('.ielts-hub-navigation a');await expect(links).toHaveCount(3);
    await expect(page.locator('a[href="/ielts/learn"]').last()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const screenshot=info.outputPath(`ielts-hub-${locale}-${theme}.png`);await page.screenshot({path:screenshot,fullPage:true});
  }
  await page.locator('.language-control select').first().selectOption('en');
  await expect(page.locator('.language-control select').first()).toHaveAttribute('aria-busy','false');
  await page.goto('/ielts/introduction');
  await page.getByRole('button',{name:'3. Choose your section'}).click();
  await expect(page.getByRole('heading',{name:'Choose your section',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Skip and start learning'}).click();
  await expect(page).toHaveURL(/\/ielts\/learn$/u);
  await page.goto('/ielts/history');
  await page.getByRole('link',{name:'IELTS introduction',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Choose your section',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'1. What is IELTS?'}).click();
  await expect(page.getByRole('heading',{name:'What is IELTS?',exact:true})).toBeVisible();
});
