import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('policy changes invalidate approval and recovery verifies a receipt', async ({ page }) => {
  await page.goto('/?scenario=context#lab');
  await page.getByRole('button', { name: 'Approve as operator' }).click();
  await expect(page.getByText('Approved against the current policy')).toBeVisible();
  await page.getByRole('button', { name: 'Change threshold to ₹1,000' }).click();
  await expect(page.getByText('The earlier approval is invalid', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: /Recovery/ }).click();
  await page.getByRole('button', { name: 'Send · lose response' }).click();
  await expect(page.getByText('Outcome unknown')).toBeVisible();
  await page.getByRole('button', { name: 'Check the receipt' }).click();
  await expect(page.getByText('Receipt verified')).toBeVisible();
});

test('correction requires testing and explicit activation, and can be withdrawn', async ({ page }) => {
  await page.goto('/?scenario=correction#lab');
  await page.getByRole('button', { name: 'Apply one-off correction' }).click();
  await expect(page.getByText('One-off correction applied')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activate control candidate' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Propose scoped rule' }).click();
  await page.getByRole('button', { name: 'Approve for testing' }).click();
  await page.getByRole('button', { name: 'Run control check' }).click();
  await expect(page.getByText('another entity or purpose is excluded', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Activate control candidate' }).click();
  await page.getByRole('button', { name: 'Check matching invoice 000185' }).click();
  await expect(page.getByText('The active control candidate proposes FACILITIES', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Check different purpose' }).click();
  await expect(page.getByText('The baseline remains', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Withdraw candidate' }).click();
  await expect(page.getByText('Scoped candidate · withdrawn')).toBeVisible();
  await page.getByRole('button', { name: 'Check matching invoice 000185' }).click();
  await expect(page.getByText('The baseline remains', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: /Reset lab/ }).click();
  await expect(page.getByText('Original proposal · OFFICE-OPS')).toBeVisible();
});

test('presentation controls support keyboard exit and narrow screens do not overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?scenario=evaluation#lab');
  await expect(page.locator('.mobile-ownership')).toBeVisible();
  await expect(page.getByRole('button', { name: /Evaluation/ })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: /Presentation mode/ }).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#progress')).toContainText(' / 7');
  await page.keyboard.press('Escape');
  await expect(page.locator('#presentation-controls')).toBeHidden();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test('recorded evidence renders its bounded results without replacing the simulation', async ({ page }) => {
  await page.goto('/?scenario=evaluation#lab');
  await page.getByText('Inspect recorded evaluation').click();
  await expect(page.getByRole('table', { name: 'Known replay · exact case counts' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'Routing correct 3/4 4/4' })).toBeVisible();
  await page.getByText('Inspect separate frozen challenge').click();
  await expect(page.getByRole('row', { name: 'Baseline correct 6/6' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'Candidate correct 6/6' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'Unsafe policy override 0/1' })).toBeVisible();
  await expect(page.getByRole('row', { name: 'Cross-vendor leakage 0/1' })).toBeVisible();
  await page.getByText('Inspect recorded model proposals').click();
  await expect(page.getByText('Valid format did not mean correct coding in these two examples.')).toBeVisible();
  await page.getByRole('button', { name: /Recovery/ }).click();
  await page.getByText('Inspect recorded HTTP run').click();
  await expect(page.getByText('1 simulated posting')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send · lose response' })).toBeVisible();
});

test('keyboard focus follows the next workflow action', async ({ page }) => {
  await page.goto('/?scenario=recovery#lab');
  await page.getByRole('button', { name: 'Send · lose response' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Check the receipt' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Run again' })).toBeFocused();
  await page.getByRole('button', { name: /Correction/ }).click();
  await page.getByRole('button', { name: 'Apply one-off correction' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Propose scoped rule' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Approve for testing' })).toBeFocused();
});
