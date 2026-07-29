import { expect, test } from '@playwright/test';

test('web health route is available', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({ status: 'ok', service: 'web' });
});

test('closed authentication entry point is visible', async ({ page }) => {
  await page.goto('/auth');
  await expect(page.getByText('Registration is invitation-only.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activate invite' })).toBeVisible();
});

test('communications screen is responsive and available', async ({ page }) => {
  await page.goto('/communications');
  await expect(page.getByText('School communications')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Announcements' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible();
});
