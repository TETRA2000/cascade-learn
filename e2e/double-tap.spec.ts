import { expect, test } from '@playwright/test';

// A double tap on Check/Continue must not carry over to the button that
// replaces it in the same spot (Check and Continue share the bottom edge).
test('double-clicking Continue does not grade the next question', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Practice' }).click();
  await page.getByRole('button', { name: 'Tune to target, 3 questions' }).click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Increase value' }).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await page.getByRole('button', { name: 'Continue' }).dblclick();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Set the padding so the tag fills the outline');
  await expect(page.getByRole('region', { name: 'Feedback' })).toHaveCount(0);
  await expect(page.getByText('5 hearts left')).toBeAttached();
});

test('double-clicking Check still shows the feedback', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Practice' }).click();
  await page.getByRole('button', { name: 'Predict the render, 4 questions' }).click();
  await page.getByRole('button', { name: /^Option A:/ }).click();
  await page.getByRole('button', { name: 'Check' }).dblclick();

  await expect(page.getByRole('region', { name: 'Feedback' })).toContainText('Answer: C');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Which row does this CSS draw?');
});
