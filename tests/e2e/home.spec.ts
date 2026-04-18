import { expect, test } from '@playwright/test';

test('home mostra o titulo do projeto', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'CriptoIR' })).toBeVisible();
});
