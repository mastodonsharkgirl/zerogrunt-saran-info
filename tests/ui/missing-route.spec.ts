import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('missing route has a readable noindex 404 and native return links without JavaScript', async ({ browser }) => {
  const artifact = await readFile('dist/404.html', 'utf8');
  expect(artifact).toMatch(/name="robots"[^>]*content="[^"]*noindex/);
  expect(artifact).not.toMatch(/rel="canonical"|property="og:url"/);
  expect(artifact).toMatch(/href="\/"[^>]*>Return to homepage/);
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const response = await page.goto('/missing-guided-20261103?debug-secret=opaque-value');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found', exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('link[rel="canonical"], meta[property="og:url"]')).toHaveCount(0);
  await expect(page.locator('script')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('opaque-value');
  await expect(page.locator('body')).not.toContainText('missing-guided-20261103');
  await expect(page.getByRole('link', { name: 'Return to homepage', exact: true })).toHaveAttribute('href', '/');
  const lab = page.getByRole('link', { name: 'Open invoice lab', exact: true });
  await expect(lab).toHaveAttribute('href', '/#lab');
  if (process.env.WALKTHROUGH_EVIDENCE_DIR) await page.screenshot({ path: `${process.env.WALKTHROUGH_EVIDENCE_DIR}/missing-route-390.png`, fullPage: true });
  await lab.click();
  await expect(page).toHaveURL('/#lab');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://zerogrunt.saran.info/');
  await context.close();
});
