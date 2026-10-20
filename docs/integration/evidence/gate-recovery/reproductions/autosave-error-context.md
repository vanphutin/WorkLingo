# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ielts-full-mock.spec.ts >> real mock API saves the writing snapshot and locks editing until delayed exit completes
- Location: e2e\ielts-full-mock.spec.ts:35:5

# Error details

```
TimeoutError: locator.click: Timeout 1500ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Save and exit', exact: true })
    - locator resolved to <button disabled type="button">Save and exit</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 500ms
    - waiting for element to be visible, enabled and stable

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - link "Skip to learning content" [ref=e3] [cursor=pointer]:
      - /url: "#learner-main-content"
    - banner [ref=e4]:
      - generic [ref=e6]:
        - link "w WorkLingo" [ref=e7] [cursor=pointer]:
          - /url: /dashboard
        - paragraph [ref=e8]:
          - generic [ref=e9]: Learner account
          - strong [ref=e10]: Focus mode
        - generic [ref=e11]:
          - 'button "Color theme: System. Activate to change theme" [ref=e12] [cursor=pointer]':
            - generic [ref=e16]: "Theme: System"
          - generic [ref=e17]:
            - generic [ref=e18]: Interface language
            - combobox "Interface language" [ref=e19] [cursor=pointer]:
              - option "Tiếng Việt"
              - option "English" [selected]
          - button "Sign out" [ref=e21] [cursor=pointer]
    - button "Learning navigation" [ref=e23] [cursor=pointer]:
      - generic [ref=e24]:
        - text: Learning navigation
        - generic [aria-hidden] [ref=e25]: IELTS pathway
    - main [ref=e29]:
      - generic [ref=e30]:
        - generic [ref=e31]:
          - link "Back to full mocks" [ref=e32] [cursor=pointer]:
            - /url: /ielts/mock-tests
          - paragraph [ref=e33]: Version 1 · Exam simulation
          - heading "E2E Full Mock caaa6167" [level=1] [ref=e34]
        - button "Save and exit" [disabled] [ref=e35]
      - navigation "Mock sections" [ref=e37]:
        - generic [ref=e38]:
          - text: "1"
          - generic [ref=e39]: Listening
        - generic [ref=e40]:
          - text: "2"
          - generic [ref=e41]: Reading
        - generic [ref=e42]:
          - text: "3"
          - generic [ref=e43]: Writing
        - generic [ref=e44]:
          - text: "4"
          - generic [ref=e45]: Speaking
      - article [ref=e46]:
        - paragraph [ref=e47]: Writing
        - heading "Writing section" [level=2] [ref=e48]
        - timer [ref=e49]: "Time remaining: 59:54"
        - generic [ref=e50]:
          - heading "Academic Writing Task 1" [level=3] [ref=e51]
          - paragraph [ref=e53]: Summarise the main features of the synthetic workplace training chart and make relevant comparisons.
        - generic [ref=e54]:
          - heading "Academic Writing Task 2" [level=3] [ref=e55]
          - paragraph [ref=e57]: Discuss whether employers should dedicate working time to language learning and support your position.
        - generic [ref=e58]:
          - generic [ref=e59]: Answered
          - generic [ref=e60]: Academic Writing Task 1
          - generic [ref=e61]: (minimum 150 words)
          - textbox "Answered Academic Writing Task 1 (minimum 150 words)" [active] [ref=e62]: Recovery writing snapshot remains available after save and exit.
        - generic [ref=e63]:
          - generic [ref=e64]: Unanswered
          - generic [ref=e65]: Academic Writing Task 2
          - generic [ref=e66]: (minimum 250 words)
          - textbox "Unanswered Academic Writing Task 2 (minimum 250 words)" [ref=e67]
        - generic [ref=e68]:
          - button "Save progress" [disabled] [ref=e69]
          - button "Submit section" [disabled] [ref=e70]
  - alert [ref=e71]
```

# Test source

```ts
  1  | import { randomUUID } from 'node:crypto';
  2  | import { createRequire } from 'node:module';
  3  | import path from 'node:path';
  4  | import { INITIAL_IELTS_ACADEMIC_MOCK, INITIAL_IELTS_BAND_CURRICULUM } from '@worklingo/contracts';
  5  | import { expect, test, type Page } from '@playwright/test';
  6  |
  7  | interface E2EDatabase {
  8  |   ieltsBandCurriculum: { create(input: unknown): Promise<{ id: string }> };
  9  |   ieltsBandCurriculumVersion: { create(input: unknown): Promise<{ id: string }> };
  10 |   ieltsBandJourney: { create(input: unknown): Promise<unknown> };
  11 |   ieltsMockTest: { create(input: unknown): Promise<{ id: string }>; update(input: unknown): Promise<unknown> };
  12 |   ieltsMockTestVersion: { create(input: unknown): Promise<{ id: string }> };
  13 |   $disconnect(): Promise<void>;
  14 | }
  15 |
  16 | async function seedJourneyAndMock(learnerId: string) {
  17 |   const datasourceUrl = process.env.WORKLINGO_E2E_DATABASE_URL; if (!datasourceUrl) throw new Error('WORKLINGO_E2E_DATABASE_URL is required.');
  18 |   const apiRequire = createRequire(path.resolve(__dirname, '../../api/package.json')); const { PrismaClient } = apiRequire('@prisma/client') as { PrismaClient: new (options: { datasourceUrl: string }) => E2EDatabase }; const database = new PrismaClient({ datasourceUrl });
  19 |   try {
  20 |     const curriculum = await database.ieltsBandCurriculum.create({ data: { slug: `e2e-path-${randomUUID()}`, draftContent: INITIAL_IELTS_BAND_CURRICULUM } }); const curriculumVersion = await database.ieltsBandCurriculumVersion.create({ data: { curriculumId: curriculum.id, version: 1, sourceHash: 'e2e-band', content: INITIAL_IELTS_BAND_CURRICULUM } }); await database.ieltsBandJourney.create({ data: { learnerId, clientJourneyId: randomUUID(), curriculumVersionId: curriculumVersion.id, currentStageCode: INITIAL_IELTS_BAND_CURRICULUM.stages[0]!.code, targetBand: 7 } });
  21 |     const audioIds = Array.from({ length: 4 }, () => randomUUID()); const title = `E2E Full Mock ${randomUUID().slice(0, 8)}`; const content = { ...INITIAL_IELTS_ACADEMIC_MOCK, title, listening: { ...INITIAL_IELTS_ACADEMIC_MOCK.listening, parts: INITIAL_IELTS_ACADEMIC_MOCK.listening.parts.map((part, index) => ({ ...part, audioAssetId: audioIds[index]! })) } }; const mock = await database.ieltsMockTest.create({ data: { slug: `e2e-mock-${randomUUID()}`, status: 'PUBLISHED', draftContent: content } }); const version = await database.ieltsMockTestVersion.create({ data: { mockTestId: mock.id, version: 1, sourceHash: 'e2e-v1', content } }); await database.ieltsMockTest.update({ where: { id: mock.id }, data: { currentPublishedVersionId: version.id } }); return { database, mockId: mock.id, versionId: version.id, content, title };
  22 |   } catch (error) { await database.$disconnect(); throw error; }
  23 | }
  24 |
  25 | async function expectNoHorizontalOverflow(page: Page) { const size = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })); expect(size.scroll).toBeLessThanOrEqual(size.client + 1); }
  26 |
  27 | test('learner starts and resumes the pinned full mock version', async ({ page }) => {
  28 |   const registration = await page.request.post('/api/v1/auth/register', { data: { locale: 'en', displayName: 'Full Mock E2E', email: `full-mock-${randomUUID()}@test.local`, password: 'full-mock-e2e-password' } }); expect(registration.ok()).toBeTruthy(); const learner = await registration.json() as { id: string }; expect((await page.request.post('/api/v1/me/onboarding/self-placement', { data: { clientConfirmationId: randomUUID(), selectedLevelCode: 'FOUNDATION_1' } })).ok()).toBeTruthy(); const seeded = await seedJourneyAndMock(learner.id);
  29 |   try {
  30 |     await page.goto('/ielts/mock-tests'); await expect(page.getByRole('heading', { level: 1, name: 'Full Mock Tests' })).toBeVisible(); await expectNoHorizontalOverflow(page); await page.getByRole('heading', { name: seeded.title }).locator('..').getByRole('button', { name: 'Start full mock' }).click(); await expect(page.getByText('Version 1 · Exam simulation')).toBeVisible(); const attemptId = new URL(page.url()).pathname.split('/').at(-1) ?? '';
  31 |     const version2 = await seeded.database.ieltsMockTestVersion.create({ data: { mockTestId: seeded.mockId, version: 2, sourceHash: 'e2e-v2', content: {...seeded.content,title:seeded.title+' new edition'} } }); await seeded.database.ieltsMockTest.update({ where: { id: seeded.mockId }, data: { currentPublishedVersionId: version2.id } }); await page.reload(); await expect(page.getByText('Version 1 · Exam simulation')).toBeVisible(); const resumed = await (await page.request.get(`/api/v1/me/ielts-mock-attempts/${attemptId}`)).json() as { mockTestVersionId: string }; expect(resumed.mockTestVersionId).toBe(seeded.versionId); await expect(page.getByRole('heading',{name:seeded.title,exact:true})).toBeVisible(); await expectNoHorizontalOverflow(page);
  32 |   } finally { await seeded.database.$disconnect(); }
  33 | });
  34 |
  35 | test('real mock API saves the writing snapshot and locks editing until delayed exit completes', async ({ page }) => {
  36 |   const registered = await page.request.post('/api/v1/auth/register', { data: {
  37 |     locale: 'en', displayName: 'Exit recovery learner', email: `${randomUUID()}@test.local`, password: 'full-mock-e2e-password',
  38 |   } });
  39 |   expect(registered.status()).toBe(201);
  40 |   const learner = await registered.json() as { id: string };
  41 |   expect((await page.request.post('/api/v1/me/onboarding/self-placement', { data: {
  42 |     clientConfirmationId: randomUUID(), selectedLevelCode: 'FOUNDATION_1',
  43 |   } })).status()).toBe(200);
  44 |   const seeded = await seedJourneyAndMock(learner.id);
  45 |   try {
  46 |     const started = await page.request.post('/api/v1/me/ielts-mocks/attempts', { data: {
  47 |       clientAttemptId: randomUUID(), mockTestId: seeded.mockId, mode: 'EXAM_SIMULATION',
  48 |     } });
  49 |     expect(started.status()).toBe(200);
  50 |     let attempt = await started.json() as { id: string; revision: number };
  51 |     const root = `/api/v1/me/ielts-mocks/attempts/${attempt.id}`;
  52 |     for (const section of ['LISTENING', 'READING']) {
  53 |       const advanced = await page.request.post(`${root}/sections/${section}/submit`, { data: { expectedRevision: attempt.revision } });
  54 |       expect(advanced.status()).toBe(200);
  55 |       attempt = await advanced.json() as typeof attempt;
  56 |     }
  57 |     await page.goto(`/ielts/mock-tests/${attempt.id}`);
  58 |     const writing = page.locator('.bridge-response textarea').first();
  59 |     await expect(writing).toBeEditable();
  60 |     let release!: () => void;
  61 |     let received!: () => void;
  62 |     const blocked = new Promise<void>(resolve => { release = resolve; });
  63 |     const pending = new Promise<void>(resolve => { received = resolve; });
  64 |     await page.route(`**${root}/responses`, async route => {
  65 |       // Keep the real response/persistence, delay only delivery to the UI.
  66 |       const response = await route.fetch();
  67 |       received();
  68 |       await blocked;
  69 |       await route.fulfill({ response });
  70 |     });
  71 |     const text = 'Recovery writing snapshot remains available after save and exit.';
  72 |     await writing.fill(text);
  73 |     if (process.env.WORKLINGO_RECOVERY_AUTOSAVE_PROBE === 'true') await pending;
> 74 |     await page.getByRole('button', { name: 'Save and exit', exact: true }).click({ timeout: 1500 });
     |                                                                            ^ TimeoutError: locator.click: Timeout 1500ms exceeded.
  75 |     try {
  76 |       await pending;
  77 |       await expect(writing).toBeDisabled();
  78 |       await expect(page).toHaveURL(new RegExp(`/ielts/mock-tests/${attempt.id}$`));
  79 |       const stored = await (await page.request.get(root)).json() as { responses: Record<string, string> };
  80 |       expect(stored.responses['writing-1']).toBe(text);
  81 |     } finally { release(); }
  82 |     await expect(page).toHaveURL(/\/dashboard$/u);
  83 |     await page.unroute(`**${root}/responses`);
  84 |     await page.goto(`/ielts/mock-tests/${attempt.id}`);
  85 |     await expect(page.locator('.bridge-response textarea').first()).toHaveValue(text);
  86 |   } finally { await seeded.database.$disconnect(); }
  87 | });
  88 |
```
