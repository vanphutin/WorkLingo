import { expect, type Page } from '@playwright/test';

export async function installBrowserSpeechStub(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const voices = [{
      default: true,
      lang: 'en-US',
      localService: true,
      name: 'WorkLingo Test Voice Female',
      voiceURI: 'worklingo-test-voice',
    }, {default:false,lang:'en-US',localService:true,name:'WorkLingo Test Voice Male',voiceURI:'worklingo-test-male'}];
    let speakCalls = 0;
    class TestUtterance {
      lang = '';
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      voice: unknown = null;
      constructor(readonly text: string) {}
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: TestUtterance,
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        addEventListener: () => undefined,
        cancel: () => undefined,
        getVoices: () => voices,
        pause: () => undefined,
        paused: false,
        removeEventListener: () => undefined,
        resume: () => undefined,
        speak: () => { speakCalls += 1; },
      },
    });
    Object.defineProperty(window, '__worklingoSpeechCalls', {
      configurable: true,
      get: () => speakCalls,
    });
  });
}

export async function registerAndOnboardLearner(page: Page, suffix: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Display name').fill(`Audio Learner ${suffix}`);
  await page.getByLabel('Email').fill(`audio_learner_${suffix}@example.test`);
  await page.getByLabel('Password').fill('Audio-Learner-Password-123!');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/onboarding$/u);

  const response = await page.request.post('/api/v1/me/onboarding/self-placement', {
    data: {
      clientConfirmationId: crypto.randomUUID(),
      selectedLevelCode: 'FOUNDATION_1',
    },
  });
  expect(response.status()).toBe(200);
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

export async function expectMinimumControlHeight(
  page: Page,
  selector: string,
  minimum = 44,
): Promise<void> {
  const heights = await page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().height),
  );
  expect(heights.length).toBeGreaterThan(0);
  for (const height of heights) expect(height).toBeGreaterThanOrEqual(minimum);
}
