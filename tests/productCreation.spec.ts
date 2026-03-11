import { test, expect } from '@playwright/test';
import { ProductCreationPage } from '../pages/productCreation.page';
import { getVerificationCodeFromMailTm } from '../utils/mailTmCode';

test.describe('Product Creation', () => {
  test('product creation on the listing page', async ({ page }) => {
    test.setTimeout(120000);
    const productCreationPage = new ProductCreationPage(page);

    const loginEmail = process.env.LOGIN_EMAIL ?? 'rijvi625@dollicons.com';
    const loginPassword = process.env.LOGIN_PASSWORD ?? 'Cse12222@';
    const mailTmEmail = process.env.MAILTM_EMAIL ?? 'rijvi625@dollicons.com';
    const mailTmPassword = process.env.MAILTM_PASSWORD ?? 'Cse12345@';

    await test.step('Login', async () => {
      await productCreationPage.gotoLoginPage();
      await productCreationPage.fillEmail(loginEmail);
      await productCreationPage.clickContinueAfterEmail();
      await productCreationPage.fillPassword(loginPassword);
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
    });

    await test.step('Product creation', async () => {
      // TODO: add product creation steps here
    });
  });
});
