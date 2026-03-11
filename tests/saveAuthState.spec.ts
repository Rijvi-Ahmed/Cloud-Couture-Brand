/**
 * Run once to sign in (email + password + verification code) and save session + Bearer token.
 * Set LOGIN_EMAIL, LOGIN_PASSWORD, and VERIFICATION_CODE in .env (e.g. 424242 for Clerk dev).
 *
 * Usage:
 *   npx playwright test tests/saveAuthState.spec.ts --project=save-auth
 *   # or: npm run test:save-auth
 *
 * This creates:
 *   - playwright-auth-state.json (cookies + storage so you stay "logged in")
 *   - .auth-token (Bearer JWT so you don't need to hit the Clerk token endpoint again)
 *
 * Then run other tests; they load the saved state and token and skip login.
 */

import * as fs from 'fs';
import * as path from 'path';
import { test } from '@playwright/test';
import { ProductCreationPage } from '../pages/productCreation.page';

const baseUrl = process.env.BASE_URL ?? 'https://dev-frontend-sup.cloudcouture.co';
const statePath =
  process.env.AUTH_STORAGE_PATH ?? path.join(process.cwd(), 'playwright-auth-state.json');
const tokenPath = path.join(process.cwd(), '.auth-token');

test.describe('Save auth state (email + password + verification code)', () => {
  test('sign in and save storage state + Bearer token', async ({
    page,
    context,
  }) => {
    test.setTimeout(120000);

    const productCreationPage = new ProductCreationPage(page);
    const loginEmail = process.env.LOGIN_EMAIL ?? '';
    const loginPassword = process.env.LOGIN_PASSWORD ?? '';
    const verificationCode =
      process.env.VERIFICATION_CODE?.trim() || '424242';

    if (!loginEmail || !loginPassword) {
      throw new Error('Set LOGIN_EMAIL and LOGIN_PASSWORD in .env to run this script.');
    }

    let capturedJwt: string | null = null;

    const captureTokenFromResponse = async (response: { url: () => string; request: () => { method: () => string }; status: () => number; json: () => Promise<unknown> }) => {
      const url = response.url();
      if (
        url.includes('clerk.accounts.dev') &&
        url.includes('tokens') &&
        response.request().method() === 'POST' &&
        response.status() === 200
      ) {
        try {
          const body = (await response.json()) as Record<string, unknown>;
          const jwt =
            (body.jwt as string) ??
            (body.token as string) ??
            ((body.data as Record<string, unknown>)?.jwt as string) ??
            ((body.data as Record<string, unknown>)?.token as string);
          if (jwt && typeof jwt === 'string') capturedJwt = jwt;
        } catch (_) {
          // ignore
        }
      }
    };

    page.on('response', captureTokenFromResponse);

    await test.step('Sign in with email + password + verification code', async () => {
      await productCreationPage.gotoLoginPage();
      await productCreationPage.fillEmail(loginEmail);
      await productCreationPage.clickContinueAfterEmail();
      await productCreationPage.fillPassword(loginPassword);
      await productCreationPage.clickContinueAfterPassword();
      await productCreationPage.waitForLoginToComplete();
      await productCreationPage.complete2FAAndWaitForDashboard({ code: verificationCode });
    });

    await test.step('Wait for Bearer token from Clerk token endpoint', async () => {
      if (capturedJwt) return;
      const tokenResponsePromise = page.waitForResponse(
        res => {
          const u = res.url();
          return (
            u.includes('clerk.accounts.dev') &&
            u.includes('tokens') &&
            res.request().method() === 'POST' &&
            res.status() === 200
          );
        },
        { timeout: 20000 }
      );
      await page.reload({ waitUntil: 'domcontentloaded' });
      try {
        const tokenResponse = await tokenResponsePromise;
        await captureTokenFromResponse(tokenResponse);
      } catch (_) {
        // Listener may have set capturedJwt on first load; poll a bit longer
        const deadline = Date.now() + 5000;
        while (!capturedJwt && Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 300));
        }
      }
    });

    await test.step('Save storage state (cookies + localStorage)', async () => {
      await context.storageState({ path: statePath });
    });

    await test.step('Save Bearer token for reuse', async () => {
      if (capturedJwt) {
        fs.writeFileSync(tokenPath, capturedJwt, 'utf8');
      } else {
        throw new Error(
          'Could not capture Bearer token from Clerk. The app may request it from a different URL or after a navigation. Save playwright-auth-state.json only, and set BEARER_TOKEN in .env manually from DevTools (Application > Local Storage or Network tab).'
        );
      }
    });

    await test.step('Verify dashboard', async () => {
      await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 5000 });
    });
  });
});
