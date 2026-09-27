import { expect, test } from '@playwright/test';

test('learn Ownership in Rust, practice it, and keep XP across courses', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Rust,/ }).click();
  await expect(page.getByText('Rust, one tap at a time')).toBeVisible();

  // Learn: a code demo, then an rs-choice demo that swaps the compiler's verdict.
  await page.getByRole('button', { name: 'Ownership & moves, 5 cards' }).click();
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveText('Every value has one owner');
  await expect(page.getByRole('region', { name: 'Output' })).toContainText('hi');
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(h1).toHaveText('Assignment moves');
  await expect(page.getByRole('region', { name: 'Compiler error' })).toContainText('E0382');
  await page.getByRole('button', { name: 's.clone()', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Output' })).toContainText('hi hi');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Practice this' }).click();

  const feedback = page.getByRole('region', { name: 'Feedback' });
  const check = page.getByRole('button', { name: 'Check' });
  const cont = page.getByRole('button', { name: 'Continue' });

  // rs-predict-1: right first time (+10)
  await page.getByRole('button', { name: /^Option A:/ }).click();
  await check.click();
  await expect(feedback).toContainText('Nice — that’s right!');
  await cont.click();

  // rs-pairs-1: no Check, completes itself (+10)
  for (const [left, right] of [
    ['String', 'Owned, growable text'],
    ['&String', 'Shared borrow, read-only'],
    ['&mut String', 'Exclusive borrow, can change it'],
    ['s.clone()', 'A deep copy with its own owner'],
  ]) {
    await page.getByRole('button', { name: left, exact: true }).click();
    await page.getByRole('button', { name: right, exact: true }).click();
  }
  await expect(feedback).toContainText('All pairs matched!');
  await cont.click();

  // rs-compiles-1: wrong — costs a heart, shows rustc, comes back at the end
  await page.getByRole('button', { name: 'Snippet A' }).click();
  await check.click();
  await expect(feedback).toContainText('Answer: B');
  await expect(feedback).toContainText('rustc says');
  await expect(page.getByText('4 hearts left')).toBeAttached();
  await cont.click();

  // rs-build-1 (+10), then the program's output
  await page.getByRole('button', { name: '&String', exact: true }).click();
  await page.getByRole('button', { name: '&name', exact: true }).click();
  await check.click();
  await expect(page.getByRole('region', { name: 'Output' })).toContainText('ferris FERRIS');
  await cont.click();

  // rs-error-1 (+10)
  await page.getByRole('button', { name: /^Line 5:/ }).click();
  await check.click();
  await cont.click();

  // rs-fix-1 (+10)
  await page.getByRole('button', { name: /^Option A:/ }).click();
  await check.click();
  await cont.click();

  // rs-type-1 (+10), checked with Enter
  await page.getByLabel('Missing token').fill('&mut');
  await page.keyboard.press('Enter');
  await expect(feedback).toBeVisible();
  await cont.click();

  // rs-compiles-1 again: right after a miss (+5)
  await page.getByRole('button', { name: 'Snippet B' }).click();
  await check.click();
  await cont.click();

  await expect(page.getByRole('heading', { name: 'Lesson complete!' })).toBeVisible();
  await expect(page.getByText('+65')).toBeVisible();
  await expect(page.getByText('86%')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('65 XP')).toBeVisible();

  // Progress is per course; the header XP is global.
  await page.getByRole('button', { name: 'Rust, change course' }).click();
  await expect(page.getByRole('button', { name: 'Rust, 1 of 1 units, 65 XP, current' })).toBeVisible();
  await page.getByRole('button', { name: /^CSS,/ }).click();
  await expect(page.getByText('Start here')).toBeVisible();
  await expect(page.getByText('65 XP')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: 'CSS, change course' })).toBeVisible();
});
