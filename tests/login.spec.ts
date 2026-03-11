import { test, expect } from '@playwright/test';

const LOGIN_URL = 'https://dev-frontend-sup.cloudcouture.co/login';

test.describe('Login page', () => {
  test('visits the login page', async ({ page }) => {
    await page.goto(LOGIN_URL);

    await expect(page).toHaveURL(/\/login/);
  });

  test('login page loads and is visible', async ({ page }) => {
    await page.goto(LOGIN_URL);

    await expect(page).toHaveURL(LOGIN_URL);
    await page.waitForLoadState('domcontentloaded');
  });
});
