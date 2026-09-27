import { expect, test } from '@playwright/test';

test('learn Values & equality in TypeScript and practice it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^TypeScript,/ }).click();
  await expect(page.getByText('TypeScript, one tap at a time')).toBeVisible();

  // Learn: three code demos, then a code-choice demo that swaps tsc's verdict for output.
  await page.getByRole('button', { name: 'Values & equality, 6 cards' }).click();
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveText('let, const and inference');
  await expect(page.getByRole('region', { name: 'Output' })).toContainText('TypeScript 2 3');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next' }).click();
  await expect(h1).toHaveText('=== vs ==');
  await expect(page.getByRole('region', { name: 'Compiler error' })).toContainText('TS2367');
  await page.getByRole('button', { name: 'id === "7"', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Output' })).toContainText('true');
  await expect(page.getByRole('region', { name: 'Compiler error' })).toHaveCount(0);
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Next' }).click();
  await expect(h1).toHaveText('Truthy and falsy');
  await page.getByRole('button', { name: 'Practice this' }).click();

  const feedback = page.getByRole('region', { name: 'Feedback' });
  const check = page.getByRole('button', { name: 'Check' });
  const cont = page.getByRole('button', { name: 'Continue' });

  // ts-predict-1: right first time (+10)
  await page.getByRole('button', { name: /^Option A:/ }).click();
  await check.click();
  await expect(feedback).toContainText('Nice — that’s right!');
  await cont.click();

  // ts-pairs-1: no Check, completes itself (+10)
  for (const [left, right] of [
    ['===', 'Equal, with no type conversion'],
    ['==', 'Equal after converting types'],
    ['null', 'Deliberately empty'],
    ['undefined', 'Never set'],
  ]) {
    await page.getByRole('button', { name: left, exact: true }).click();
    await page.getByRole('button', { name: right, exact: true }).click();
  }
  await expect(feedback).toContainText('All pairs matched!');
  await cont.click();

  // ts-infer-1 (+10)
  await page.getByRole('button', { name: /^Option A: count: number/ }).click();
  await check.click();
  await cont.click();

  // ts-compiles-1: wrong — costs a heart, shows tsc, comes back at the end
  await page.getByRole('button', { name: 'Snippet B' }).click();
  await check.click();
  await expect(feedback).toContainText('Answer: A');
  await expect(feedback).toContainText('tsc says');
  await expect(page.getByText('4 hearts left')).toBeAttached();
  await cont.click();

  // ts-build-1 (+10), then the program's output
  await page.getByRole('button', { name: 'let', exact: true }).click();
  await page.getByRole('button', { name: '===', exact: true }).click();
  await check.click();
  await expect(page.getByRole('region', { name: 'Output' })).toContainText('true');
  await cont.click();

  // ts-error-1 (+10)
  await page.getByRole('button', { name: /^Line 4:/ }).click();
  await check.click();
  await cont.click();

  // ts-fix-1 (+10)
  await page.getByRole('button', { name: /^Option B:/ }).click();
  await check.click();
  await cont.click();

  // ts-type-1 (+10), checked with Enter
  await page.getByLabel('Missing token').fill('null');
  await page.keyboard.press('Enter');
  await expect(feedback).toBeVisible();
  await cont.click();

  // ts-compiles-1 again: right after a miss (+5)
  await page.getByRole('button', { name: 'Snippet A' }).click();
  await check.click();
  await cont.click();

  await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
  await expect(page.getByText('+75')).toBeVisible();
  await expect(page.getByText('88%')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('75 XP')).toBeVisible();
});
