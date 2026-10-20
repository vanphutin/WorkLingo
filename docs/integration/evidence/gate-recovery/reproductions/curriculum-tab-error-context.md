# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: curriculum-foundation.spec.ts >> published objective evidence completes one pinned revision and unlocks its dependent unit
- Location: e2e\curriculum-foundation.spec.ts:56:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('article', { name: 'Introduce yourself to a new colleague' })
Expected substring: "Available"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" getByRole('article', { name: 'Introduce yourself to a new colleague' }) with timeout 5000ms
  - waiting for getByRole('article', { name: 'Introduce yourself to a new colleague' })

```

```yaml
- link "Skip to learning content":
  - /url: "#learner-main-content"
- banner:
  - link "w WorkLingo":
    - /url: /dashboard
  - paragraph:
    - text: Learner account
    - strong: Dashboard
  - 'button "Color theme: System. Activate to change theme"': "Theme: System"
  - text: Interface language
  - combobox "Interface language":
    - option "Tiếng Việt"
    - option "English" [selected]
  - text: Learner account
  - strong: Curriculum Learner 1792521620648-curriculum-foundation-desktop
  - button "Sign out"
- strong: WorkLingo
- text: Learner account
- navigation "Learning navigation":
  - paragraph: Your learning
  - link "Dashboard":
    - /url: /dashboard
  - link "Programs":
    - /url: /programs
  - link "Mastery":
    - /url: /mastery
  - link "IELTS pathway":
    - /url: /ielts
  - paragraph: Preferences & access
  - link "Settings":
    - /url: /settings
- main:
  - text: Your learning space
  - heading "Welcome back, Curriculum Learner 1792521620648-curriculum-foundation-desktop" [level=1]
  - paragraph: Continue your workplace mission, then check how your skills are growing.
  - navigation "Dashboard shortcuts":
    - link "Explore learning programs":
      - /url: /programs
    - link "View Mastery Map, Memory Health and Error Bank":
      - /url: /mastery
  - tablist "Dashboard sections":
    - tab "Today" [selected]
    - tab "Progress"
    - tab "Programs"
    - tab "Study rhythm"
  - tabpanel "Today":
    - region "Introduce yourself to a new colleague":
      - text: Current Mission
      - heading "Introduce yourself to a new colleague" [level=2]
      - paragraph: Build your confidence through reading, listening, speaking and writing. Your learning program determines the practice available for this mission.
      - region "Learn through a topic":
        - heading "Learn through a topic" [level=3]
        - paragraph: No approved, published Intermediate topic is available yet.
        - paragraph: Earlier lessons remain available below while topic lessons are being prepared.
      - text: "Session duration:"
      - combobox "Session duration:":
        - option "45 minutes (Express)"
        - option "60 minutes (Foundation default)" [selected]
        - option "90 minutes (Deep Dive)"
        - option "120 minutes (Intensive)"
        - option "150 minutes (Mastery)"
      - button "Start 60-Minute Session"
    - region "Your Learning Journey":
      - text: Progress Summary
      - heading "Your Learning Journey" [level=2]
      - text: "Active program:"
      - strong: Intermediate
      - text: Current Level
      - strong: Foundation 1
      - text: Completed Activities
      - strong: "0"
      - text: Total Attempts
      - strong: "0"
      - text: Completed Sessions
      - strong: "0"
      - text: Next milestone
      - paragraph: Introduce yourself to a new colleague
      - paragraph: 0 of 2 missions completed
      - progressbar "Next milestone"
- alert
```

# Test source

```ts
  1   | import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
  2   |
  3   | import { loginAsContentAdmin } from './helpers/content-admin';
  4   | import { completeSelfPlacementViaApi, expectNoHorizontalOverflow, registerLearner } from './helpers/learner-onboarding';
  5   |
  6   | interface Mission {
  7   |   id: string; levelId: string; revision: number; slug: string; title: string;
  8   |   lessons: Array<{ id: string; currentPublishedVersionId: string | null }>;
  9   | }
  10  | interface CurriculumTree { paths: Array<{ levels: Array<{ missions: Mission[] }> }> }
  11  |
  12  | const requestJson = async <T>(request: APIRequestContext, method: 'get' | 'post' | 'put', path: string, data?: unknown): Promise<T> => {
  13  |   const response = await request[method](path, data === undefined ? undefined : { data });
  14  |   if (!response.ok()) {
  15  |     throw new Error(`${method.toUpperCase()} ${path}: ${response.status()} ${await response.text()}`);
  16  |   }
  17  |   return response.json() as Promise<T>;
  18  | };
  19  |
  20  | async function publishDefinition(request: APIRequestContext, mission: Mission, prerequisiteRevisionIds: string[] = []) {
  21  |   const draft = await requestJson<{ revision: number | null }>(request, 'get', `/api/v1/admin/curriculum/missions/${mission.id}/foundation`);
  22  |   const lessonVersionId = mission.lessons[0]?.currentPublishedVersionId;
  23  |   if (!lessonVersionId) throw new Error('Mission requires a published lesson version');
  24  |   const definition = {
  25  |     category: 'reading', prerequisiteRevisionIds,
  26  |     objectives: [{
  27  |       slug: 'understand-workplace-message', statement: 'Understand the main purpose of a workplace message.',
  28  |       skills: ['reading'], required: true,
  29  |       evidence: [{ lessonVersionId, activitySlug: 'understand-welcome', languageBlockSlugs: [] }],
  30  |     }],
  31  |   };
  32  |   const saved = await requestJson<{ revision: number }>(request, 'put', `/api/v1/admin/curriculum/missions/${mission.id}/foundation`, {
  33  |     definition, expectedRevision: draft.revision, idempotencyKey: crypto.randomUUID(),
  34  |   });
  35  |   await requestJson(request, 'post', `/api/v1/admin/curriculum/missions/${mission.id}/foundation/validate`, {
  36  |     expectedRevision: saved.revision, idempotencyKey: crypto.randomUUID(),
  37  |   });
  38  |   return requestJson<{ id: string }>(request, 'post', `/api/v1/admin/curriculum/missions/${mission.id}/foundation/publish`, {
  39  |     expectedRevision: saved.revision, idempotencyKey: crypto.randomUUID(),
  40  |   });
  41  | }
  42  |
  43  | async function completeSession(page: Page, sessionId: string) {
  44  |   const session = await requestJson<{ plan: { blocks: Array<{ activityIds: string[] }> } }>(page.request, 'get', `/api/v1/learning-sessions/${sessionId}`);
  45  |   for (const activityId of session.plan.blocks.flatMap((block) => block.activityIds)) {
  46  |     const activity = await requestJson<{ slug: string }>(page.request, 'get', `/api/v1/learning-sessions/${sessionId}/activities/${activityId}`);
  47  |     const response = activity.slug === 'understand-welcome' ? { answerIndexes: [0, 1, 1] }
  48  |       : activity.slug === 'understand-colleague' ? { answerIndexes: [2, 0] }
  49  |       : { text: 'Hello Linh. My name is An. I work in sales. Do you need help with this task today?' };
  50  |     await requestJson(page.request, 'post', `/api/v1/activities/${activityId}/attempts`, {
  51  |       sessionId, clientAttemptId: crypto.randomUUID(), response,
  52  |     });
  53  |   }
  54  | }
  55  |
  56  | test('published objective evidence completes one pinned revision and unlocks its dependent unit', async ({ page, browser }, testInfo) => {
  57  |   test.setTimeout(120_000);
  58  |   const suffix = `${Date.now()}-${testInfo.project.name}`;
  59  |   const adminContext = await browser.newContext();
  60  |   const adminPage = await adminContext.newPage();
  61  |   let sourceMission!: Mission;
  62  |   let dependentMission!: Mission;
  63  |   let sourceRevisionId!: string;
  64  |   let dependentRevisionId!: string;
  65  |
  66  |   try {
  67  |     await loginAsContentAdmin(adminPage);
  68  |     const tree = await requestJson<CurriculumTree>(adminPage.request, 'get', '/api/v1/admin/curriculum');
  69  |     sourceMission = tree.paths.flatMap((path) => path.levels).flatMap((level) => level.missions)
  70  |       .find((mission) => mission.slug === 'introduce-yourself-to-a-new-colleague')!;
  71  |     sourceRevisionId = (await publishDefinition(adminPage.request, sourceMission)).id;
  72  |
  73  |     dependentMission = await requestJson<Mission>(adminPage.request, 'post', '/api/v1/admin/curriculum/missions', {
  74  |       levelId: sourceMission.levelId, slug: `dependent-${suffix.toLowerCase()}`, title: `Dependent unit ${suffix}`,
  75  |       objective: 'Use prior evidence before continuing.', purpose: 'LEARNING', idempotencyKey: crypto.randomUUID(),
  76  |     });
  77  |     dependentMission = await requestJson<Mission>(adminPage.request, 'put', `/api/v1/admin/curriculum/missions/${dependentMission.id}/lessons`, {
  78  |       expectedRevision: dependentMission.revision, lessonIds: [sourceMission.lessons[0]!.id], idempotencyKey: crypto.randomUUID(),
  79  |     });
  80  |     dependentMission = await requestJson<Mission>(adminPage.request, 'post', `/api/v1/admin/curriculum/missions/${dependentMission.id}/publish`, {
  81  |       expectedRevision: dependentMission.revision, idempotencyKey: crypto.randomUUID(),
  82  |     });
  83  |     dependentRevisionId = (await publishDefinition(adminPage.request, dependentMission, [sourceRevisionId])).id;
  84  |   } finally {
  85  |     await adminContext.close();
  86  |   }
  87  |
  88  |   await registerLearner(page, { displayName: `Curriculum Learner ${suffix}`, email: `curriculum-${suffix}@example.test` });
  89  |   await completeSelfPlacementViaApi(page);
  90  |   await page.goto('/dashboard');
> 91  |   await expect(page.getByRole('article', { name: sourceMission.title })).toContainText('Available');
      |                                                                          ^ Error: expect(locator).toContainText(expected) failed
  92  |   await expect(page.getByRole('article', { name: dependentMission.title })).toContainText('Locked');
  93  |   await expectNoHorizontalOverflow(page);
  94  |
  95  |   await page.getByRole('button', { name: /start 60-minute session/i }).click();
  96  |   await expect(page).toHaveURL(/\/sessions\/[\da-f-]+$/u);
  97  |   const sessionId = new URL(page.url()).pathname.split('/').at(-1)!;
  98  |   const frozenBefore = await requestJson<{ curriculumRevisionId: string }>(page.request, 'get', `/api/v1/learning-sessions/${sessionId}`);
  99  |   expect(frozenBefore.curriculumRevisionId).toBe(sourceRevisionId);
  100 |   await completeSession(page, sessionId);
  101 |
  102 |   await page.goto('/dashboard');
  103 |   await expect(page.getByRole('article', { name: sourceMission.title })).toContainText('Completed');
  104 |   await expect(page.getByRole('article', { name: dependentMission.title })).toContainText('Available');
  105 |
  106 |   const adminContext2 = await browser.newContext();
  107 |   const adminPage2 = await adminContext2.newPage();
  108 |   try {
  109 |     await loginAsContentAdmin(adminPage2);
  110 |     const newer = await publishDefinition(adminPage2.request, sourceMission);
  111 |     expect(newer.id).not.toBe(sourceRevisionId);
  112 |   } finally {
  113 |     await adminContext2.close();
  114 |   }
  115 |   const frozenAfter = await requestJson<{ curriculumRevisionId: string }>(page.request, 'get', `/api/v1/learning-sessions/${sessionId}`);
  116 |   expect(frozenAfter.curriculumRevisionId).toBe(sourceRevisionId);
  117 |   const roadmap = await requestJson<{ items: Array<{ revisionId: string; state: string }> }>(page.request, 'get', '/api/v1/me/curriculum-roadmap');
  118 |   expect(roadmap.items).toEqual(expect.arrayContaining([
  119 |     expect.objectContaining({ revisionId: dependentRevisionId, state: 'available' }),
  120 |   ]));
  121 |   expect(roadmap.items.some((item) => item.revisionId === sourceRevisionId)).toBe(false);
  122 | });
  123 |
  124 | test('real curriculum API retains an unsaved Foundation objective through collapse and filtering', async ({ page }) => {
  125 |   await loginAsContentAdmin(page);
  126 |   const tree = await requestJson<CurriculumTree>(page.request, 'get', '/api/v1/admin/curriculum');
  127 |   const mission = tree.paths.flatMap(path => path.levels).flatMap(level => level.missions)
  128 |     .find(item => item.slug === 'introduce-yourself-to-a-new-colleague')!;
  129 |   await page.goto('/admin/curriculum');
  130 |   await page.getByRole('button', { name: new RegExp(`Edit Foundation.*${mission.title}`, 'i') }).click();
  131 |   const statement = page.getByLabel('Objective statement', { exact: true }).first();
  132 |   const text = `Unsaved recovery objective ${crypto.randomUUID()}`;
  133 |   await statement.fill(text);
  134 |   await page.getByRole('button', { name: 'Collapse all', exact: true }).click();
  135 |   await expect(statement).toHaveValue(text);
  136 |   await page.locator('.search-input').fill('no-mission-matches-this-filter');
  137 |   await expect(statement).toHaveValue(text);
  138 |   await page.locator('.search-input').fill('');
  139 |   await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  140 |   await expect(statement).toHaveValue(text);
  141 |   // The browser draft must not silently write to the real API.
  142 |   const stored = await requestJson<{ definition: { objectives: Array<{ statement: string }> } | null }>(page.request, 'get', `/api/v1/admin/curriculum/missions/${mission.id}/foundation`);
  143 |   expect(stored.definition?.objectives.some(objective => objective.statement === text) ?? false).toBe(false);
  144 | });
  145 |
```
