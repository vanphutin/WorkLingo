import { expect, test } from '@playwright/test';
import { installAuthoringFixtures } from './fixtures/phase4-authoring-contracts';
import { curriculumDraftSchema } from '@worklingo/contracts';

test('preserved curriculum search and filters reflow with visible keyboard focus at CSS200', async ({ page }) => {
  await installAuthoringFixtures(page, { kind: 'curriculum', locale: 'en' });
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'en', domain: '127.0.0.1', path: '/' }]);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('http://127.0.0.1:33300/admin/curriculum');
    const search = page.locator('.search-input');
    await expect(search).toBeVisible();
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `curriculum CSS200 ${width}`).toBeLessThanOrEqual(width);
    await search.focus();
    await page.keyboard.type('A long curriculum query');
    await expect(search).toHaveValue('A long curriculum query');
    expect(await search.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
    const clear = page.locator('.search-clear-btn');
    await clear.click();
    await expect(search).toHaveValue('');
    for (const control of await page.locator('.toolbar-controls :is(button,select)').all()) {
      await control.focus();
      const bounds = await control.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, right: rect.right, outline: parseFloat(getComputedStyle(el).outlineWidth) };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(width);
      expect(bounds.outline).toBeGreaterThanOrEqual(2);
    }
  }
});

test('Foundation fields retain a keyboard focus ring and the edited objective through collapse', async ({ page }) => {
  const { data } = await installAuthoringFixtures(page, { kind: 'curriculum', locale: 'en' });
  await page.context().addCookies([{ name: 'worklingo_locale', value: 'en', domain: '127.0.0.1', path: '/' }]);
  const mission = data.curriculum.paths[0]!.levels[0]!.missions[0]!;
  await page.route('**/api/v1/admin/curriculum/missions/*/foundation', route => route.fulfill({ json: curriculumDraftSchema.parse({
    missionId: mission.id, revision: 1, status: 'DRAFT', publishedRevisions: [], definition: {
      category: 'grammar', prerequisiteRevisionIds: [], objectives: [{ slug: 'request', statement: 'Saved objective', skills: ['reading'], required: true,
        evidence: [{ lessonVersionId: '44444444-4444-4444-8444-444444444444', activitySlug: 'read-request', languageBlockSlugs: [] }] }],
    },
  }) }));
  await page.goto('http://127.0.0.1:33300/admin/curriculum');
  await page.getByRole('button', { name: new RegExp(`Edit Foundation.*${mission.title}`, 'i') }).click();
  const statement = page.getByLabel('Objective statement', { exact: true });
  await expect(statement).toHaveValue('Saved objective');
  for (const field of await page.locator('.foundation-form-grid :is(input:not([type=checkbox]),select,textarea)').all()) {
    await field.focus();
    expect(await field.evaluate(el => parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
  }
  await statement.fill('Unsaved objective preserved');
  await page.getByRole('button', { name: 'Collapse all', exact: true }).click();
  await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  await expect(statement).toHaveValue('Unsaved objective preserved');
});
