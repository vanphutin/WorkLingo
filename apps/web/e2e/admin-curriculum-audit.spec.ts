import { expect, test, type Page } from '@playwright/test';

import { loginAsContentAdmin } from './helpers/content-admin';

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.describe('Admin Curriculum Operations & Audit Browser E2E Journey', () => {
  test('content admin creates curriculum hierarchy, navigates audit browser and verifies privacy safety', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const uniqueId = `${Date.now()}_${testInfo.project.name.replaceAll('-', '_')}`;
    const pathSlug = `e2e-path-${uniqueId.toLowerCase()}`;
    const pathName = `E2E Path ${uniqueId}`;
    const levelCode = `E2E_${uniqueId.toUpperCase()}`;
    const levelName = `Level ${uniqueId}`;
    const missionSlug = `e2e-mission-${uniqueId.toLowerCase()}`;
    const missionTitle = `Mission ${uniqueId}`;

    // 1. Log in as Content Admin
    await loginAsContentAdmin(page);

    // 2. Navigate to Curriculum Management
    await page.goto('/admin/curriculum');
    await expect(page.getByRole('heading', { level: 1, name: 'Curriculum Management' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    // 3. Create a new Learning Path
    await page.getByRole('button', { name: '+ New Path' }).click();
    await page.getByLabel('Path Name').fill(pathName);
    await page.getByRole('combobox', { name: 'Learning Program', exact: true }).selectOption('10000000-0000-4000-8000-000000000004');
    const programOption=await page.getByRole('combobox',{name:'Learning Program',exact:true}).locator('option:checked').innerText();
    const programStatus=programOption.replace(/^IELTS - /u,'').trim();
    await page.getByLabel('Slug').fill(pathSlug);
    await page.getByRole('button', { name: 'Create Path' }).click();

    // Verify path rendered
    await expect(page.getByRole('heading', { level: 2, name: pathName, exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(`(${pathSlug})`)).toBeVisible();

    // 4. Create Level under this Path
    const pathCard = page.locator('section.path-card', { hasText: pathName });
    await expect(pathCard.locator('.program-label')).toHaveText(`Program: IELTS (${programStatus})`);
    await pathCard.getByRole('button', { name: '+ Add Level' }).click();

    await pathCard.getByLabel(/Level Code/i).fill(levelCode);
    await pathCard.getByLabel(/Level Name/i).fill(levelName);
    await pathCard.getByLabel(/CEFR Reference/i).fill('B2');
    await pathCard.getByRole('button', { name: 'Create Level' }).click();

    await expect(
      pathCard.getByRole('heading', { level: 3, name: `${levelName} (${levelCode})`, exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    // 5. Create Mission under this Level
    const levelCard = pathCard.locator('.level-card', { hasText: levelName });
    await levelCard.getByRole('button', { name: '+ Add Mission' }).click();

    await levelCard.getByLabel('Mission Title').fill(missionTitle);
    await levelCard.getByLabel('Slug').fill(missionSlug);
    await levelCard.getByLabel('Objective').fill('Verify admin mission creation end to end');
    await levelCard.getByRole('button', { name: 'Create Mission' }).click();

    await expect(
      levelCard.getByRole('heading', { level: 4, name: missionTitle, exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(levelCard.getByText(`(${missionSlug})`)).toBeVisible();

    // Verify touch targets: minimum 44px on primary buttons
    const createBtn = page.getByRole('button', { name: '+ New Path' });
    const btnBox = await createBtn.boundingBox();
    expect(btnBox).not.toBeNull();
    if (btnBox) {
      expect(btnBox.height).toBeGreaterThanOrEqual(44);
    }

    // 6. Navigate to Audit Browser
    await page.goto('/admin/audit');
    await expect(page.getByRole('heading', { level: 1, name: 'Audit Event Browser' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    // Verify that CREATE_PATH or administrative mutations appear in audit logs
    await expect(page.locator('.audit-card').first()).toBeVisible({ timeout: 15_000 });

    // Privacy Guarantee: Ensure no email address is leaked in the audit display
    const auditText = await page.locator('.audit-events-list').innerText();
    expect(auditText).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/);

    // 7. Filter by Action
    await page.getByLabel('Action').fill('CREATE_PATH');
    await page.getByRole('button', { name: 'Apply Filters' }).click();

    await expect(page.locator('.audit-action-badge', { hasText: 'CREATE_PATH' }).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
