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

test('a seeded teacher session reaches the role-scoped workspace', async ({ page, request }) => {
  const response = await request.post('http://localhost:4000/api/v1/auth/login', {
    data: { email: 'teacher@demo.edukonekta.test', password: 'PinkoraDemo!2026' },
  });
  expect(response.ok()).toBeTruthy();
  const session = /pk_session=([^;]+)/.exec(response.headers()['set-cookie'] ?? '')?.[1];
  expect(session).toBeTruthy();
  await page.context().addCookies([
    {
      name: 'pk_session',
      value: session!,
      url: 'http://localhost:4000',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await page.goto('/workspace');
  await expect(page.getByRole('heading', { name: 'Your school workspace' })).toBeVisible();
  await expect(page.getByText('You are signed in as Teacher.')).toBeVisible();
});

test('communications screen is responsive and available', async ({ page }) => {
  await page.goto('/communications');
  await expect(page.getByRole('heading', { name: 'Announcements & calendar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Latest updates' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Coming up' })).toBeVisible();
});
