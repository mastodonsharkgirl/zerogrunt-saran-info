import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';

test('guide navigation highlights real sections without operating the invoice', async ({ page }) => {
  await page.goto('/?scenario=recovery#lab');
  await page.getByRole('button', { name: 'Start guided walkthrough' }).click();
  const guide = page.getByRole('region', { name: 'Guided walkthrough' });
  await expect(guide).toBeVisible();
  await expect(guide.getByRole('heading')).toBeFocused();
  await expect(page.locator('[data-tour-target="invoice"]')).toHaveAttribute('data-walkthrough-current', 'true');
  for (let index = 0; index < 5; index++) await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide).toContainText('Step 6 of 6');
  await expect(page.locator('#approach')).toHaveAttribute('data-walkthrough-current', 'true');
  await guide.getByRole('button', { name: 'Finish', exact: true }).click();
  await expect(guide).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start guided walkthrough' })).toBeFocused();
  await page.getByRole('button', { name: /Recovery/ }).click();
  await expect(page.getByText('Ready to send', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Context/ }).click();
  await expect(page.getByText('Awaiting operator review.', { exact: true })).toBeVisible();
  await expect(page.getByText('Policy v1 · Operator up to ₹2,000', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Correction/ }).click();
  await expect(page.getByText('Original proposal · OFFICE-OPS', { exact: true })).toBeVisible();
});

test('guide preserves real actions, existing state and keyboard handoff', async ({ page }) => {
  await page.goto('/?scenario=context#lab');
  await page.getByRole('button', { name: 'Approve as operator', exact: true }).click();
  await page.getByRole('button', { name: 'Change threshold to ₹1,000' }).click();
  await page.getByRole('button', { name: 'Start guided walkthrough' }).click();
  const guide = page.getByRole('region', { name: 'Guided walkthrough' });
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide).toContainText('already using the ₹1,000 threshold');
  await expect(page.getByText('The earlier approval is invalid.', { exact: false })).toBeVisible();
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Send · lose response' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Check the receipt' })).toBeFocused();
  await expect(guide).toContainText('current simulated outcome is unknown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Run again' })).toBeFocused();
  await expect(guide).toContainText('simulated receipt is now verified');
  await page.keyboard.press('Escape');
  await expect(guide).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start guided walkthrough' })).toBeFocused();
  await page.getByRole('button', { name: 'Start guided walkthrough' }).click();
  await page.getByRole('button', { name: /Correction/ }).click();
  await expect(guide).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Correction/ })).toBeFocused();
  await page.getByRole('button', { name: /Recovery/ }).click();
  await expect(page.getByText('Receipt verified', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start guided walkthrough' }).click();
  await page.getByRole('button', { name: /Reset lab/ }).click();
  await expect(guide).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Reset lab/ })).toBeFocused();
  await expect(page.getByText('Ready to send', { exact: true })).toBeVisible();
});

test('guide and presentation are mutually exclusive without arrow hijacking', async ({ page }) => {
  await page.goto('/#lab');
  await page.getByRole('button', { name: /Presentation mode/ }).click();
  await expect(page.locator('#presentation-controls')).toBeVisible();
  await page.getByRole('button', { name: 'Start guided walkthrough' }).click();
  const guide = page.getByRole('region', { name: 'Guided walkthrough' });
  await expect(page.locator('#presentation-controls')).toBeHidden();
  await guide.getByRole('button', { name: 'Collapse guide' }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Try changing the policy' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(guide).toContainText('Step 1 of 6');
  await page.getByRole('button', { name: /Presentation mode/ }).click();
  await expect(guide).toHaveCount(0);
  await expect(page.locator('#presentation-controls')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#presentation-controls')).toBeHidden();
  await page.getByRole('button', { name: 'Start guided walkthrough' }).click();
  await page.keyboard.press('Escape');
  await expect(guide).toHaveCount(0);
  await expect(page.locator('[data-walkthrough-current]')).toHaveCount(0);
});

test('guide allows unavailable and delayed evidence without inventing results', async ({ page }) => {
  let releaseHttp: () => void = () => {};
  const httpReady = new Promise<void>((resolve) => { releaseHttp = resolve; });
  await page.route('**/evidence/**', async (route) => {
    if (route.request().url().endsWith('/http-run.json')) {
      await httpReady;
      await route.continue();
    } else await route.fulfill({ status: 503, body: 'Unavailable' });
  });
  await page.goto('/?scenario=recovery#lab');
  await page.getByRole('button', { name: 'Start guided walkthrough' }).click();
  const guide = page.getByRole('region', { name: 'Guided walkthrough' });
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await page.locator('.evidence-details > summary').filter({ hasText: 'Inspect recorded HTTP run' }).click();
  await expect(page.getByText('Loading recorded evidence…')).toBeVisible();
  releaseHttp();
  await expect(page.getByText('Recorded result:', { exact: false })).toBeVisible();
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByText('Inspect recorded evaluation', { exact: false }).click();
  await expect(page.getByText('Evidence is unavailable in this build.', { exact: false }).first()).toBeVisible();
  await expect(guide).toContainText('does not rerun');
  await expect(page.getByRole('table')).toHaveCount(0);
});

test('missing guide target remains recoverable', async ({ page }) => {
  await page.goto('/#lab');
  await page.locator('[data-tour-target="invoice"]').evaluate((element) => element.removeAttribute('data-tour-target'));
  await page.getByRole('button', { name: 'Start guided walkthrough' }).click();
  const guide = page.getByRole('region', { name: 'Guided walkthrough' });
  await expect(guide).toContainText('This part is unavailable');
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('[data-tour-target="context"]')).toHaveAttribute('data-walkthrough-current', 'true');
  await page.keyboard.press('Escape');
  await expect(guide).toHaveCount(0);
});

test('native walkthrough notes remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/#walkthrough-notes');
  await expect(page.getByRole('button', { name: 'Start guided walkthrough' })).toHaveCount(0);
  await page.getByText('Walkthrough notes', { exact: true }).click();
  await expect(page.getByText('The interactive controls need JavaScript.', { exact: false })).toBeVisible();
  await expect(page.locator('#walkthrough-notes')).toContainText('where AI helped');
  await expect(page.locator('#walkthrough-notes')).toContainText('recorded HTTP');
  await context.close();
});

test('guide remains usable at narrow, intermediate and desktop widths', async ({ page }, testInfo) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: width === 390 ? 'no-preference' : 'reduce' });
    await page.goto('/#lab');
    await page.getByRole('button', { name: 'Start guided walkthrough' }).click();
    const guide = page.getByRole('region', { name: 'Guided walkthrough' });
    await guide.getByRole('button', { name: 'Next', exact: true }).click();
    await guide.getByRole('button', { name: 'Next', exact: true }).click();
    await expect.poll(async () => (await page.locator('[data-tour-target="recovery"]').boundingBox())!.y).toBeLessThan(35);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    const panel = (await guide.boundingBox())!;
    const target = (await page.locator('[data-tour-target="recovery"]').boundingBox())!;
    expect(target.y).toBeGreaterThanOrEqual(0);
    expect(target.y + target.height).toBeLessThanOrEqual(panel.y);
    const screenshot = process.env.WALKTHROUGH_EVIDENCE_DIR ? path.join(process.env.WALKTHROUGH_EVIDENCE_DIR, `recovery-${width}.png`) : testInfo.outputPath(`recovery-${width}.png`);
    await page.screenshot({ path: screenshot });
    await guide.getByRole('button', { name: 'Collapse guide' }).click();
    await expect(guide.getByRole('button', { name: 'Show guide' })).toBeVisible();
    await guide.getByRole('button', { name: 'Show guide' }).click();
    await expect(guide.getByRole('heading')).toBeFocused();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await guide.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(guide).toHaveCSS('animation-name', 'none');
    if (width === 320) expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
  }
});

test('enlarged text retains guide navigation and normal keyboard traversal', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#lab');
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await page.getByRole('button', { name: 'Start guided walkthrough' }).click();
  const guide = page.getByRole('region', { name: 'Guided walkthrough' });
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide.getByRole('button', { name: 'Exit walkthrough' })).toBeVisible();
  await guide.getByRole('button', { name: 'Next', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(guide.getByRole('button', { name: 'Show section' })).toBeFocused();
  const overflow = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).filter((element) => { const r = element.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1; }).map((element) => ({ tag: element.tagName, className: element.className, width: element.getBoundingClientRect().width, right: element.getBoundingClientRect().right })));
  expect(overflow).toEqual([]);
  const screenshot = process.env.WALKTHROUGH_EVIDENCE_DIR ? path.join(process.env.WALKTHROUGH_EVIDENCE_DIR, 'enlarged-text-390.png') : testInfo.outputPath('enlarged-text-390.png');
  await page.screenshot({ path: screenshot });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Start guided walkthrough' })).toBeFocused();
});
