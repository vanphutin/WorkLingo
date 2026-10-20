import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import { learningProgramCatalogSchema, programContextSchema } from '@worklingo/contracts';

import { publishIeltsBetaFixtures } from './helpers/ielts-beta';
import {
  completeSelfPlacementViaApi,
  expectNoHorizontalOverflow,
  registerLearner,
} from './helpers/learner-onboarding';

test.beforeAll(async ({ baseURL }) => {
  test.setTimeout(90_000);
  if (!baseURL) throw new Error('Playwright baseURL is required for isolated IELTS Beta fixtures.');
  await publishIeltsBetaFixtures(baseURL);
});

test('IELTS Beta opens the gated five-phase hub without changing Intermediate context', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await registerLearner(page, {
    displayName: 'IELTS Beta learner',
    email: `ielts-beta-${randomUUID()}@test.local`,
  });
  await completeSelfPlacementViaApi(page);

  const initialResponse = await page.request.get('/api/v1/me/program-context');
  expect(initialResponse.status()).toBe(200);
  const initial = programContextSchema.parse(await initialResponse.json());
  const activatedResponse = await page.request.put('/api/v1/me/program-context', {
    data: { programSlug: 'intermediate', expectedRevision: initial.enrollment?.revision ?? null },
  });
  expect(activatedResponse.status()).toBe(200);
  const before = programContextSchema.parse(await activatedResponse.json());
  expect(before.activeProgram?.slug).toBe('intermediate');
  expect(before.enrollment).not.toBeNull();

  // Observe real browser requests; never stub catalog, readiness, or learner gates.
  const mutations: string[] = [];
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()) &&
        (pathname === '/api/v1/me/program-context' || request.method() === 'POST')) {
      mutations.push(`${request.method()} ${pathname}`);
    }
  });

  const catalogResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/v1/learning-programs');
  await page.goto('/programs');
  const response = await catalogResponse;
  expect(response.status()).toBe(200);
  const catalog = learningProgramCatalogSchema.parse(await response.json());
  expect(catalog.programs.find((program) => program.slug === 'ielts')).toMatchObject({
    availabilityStatus: 'BETA', isSelectable: true, destination: '/ielts',
    publishedPathCount: 0, publishedLevelCount: 0,
  });
  await expect(page.getByRole('heading', { level: 1, name: 'Choose your learning program' })).toBeVisible();
  await expect(page.getByText('Active program:')).toContainText('Intermediate');
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 2, name: 'IELTS', exact: true }) });
  await expect(card.getByText('Beta', { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const catalogScreenshot = testInfo.outputPath('ielts-beta-programs.png');
  await page.screenshot({ path: catalogScreenshot, fullPage: true });
  await testInfo.attach('IELTS Beta Programs', { path: catalogScreenshot, contentType: 'image/png' });

  const phasePaths = [
    '/api/v1/me/ielts-orientation', '/api/v1/me/ielts-bridge/catalog',
    '/api/v1/me/ielts-integrated/availability', '/api/v1/me/ielts-band-pathway', '/api/v1/me/ielts-mocks',
  ];
  const phaseResponses = phasePaths.map((pathname) => page.waitForResponse((response) =>
    response.request().method() === 'GET' && new URL(response.url()).pathname === pathname));
  await card.getByRole('button', { name: 'Open IELTS program' }).click();
  await expect(page).toHaveURL(/\/ielts$/u);
  await expect(page.getByRole('heading', { level: 1, name: 'IELTS Beta pathway' })).toBeVisible();
  const steps = page.getByRole('navigation', { name: 'IELTS pathway steps' });
  const phases = [
    ['Orientation', '#orientation'], ['Bridge', '#bridge'],
    ['Integrated Practice', '#practice'], ['Band Pathway', '#pathway'], ['Full Mock', '#mock-tests'],
  ] as const;
  await expect(steps.getByRole('link')).toHaveCount(5);
  await expect(page.getByRole('list', { name: 'Your readiness at each IELTS phase' }).getByRole('listitem')).toHaveCount(5);
  for (const [name, href] of phases) {
    await expect(steps.getByRole('link', { name: new RegExp(name, 'u') })).toHaveAttribute('href', href);
    await expect(page.locator(href)).toBeVisible();
  }
  await expect(page.getByText('Complete your Foundation checkpoint to unlock IELTS Orientation.')).toBeVisible();
  for (const message of [
    'Complete IELTS Orientation to unlock Bridge practice.',
    'Complete IELTS Bridge to unlock integrated four-skill practice.',
    'Complete IELTS Bridge to unlock your Band Pathway.',
    'Start your IELTS Band Pathway before taking a full mock.',
  ]) await expect(page.getByText(message, { exact: true })).toBeVisible();
  const phaseStates = await Promise.all(phaseResponses.map(async (pending) => {
    const response = await pending;
    expect(response.status()).toBe(200);
    return response.json();
  }));
  expect(phaseStates).toMatchObject([
    { state: 'locked', reasons: ['FOUNDATION_CHECKPOINT_REQUIRED'] },
    { eligible: false, lockedReason: 'ORIENTATION_REQUIRED' },
    { eligible: false, lockedReason: 'BRIDGE_REQUIRED' },
    { eligible: false, lockedReason: 'BRIDGE_REQUIRED' },
    { eligible: false, lockedReason: 'BAND_PATHWAY_REQUIRED' },
  ]);
  await expect(page.getByRole('link', { name: 'Return to foundation practice' })).toHaveAttribute('href', '/dashboard');
  const orientationCard = page.locator('#orientation');
  await expect(orientationCard.getByRole('link', { name: 'Study Foundation', exact: true })).toHaveAttribute('href', '/dashboard');
  await expect(orientationCard.getByRole('link', { name: 'Check Foundation progress' })).toHaveAttribute('href', '/mastery#checkpoint-heading');
  const orientationResponse = await page.request.get('/api/v1/me/ielts-orientation');
  expect(orientationResponse.status()).toBe(200);
  expect(await orientationResponse.json()).toMatchObject({ state: 'locked', reasons: ['FOUNDATION_CHECKPOINT_REQUIRED'] });
  await expectNoHorizontalOverflow(page);

  const hubScreenshot = testInfo.outputPath('ielts-beta-hub.png');
  await page.screenshot({ path: hubScreenshot, fullPage: true });
  await testInfo.attach('IELTS Beta gated hub', { path: hubScreenshot, contentType: 'image/png' });
  await testInfo.attach('Real IELTS learner gates', { body: JSON.stringify(phaseStates, null, 2), contentType: 'application/json' });
  await page.reload();
  await expect(page.getByText('Complete your Foundation checkpoint to unlock IELTS Orientation.')).toBeVisible();
  const afterResponse = await page.request.get('/api/v1/me/program-context');
  expect(afterResponse.status()).toBe(200);
  expect(await afterResponse.json()).toEqual(before);

  await page.getByRole('link', { name: 'Check Foundation progress' }).click();
  await expect(page).toHaveURL(/\/mastery#checkpoint-heading$/u);
  await expect(page.getByRole('heading', { name: 'Checkpoint assessment', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assess completed session', exact: true })).toBeDisabled();
  await expect(page.getByText('Complete a mission session at your current level before assessing.', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/ielts$/u);

  await page.getByRole('link', { name: 'Study Foundation', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/u);
  await expect(page.getByText('Active program:')).toContainText('Intermediate');
  const returnedResponse = await page.request.get('/api/v1/me/program-context');
  expect(returnedResponse.status()).toBe(200);
  expect(await returnedResponse.json()).toEqual(before);
  expect(mutations, 'Opening/reloading IELTS and returning to Foundation must send no activation or learning POST').toEqual([]);
  await testInfo.attach('Preserved Intermediate context', {
    body: JSON.stringify({ before, after: await returnedResponse.json(), mutations }, null, 2),
    contentType: 'application/json',
  });
});
