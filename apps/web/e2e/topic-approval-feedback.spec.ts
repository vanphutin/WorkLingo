import { expect, test } from '@playwright/test';
import { defaultTopicPlan, type TopicReview } from '@worklingo/contracts';
import { installSidebarAdminFixtures, sidebarImportId } from './fixtures/admin-sidebar-contracts';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const route = `/admin/programs/intermediate/topics/${sidebarImportId}`;
const evidence = path.resolve(__dirname, '../../../.superpowers/topic-approval/evidence');
test.beforeAll(() => mkdirSync(evidence, { recursive: true }));
for (const [width, locale, theme] of [[1440, 'en', 'light'], [390, 'vi', 'dark']] as const) {
  test(`approval feedback at the action, retained on reload ${width}/${locale}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.context().addCookies([{ name: 'worklingo_locale', value: locale, domain: '127.0.0.1', path: '/' }]);
    await page.addInitScript(theme => localStorage.setItem('worklingo:theme:v1', theme), theme);
    await installSidebarAdminFixtures(page, locale, route);
    let review: TopicReview = { importId: sidebarImportId, revision: 0, status: 'none', proposal: null, approval: null };
    let writes = 0;
    await page.route('**/api/v1/admin/intermediate-topics/*/review', handler => handler.fulfill({ json: review }));
    await page.route('**/api/v1/admin/intermediate-topics/*/approve', async handler => {
      writes++; const command = handler.request().postDataJSON();
      review = { ...review, revision: review.revision + 1, status: 'approved', approval: { plan: command.plan, approvedById: sidebarImportId, approvedAt: '2026-10-22T05:02:13Z' } };
      await handler.fulfill({ json: review });
    });
    await page.goto(route);
    const groupName = locale === 'vi' ? 'Phê duyệt khung học' : 'Plan approval';
    const group = page.getByRole('group', { name: groupName, exact: true });
    const approveName = locale === 'vi' ? 'Phê duyệt khung học này' : 'Approve this plan';
    const savedName = locale === 'vi' ? 'Đã phê duyệt' : 'Plan approved';
    await group.getByRole('button', { name: approveName, exact: true }).click();
    await expect(group.getByRole('button', { name: savedName, exact: true })).toBeDisabled();
    expect(writes).toBe(1);
    await expect(group.getByRole('status')).toContainText(locale === 'vi' ? '60 phút' : '60-minute');
    await expect(group.getByRole('link')).toHaveAttribute('href', `/admin/content/${sidebarImportId}`);
    await group.scrollIntoViewIfNeeded();
    const statusBox = await group.getByRole('status').boundingBox();
    expect(statusBox!.y).toBeGreaterThanOrEqual(0); expect(statusBox!.y + statusBox!.height).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: path.join(evidence, `approved-${width}-${locale}.png`) });
    await page.reload(); await expect(group.getByRole('button', { name: savedName })).toBeDisabled(); expect(writes).toBe(1);
    await page.getByRole('combobox', { name: locale === 'vi' ? 'Thời lượng phiên học được duyệt' : 'Approved session duration', exact: true }).selectOption('90');
    await expect(group.getByRole('button', { name: approveName })).toBeEnabled();
    await expect(group.getByRole('link')).toHaveCount(0);
    expect(review.approval?.plan).toEqual(defaultTopicPlan(60));
  });
}
