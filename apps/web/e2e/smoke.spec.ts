import { expect, test } from '@playwright/test';

// The local Docker web service runs Next.js in development mode and may compile a route on first use.
test.setTimeout(60_000);

test('web health route is available', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({ status: 'ok', service: 'web' });
});

test('closed authentication entry point is visible', async ({ page }) => {
  await page.goto('/auth');
  await expect(page.getByText('Registration is invitation-only.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Activate invite' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Recover' })).toBeVisible();
});

test('a seeded teacher can sign in through the browser form and reach the role-scoped workspace', async ({
  page,
}) => {
  await page.goto('/auth');
  await page.getByLabel('Email').fill('teacher@demo.edukonekta.test');
  await page.getByLabel('Password').fill('PinkoraDemo!2026');
  const login = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/v1/auth/login') && response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Sign in' }).click();
  expect((await login).ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/workspace$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Your school workspace' })).toBeVisible();
  await expect(page.getByText('You are signed in as Teacher.')).toBeVisible();
});

test('communications screen is responsive and available', async ({ page }) => {
  await page.goto('/communications');
  await expect(page.getByRole('heading', { name: 'Announcements & calendar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Latest updates' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Coming up' })).toBeVisible();
});
