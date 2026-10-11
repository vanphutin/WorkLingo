import { expect, test } from '@playwright/test';

import { createValidLessonSource, loginAsContentAdmin } from './helpers/content-admin';
import {
  expectMinimumControlHeight,
  expectNoHorizontalOverflow,
  installBrowserSpeechStub,
  registerAndOnboardLearner,
} from './helpers/audio-settings';

test.describe('Audio source and publishing journeys', () => {
  test('learner saves browser speech and gets explicit playback fallbacks', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = `${Date.now()}_${testInfo.project.name.replaceAll('-', '_')}`;
    await installBrowserSpeechStub(page);
    await registerAndOnboardLearner(page, suffix);

    await page.goto('/settings/audio');
    await expect(page.getByRole('heading', { name: 'Audio settings' })).toBeVisible();
    expect(await page.evaluate(() =>
      (window as Window & { __worklingoSpeechCalls?: number }).__worklingoSpeechCalls ?? 0,
    )).toBe(0);

    const browserSource = page.getByRole('radio', { name: /browser voice/i });
    await browserSource.focus();
    await page.keyboard.press('Space');
    await expect(browserSource).toBeChecked();
    await page.getByLabel('Voice on this device').selectOption('worklingo-test-voice');
    const playPreview = page.getByRole('button', { name: 'Play preview' });
    await playPreview.focus();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() =>
      (window as Window & { __worklingoSpeechCalls?: number }).__worklingoSpeechCalls ?? 0,
    )).toBe(1);

    const save = page.getByRole('button', { name: 'Save audio settings' });
    await save.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Audio settings saved.')).toBeVisible();
    await page.reload();
    await expect(browserSource).toBeChecked();
    await expect(page.getByLabel('Voice on this device')).toHaveValue('worklingo-test-voice');

    await expectNoHorizontalOverflow(page);
    await expectMinimumControlHeight(page, '.audio-source-option');
    await expectMinimumControlHeight(page, '.audio-settings-actions button, .audio-settings-footer button');

    const automatic = await page.request.patch('/api/v1/me/audio-settings', {
      data: { browserVoiceId: 'worklingo-test-voice', sourceId: 'system-default' },
    });
    expect(automatic.status()).toBe(200);

    await page.goto('/dashboard');
    await page.getByRole('button', { name: /start 60-minute session/i }).click();
    await page.getByLabel('Your written response:').fill('My name is An and I support the project team.');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel('To welcome An and help An meet the team.').check();
    await page.getByLabel('Go to Mai’s desk to meet the team with her.').check();
    await page.getByLabel('Ask Mai for help.').check();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByLabel('Lesson audio')).toHaveCount(0);
    const lessonPreview = page.getByRole('button', { name: 'Play preview' });
    await expect(lessonPreview).toBeVisible();
    await lessonPreview.click();
    expect(await page.evaluate(() =>
      (window as Window & { __worklingoSpeechCalls?: number }).__worklingoSpeechCalls ?? 0,
    )).toBe(1);

    const publishedOnly = await page.request.patch('/api/v1/me/audio-settings', {
      data: { browserVoiceId: 'worklingo-test-voice', sourceId: 'published-audio' },
    });
    expect(publishedOnly.status()).toBe(200);
    await page.reload();
    await expect(page.getByText(/Published audio is unavailable/i)).toBeVisible();
    await expect(page.getByLabel('Lesson audio')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Play preview' })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test('admin previews, selects and publishes one immutable local audio candidate', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const suffix = `${Date.now()}_${testInfo.project.name.replaceAll('-', '_')}`;
    await installBrowserSpeechStub(page);
    await loginAsContentAdmin(page);

    await page.goto('/admin/settings/audio');
    await expect(page.getByRole('heading', { name: 'Audio generation settings' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /simulation audio/i })).toBeChecked();
    await expect(page.getByRole('radio', { name: /azure ai speech/i })).toHaveCount(0);
    const safeSettings = await page.request.get('/api/v1/admin/audio-settings');
    const safeBody = JSON.stringify(await safeSettings.json());
    expect(safeBody).not.toMatch(/subscription|secret|speechKey|apiKey/iu);
    await page.getByRole('button', { name: 'Save provider settings' }).click();
    await expect(page.getByText('Provider settings saved.')).toBeVisible();

    await page.goto('/admin/content/new');
    const title = `Audio candidate ${suffix}`;
    const lessonSlug = `audio-${Date.now()}-${testInfo.project.name}`;
    await page.getByLabel(/lesson source/i).fill(createValidLessonSource(lessonSlug, title));
    await page.getByRole('button', { name: /import draft/i }).click();
    await page.waitForURL(/\/admin\/content\/[0-9a-f-]+/u);
    await page.getByRole('tab', { name: /^validation/i }).click();
    await page.getByRole('button', { name: /validate draft/i }).click();
    await expect(page.getByText('VALIDATED')).toBeVisible();
    await expect(page.getByText(/No issues detected/i)).toBeVisible();
    await page.getByRole('tab', { name: /^preview/i }).click();
    await expect(page.getByText('Simulation audio — not a release voice')).toBeVisible();

    const preview = page.getByRole('button', { name: 'Play preview' });
    await preview.focus();
    await expect(preview).toBeFocused();
    await preview.click();
    expect(await page.evaluate(() =>
      (window as Window & { __worklingoSpeechCalls?: number }).__worklingoSpeechCalls ?? 0,
    )).toBe(1);

    await page.getByRole('button', { name: /generate audio/i }).click();
    const candidate = page.getByRole('radio', { name: /fake-tts.*fake-neutral/i });
    await expect(candidate).toBeEnabled({ timeout: 20_000 });
    await candidate.check();
    await expect(page.locator('.audio-candidate audio')).toHaveCount(0);
    await expect(page.getByText(/diagnostic tone, not speech/i)).toBeVisible();

    await page.getByRole('tab', { name: /^publish/i }).click();
    await expect(page.getByText('Valid and ready to publish')).toBeVisible();
    await expect(page.getByText('All required audio is ready')).toBeVisible();
    const publish = page.getByRole('button', { name: 'Publish Lesson' });
    await expect(publish).toBeEnabled();
    await publish.click();
    await expect(page.getByText(/Published Version:/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /delete/i })).toHaveCount(0);

    await expectNoHorizontalOverflow(page);
    if (testInfo.project.name.endsWith('mobile')) {
      await expectMinimumControlHeight(page, 'main button:not([disabled])');
    }

    await page.getByRole('button', { name: /archive version/i }).click();
    await expect(
      page.getByRole('region', { name: 'Publish details' }).getByText('ARCHIVED'),
    ).toBeVisible();
  });

  test('renders Azure readiness from a test-only stub without exposing credentials', async ({ page }) => {
    await loginAsContentAdmin(page);
    const response = {
      defaultVoiceId: 'en-US-JennyNeural',
      providerId: 'azure-speech',
      providers: [
        {
          available: true, defaultVoiceId: 'fake-neutral', displayName: 'Simulation audio',
          id: 'fake-tts', simulation: true, supportedLocales: ['en-US'],
        },
        {
          available: true, defaultVoiceId: 'en-US-JennyNeural', displayName: 'Azure AI Speech',
          id: 'azure-speech', simulation: false, supportedLocales: ['en-US'],
        },
      ],
    };
    await page.route('**/api/v1/admin/audio-settings', async (route) => {
      if (route.request().method() === 'PATCH') {
        expect(route.request().postDataJSON()).toEqual({
          defaultVoiceId: 'en-US-JennyNeural', providerId: 'azure-speech',
        });
      }
      await route.fulfill({ contentType: 'application/json', json: response });
    });

    await page.goto('/admin/settings/audio');
    await expect(page.getByRole('radio', { name: /azure ai speech/i })).toBeChecked();
    await expect(page.getByText('Configured and available')).toBeVisible();
    expect(JSON.stringify(response)).not.toMatch(/subscription|secret|speechKey|apiKey/iu);
    await page.getByRole('button', { name: 'Save provider settings' }).click();
    await expect(page.getByText('Provider settings saved.')).toBeVisible();
  });
});
