import { randomUUID } from 'node:crypto';
import { expect, test } from '@playwright/test';
import { publishMockMediaFixture, expireOwnedMockFixture } from './helpers/ielts-mock-media';
import { completeSelfPlacementViaApi, registerLearner, expectNoHorizontalOverflow } from './helpers/learner-onboarding';
import { ADMIN_CREDENTIALS } from './helpers/content-admin';

let mockTestId: string;
test.beforeAll(async ({ baseURL }) => { test.setTimeout(90_000); mockTestId = await publishMockMediaFixture(baseURL!); });

test('captures real browser audio, reloads saved recordings and lets a teacher hear and review them', async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  await registerLearner(page, { displayName: 'Mock speaker', email: `${randomUUID()}@test.local` });
  await completeSelfPlacementViaApi(page);
  await page.goto('/ielts/mock-tests');
  await page.getByRole('button', { name: 'Start full mock' }).click();
  await page.getByRole('button', { name: 'Check sound' }).click();
  await page.getByRole('button', { name: 'Check microphone' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirm and start' }).click();
  await expect(page).toHaveURL(/\/ielts\/mock-tests\/[0-9a-f-]+$/u);
  const attemptId = page.url().split('/').at(-1)!;
  await page.getByRole('button', { name: 'Play listening part 1', exact: true }).click();
  await expect.poll(() => page.locator('audio').first().evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
  const root = `/api/v1/me/ielts-mocks/attempts/${attemptId}`;
  let attempt = await (await page.request.get(root)).json();
  for (const section of ['LISTENING', 'READING', 'WRITING']) {
    if(section==='WRITING'){await page.reload();await expect(page.getByRole('columnheader',{name:'2016'})).toBeVisible();const image=info.outputPath('writing-task-1-data.png');await page.screenshot({path:image,fullPage:true});await expectNoHorizontalOverflow(page);}
    const response = await page.request.post(`${root}/sections/${section}/submit`, { data: { expectedRevision: attempt.revision } });
    expect(response.status()).toBe(200); attempt = await response.json();
  }
  await page.reload();
  for (let part = 1; part <= 3; part++) {
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Record answer', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Stop recording', exact: true })).toBeVisible();
    // Actual MediaRecorder collects the browser fixture device stream.
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Stop recording', exact: true }).click();
    await page.getByRole('button', { name: 'Upload answer', exact: true }).click();
    await expect(page.getByLabel(`Recorded Speaking part ${part}`, { exact: true })).toBeVisible();
  }
  await page.reload();
  await expect(page.getByLabel('Recorded Speaking part 3', { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Submit full mock', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Teacher review pending' })).toBeVisible();
  const adminContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    expect((await adminContext.request.post('/api/v1/auth/login', { data: ADMIN_CREDENTIALS })).status()).toBe(200);
    const admin = await adminContext.newPage(); await admin.goto('/admin/ielts-mocks');
    const form = admin.locator('article').filter({ hasText: attemptId.slice(0,8) });
    const recording = form.locator('audio').first(); await expect(recording).toBeVisible();
    await recording.evaluate(async (element: HTMLAudioElement) => { await element.play(); });
    await expect.poll(() => recording.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
    await form.locator('textarea').last().fill('Develop complete answers with specific examples.');
    await form.locator('button').last().click();
    await expect(form).toHaveCount(0);
  } finally { await adminContext.close(); }
  await page.reload(); await expect(page.getByRole('heading', { name: /Overall mock band/u })).toBeVisible();
  const screenshot = info.outputPath('ielts-mock-reviewed.png'); await page.screenshot({ path: screenshot, fullPage: true }); await info.attach('Reviewed mock', { path: screenshot, contentType: 'image/png' });
  expect(mockTestId).toBeTruthy();
});

test('strict browser controls retain one listening play and advance an expired section with saved answers',async({page,baseURL})=>{
  test.setTimeout(90000);
  await registerLearner(page,{displayName:'Timed learner',email:`${randomUUID()}@test.local`});await completeSelfPlacementViaApi(page);
  const user=await(await page.request.get('/api/v1/me')).json();
  const response=await page.request.post('/api/v1/me/ielts-mocks/attempts',{data:{clientAttemptId:randomUUID(),mockTestId,mode:'EXAM_SIMULATION'}});expect(response.status()).toBe(200);
  const attempt=await response.json(),root=`/api/v1/me/ielts-mocks/attempts/${attempt.id}`;
  await page.goto(`/ielts/mock-tests/${attempt.id}`);
  await page.getByRole('button',{name:'Play listening part 1',exact:true}).click();
  await expect(page.locator('audio').first()).not.toHaveAttribute('controls');
  await expect(page.getByRole('button',{name:'Pause practice'})).toHaveCount(0);
  await expect.poll(()=>page.locator('audio').first().evaluate((element:HTMLAudioElement)=>element.currentTime)).toBeGreaterThan(0);
  const assetId=attempt.sectionContent.listening[0].audioAssetId;
  expect((await page.request.post(`${root}/audio/${assetId}/playback`,{data:{clientPlayId:randomUUID()}})).status()).toBe(409);
  const question=attempt.sectionContent.listening[0].questions[0];
  expect((await page.request.put(`${root}/responses`,{data:{expectedRevision:attempt.revision,responses:{[question.id]:'answer 1'}}})).status()).toBe(200);
  await expireOwnedMockFixture(baseURL!,attempt.id,user.id);
  await page.reload();await expect(page.getByRole('heading',{name:'Reading section'})).toBeVisible();
  const saved=await(await page.request.get(root)).json();expect(saved.submittedSections).toEqual(['LISTENING']);expect(saved.responses[question.id]).toBe('answer 1');
});
