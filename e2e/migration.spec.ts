import { expect, test } from '@playwright/test';

test('v1 progress lands in CSS with its XP and no picker', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      'cascade.progress.v1',
      JSON.stringify({ completedUnits: { grid: true }, completedSets: {}, totalXp: 40 }),
    );
  });
  await page.reload();
  await expect(page.getByRole('button', { name: 'CSS, change course' })).toBeVisible();
  await expect(page.getByText('40 XP')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Grid basics, 4 cards, completed' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Choose a course' })).toHaveCount(0);
});
