import { test, expect } from '@playwright/test';
import { ProductCreationPage } from '../pages/productCreation.page';
import { getVerificationCodeFromMailTm } from '../utils/mailTmCode';

const baseUrl = process.env.BASE_URL ?? 'https://dev-frontend-sup.cloudcouture.co';

/** Run a step; on error log and record it but do not throw, so the test continues. */
async function runStep(
  stepName: string,
  fn: () => Promise<void>,
  failedSteps: { step: string; error: string }[]
): Promise<void> {
  try {
    await test.step(stepName, fn);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    failedSteps.push({ step: stepName, error: message });
    console.error(`[FAILED] ${stepName}: ${message}`);
  }
}

test.describe('Product Creation', () => {
  test('product creation on the listing page', async ({ page }) => {
    test.setTimeout(120000);
    const productCreationPage = new ProductCreationPage(page);
    const failedSteps: { step: string; error: string }[] = [];

    const loginEmail = process.env.LOGIN_EMAIL ?? 'rijvi625@dollicons.com';
    const loginPassword = process.env.LOGIN_PASSWORD ?? 'Cse12222@';
    const mailTmEmail = process.env.MAILTM_EMAIL ?? 'rijvi625@dollicons.com';
    const mailTmPassword = process.env.MAILTM_PASSWORD ?? 'Cse12345@';

    // Step 1: Navigate to login, enter credentials, complete 2FA, and verify dashboard
    await runStep('Login', async () => {
      await productCreationPage.gotoLoginPage();
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();

      await productCreationPage.fillEmail(loginEmail);
      await expect(page.getByRole('textbox', { name: 'Email address' })).toHaveValue(loginEmail);

      await productCreationPage.clickContinueAfterEmail();
      await productCreationPage.fillPassword(loginPassword);
      await expect(page.getByRole('textbox', { name: 'Password' })).toHaveValue(loginPassword);

      await productCreationPage.clickContinueAfterPassword();
      await productCreationPage.waitForLoginToComplete();
      await productCreationPage.complete2FAAndWaitForDashboard({
        getCode: () =>
          getVerificationCodeFromMailTm(mailTmEmail, mailTmPassword, {
            timeoutMs: 90000,
            pollIntervalMs: 4000,
            initialDelayMs: 6000,
            receivedAfter: new Date(Date.now() - 120000),
          }),
      });
      await expect(page).toHaveURL(/\/dashboard/);
    }, failedSteps);

    // Step 2: From dashboard, click My Listing and verify listing page URL
    await runStep('Go to My Listing from dashboard', async () => {
      await expect(page.getByRole('link', { name: 'My Listing' })).toBeVisible();
      await productCreationPage.goToMyListing();
      await expect(page).toHaveURL(/\/dashboard\/listing/);
    }, failedSteps);

    // Step 3: Click + Add product and verify Product menu option is visible
    await runStep('Open Add product section', async () => {
      await expect(page.getByRole('button', { name: '+ Add product' })).toBeVisible();
      await productCreationPage.openAddProduct();
      await expect(page.getByRole('menuitem', { name: 'Product' })).toBeVisible();
    }, failedSteps);

    // Step 4: Select Product from menu and verify Item name field is visible
    await runStep('Select Product from dropdown', async () => {
      await productCreationPage.selectProductFromDropdown();
      await expect(page.getByRole('textbox', { name: 'Item name (Required)' })).toBeVisible();
    }, failedSteps);

    // Step 5: Fill required Item name and verify value
    await runStep('Fill Item name', async () => {
      await productCreationPage.fillItemName();
      await expect(page.getByRole('textbox', { name: 'Item name (Required)' })).toHaveValue('Classic Linen Summer Shirt');
    }, failedSteps);

    // // Step 6: Verify Type combobox shows Product (read-only)
    // await runStep('Verify Type is Product (disabled)', async () => {
    //   await productCreationPage.verifyTypeIsProduct();
    //   await expect(page.getByRole('combobox').filter({ hasText: /^Product$/ })).toBeVisible();
    // }, failedSteps);

    // Step 7: Select or add category (e.g. T-Shirt) from dropdown
    await runStep('Select or add product type from dropdown', async () => {
      await productCreationPage.selectProductCategory();
      await expect(page.getByRole('button', { name: 'T-Shirt' }).first()).toBeVisible();
    }, failedSteps);

    // Step 8: Set status to Active and verify
    await runStep('Select status', async () => {
      await productCreationPage.selectStatus();
      await expect(page.getByRole('combobox').filter({ hasText: 'Active' })).toBeVisible();
    }, failedSteps);

    // Step 9: Add optional tags and verify value
    await runStep('Add tags', async () => {
      await productCreationPage.addTags();
      await expect(page.getByRole('textbox', { name: 'Tags (Optional)' })).toHaveValue('Dress');
    }, failedSteps);

    // Step 10: Upload product image and click Save & Upload
    await runStep('Upload image', async () => {
      await productCreationPage.uploadImage();
      await expect(page.locator('div').filter({ hasText: 'Click to upload or drag and' }).nth(1)).toBeVisible();
    }, failedSteps);

    // Step 11: Add short description in rich text editor and verify
    await runStep('Add short description', async () => {
      await productCreationPage.addShortDescription();
      await expect(page.locator('.ql-editor').first()).toContainText('Test');
    }, failedSteps);

    // Step 12: Add long description in rich text editor and verify
    await runStep('Add long description', async () => {
      await productCreationPage.addLongDescription();
      await expect(page.locator('.ql-editor').nth(1)).toContainText('Test');
    }, failedSteps);

    // Step 13: Fill optional Material field and verify
    await runStep('Add Material', async () => {
      await productCreationPage.addMaterial();
      await expect(page.getByRole('textbox', { name: 'Material (Optional)' })).toHaveValue('Cotton');
    }, failedSteps);

    // Step 14: Fill optional Material weight and verify
    await runStep('Add Material weight', async () => {
      await productCreationPage.addMaterialWeight();
      await expect(page.getByRole('textbox', { name: 'Material weight (Optional)' })).toHaveValue('200gm');
    }, failedSteps);

    // Step 15: Fill optional Fit and verify
    await runStep('Add Fit', async () => {
      await productCreationPage.addFit();
      await expect(page.getByRole('textbox', { name: 'Fit (Optional)' })).toHaveValue('Semi Fit');
    }, failedSteps);

    // Step 16: Fill optional Care instruction and verify
    await runStep('Add Care instruction', async () => {
      await productCreationPage.addCareInstruction();
      await expect(page.getByRole('textbox', { name: 'Care instruction (Optional)' })).toHaveValue('Test');
    }, failedSteps);

    // Step 17: Add color options (Black, white) and verify
    await runStep('Add colors', async () => {
      await productCreationPage.addColors();
      await expect(page.getByRole('textbox', { name: 'Enter option' }).first()).toHaveValue('Black');
      await expect(page.getByRole('textbox', { name: 'Enter option' }).nth(1)).toHaveValue('white');
    }, failedSteps);

    // Step 18: Set sample price and verify
    await runStep('Add sample price', async () => {
      await productCreationPage.addSamplePrice();
      await expect(page.getByRole('spinbutton', { name: 'Sample price' })).toHaveValue('100');
    }, failedSteps);

    // Step 19: Set sample MOQ and verify
    await runStep('Add sample MOQ', async () => {
      await productCreationPage.addSampleMOQ();
      await expect(page.getByRole('spinbutton', { name: 'Sample MOQ' })).toHaveValue('1');
    }, failedSteps);

    // Step 20: Set sample delivery time (days) and verify
    await runStep('Add sample delivery time', async () => {
      await productCreationPage.addSampleDeliveryTime();
      await expect(page.getByRole('spinbutton', { name: 'Sample delivery time' })).toHaveValue('2');
    }, failedSteps);

    // Step 21: Add production price tier (per unit cost, MOQ) and verify
    await runStep('Add production pricing', async () => {
      await productCreationPage.addProductionPricing();
      await expect(page.getByRole('textbox', { name: 'Enter per unit cost' })).toHaveValue('100');
      await expect(page.getByRole('textbox', { name: 'Enter production MOQ' })).toHaveValue('1');
    }, failedSteps);

    // Step 22: Set production delivery time (days) and verify
    await runStep('Add production delivery time', async () => {
      await productCreationPage.addProductionDeliveryTime();
      await expect(page.getByRole('spinbutton', { name: 'Production delivery time (' })).toHaveValue('5');
    }, failedSteps);

    // Step 23: Fill additional notes and verify
    await runStep('Add additional notes', async () => {
      await productCreationPage.addAdditionalNotes();
      await expect(page.getByRole('textbox', { name: 'Additional notes' })).toHaveValue('test');
    }, failedSteps);

    // Step 24: Add Size variant (M, L) and verify
    await runStep('Add variation Size', async () => {
      await productCreationPage.addVariationSize();
      await expect(page.getByRole('textbox', { name: 'Enter option' }).nth(2)).toHaveValue('M');
      await expect(page.getByRole('textbox', { name: 'Enter option' }).nth(3)).toHaveValue('L');
    }, failedSteps);

    // Step 25: Add Type variant (Exclusive, Not-exclusive) and verify
    await runStep('Add variation Type', async () => {
      await productCreationPage.addVariationType();
      await expect(page.getByRole('heading', { name: 'Variations' })).toBeVisible();
    }, failedSteps);

    // Step 26: Add Duration variant (2 year) and verify
    await runStep('Add variation Duration', async () => {
      await productCreationPage.addVariationDuration();
      await expect(page.getByRole('heading', { name: 'Variations' })).toBeVisible();
    }, failedSteps);

    // Step 27: Fill SKU number and verify
    await runStep('Add SKU number', async () => {
      await productCreationPage.addSkuNumber();
      await expect(page.getByRole('textbox', { name: 'SKU number' })).toHaveValue('SHRT-LIN-180-WHT-002');
    }, failedSteps);

    // Step 28: Click Save button to submit the product form
    await runStep('Click Save', async () => {
      await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
      await productCreationPage.clickSave();
    }, failedSteps);

    // Step 29: Verify redirect to dashboard listing page after save
    await runStep('Verify redirect to listing page', async () => {
      await expect(page).toHaveURL(`${baseUrl}/dashboard/listing`);
    }, failedSteps);

    if (failedSteps.length > 0) {
      const summary = failedSteps.map(({ step, error }) => `${step}: ${error}`).join('\n');
      throw new Error(`${failedSteps.length} step(s) failed:\n${summary}`);
    }
  });
});
