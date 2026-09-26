import { expect, test } from '@playwright/test';

test('learn a unit, practice it, and keep the XP after a reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Grid basics, 4 cards' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Define columns');

  // The playground is real CSS: picking a value changes the rendered grid.
  await page.getByRole('button', { name: '100px 1fr' }).click();
  await expect(page.getByTestId('demo-stage')).toHaveCSS('grid-template-columns', /^100px /);

  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Practice this' }).click();

  const feedback = page.getByRole('region', { name: 'Feedback' });
  const check = page.getByRole('button', { name: 'Check' });
  const cont = page.getByRole('button', { name: 'Continue' });

  // predict-3: right first time (+10)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Which layout does this grid draw?');
  await page.getByRole('button', { name: /^Option D:/ }).click();
  await check.click();
  await expect(feedback).toContainText('Nice — that’s right!');
  await cont.click();

  // predict-4: wrong — costs a heart and comes back at the end
  await page.getByRole('button', { name: /^Option A:/ }).click();
  await check.click();
  await expect(feedback).toContainText('Answer: B');
  await expect(page.getByText('4 hearts left')).toBeAttached();
  await cont.click();

  // build-1: right first time (+10)
  await page.getByRole('button', { name: 'grid', exact: true }).click();
  await page.getByRole('button', { name: 'center', exact: true }).click();
  await check.click();
  await expect(feedback).toContainText('Exactly right!'); // praise rotates by queue position (index 2)
  await cont.click();

  // predict-4 again: right after a miss (+5)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Item .a is orange. Which grid is this?');
  await page.getByRole('button', { name: /^Option B:/ }).click();
  await check.click();
  await cont.click();

  await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
  await expect(page.getByText('+25')).toBeVisible();
  await expect(page.getByText('67%')).toBeVisible();

  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('25 XP')).toBeVisible();

  await page.reload();
  await expect(page.getByText('25 XP')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Grid basics, 4 cards, completed' })).toBeVisible();
});
