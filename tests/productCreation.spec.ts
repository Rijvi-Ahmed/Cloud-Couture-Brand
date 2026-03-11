/**
 * Product creation E2E test.
 * Uses saved auth so you don't login every time:
 *   - Token: .auth-token (from npm run test:save-auth) or BEARER_TOKEN in .env
 *   - Session: playwright-auth-state.json (from npm run test:save-auth)
 * With both present, the test goes straight to the dashboard and skips login.
 */

import * as fs from 'fs';
import * as path from 'path';
import { test } from '@playwright/test';
import { ProductCreationPage } from '../pages/productCreation.page';

const baseUrl = process.env.BASE_URL ?? 'https://dev-frontend-sup.cloudcouture.co';
const backendOrigin = 'https://dev-backend.cloudcouture.co';
const authTokenPath = path.join(process.cwd(), '.auth-token');

function getBearerToken(): string | undefined {
  const fromEnv = process.env.BEARER_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  try {
    if (fs.existsSync(authTokenPath)) {
      return fs.readFileSync(authTokenPath, 'utf8').trim();
    }
  } catch (_) {
    // ignore
  }
  return undefined;
}

test.describe('Product Creation', () => {
  test('product creation on the listing page', async ({ page }) => {
    const productCount = Math.max(1, parseInt(process.env.PRODUCT_COUNT ?? '1', 10));
    test.setTimeout(Math.max(120000, 90000 * productCount));
    const productCreationPage = new ProductCreationPage(page);
    const bearerToken = getBearerToken();

    const loginEmail = process.env.LOGIN_EMAIL ?? 'jane+clerk_test@example.com';
    const verificationCode = process.env.VERIFICATION_CODE?.trim() || '424242';
    const addedItemNames: string[] = [];
    let expectedItemName: string;

    // When we have a saved Bearer token: mock Clerk token endpoint and add Auth header to backend
    if (bearerToken) {
      await page.route('**/clerk.accounts.dev/**/tokens*', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ jwt: bearerToken }),
          });
        } else {
          await route.continue();
        }
      });
      await page.route(`${backendOrigin}/**`, async route => {
        const headers = { ...route.request().headers(), authorization: `Bearer ${bearerToken}` };
        await route.continue({ headers });
      });
    }

    // Step 1: Use saved session + token (no login), or sign in with email + verification code
    await test.step('Login or use saved session', async () => {
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'load' });
      const redirectedToLogin = page.url().includes('/login');

      if (bearerToken && redirectedToLogin) {
        throw new Error(
          'Saved token exists but the app showed the login page (no session cookies). ' +
            'Run once: npm run test:save-auth — then re-run this test.'
        );
      }
      if (redirectedToLogin) {
        await productCreationPage.signInWithEmailCode(loginEmail, verificationCode);
      } else {
        await productCreationPage.waitForDashboard();
      }
    });

    // Step 2: From dashboard, click My Listing and verify listing page URL
    await test.step('Go to My Listing from dashboard', async () => {
      await productCreationPage.goToMyListing();
    });

    // Step 3–29: Add multiple products (loop count from env PRODUCT_COUNT, default 1)
    for (let i = 0; i < productCount; i++) {
      await test.step(`Add product ${i + 1} of ${productCount}`, async () => {
        await productCreationPage.openAddProduct();
        await productCreationPage.selectProductFromDropdown();
        expectedItemName = await productCreationPage.fillItemName();
        addedItemNames.push(expectedItemName);
        await productCreationPage.addProductType();
        await productCreationPage.selectProductCategory();
        await productCreationPage.selectStatus();
        await productCreationPage.addTags();
        await productCreationPage.uploadImage();
        await productCreationPage.addShortDescription();
        await productCreationPage.addLongDescription();
        await productCreationPage.addMaterial();
        await productCreationPage.addMaterialWeight();
        await productCreationPage.addFit();
        await productCreationPage.addCareInstruction();
        await productCreationPage.addColors();
        await productCreationPage.addSamplePrice();
        await productCreationPage.addSampleMOQ();
        await productCreationPage.addSampleDeliveryTime();
        await productCreationPage.addProductionPricing();
        await productCreationPage.addProductionDeliveryTime();
        await productCreationPage.addAdditionalNotes();
        await productCreationPage.addVariationSize();
        await productCreationPage.addVariationType();
        await productCreationPage.addVariationDuration();
        await productCreationPage.addSkuNumber();
        await productCreationPage.clickSave();
        await page.waitForURL(`${baseUrl}/dashboard/listing`);
      });
    }

    // Report: all added item names (bullet list with indentation)
    await test.step('Report all added items', async () => {
      const addedList =
        addedItemNames.length > 0
          ? addedItemNames.map(name => `    * ${name}`).join('\n')
          : '(none)';
      test.info().annotations.push({
        type: 'All added items',
        description: `All added items:\n${addedList}`,
      });
    });
  });
});
