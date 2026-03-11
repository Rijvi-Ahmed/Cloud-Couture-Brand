import { type Page } from '@playwright/test';

export class ProductCreationPage {
  constructor(private readonly page: Page) {}

  /** Navigate to the login page */
  async gotoLoginPage(): Promise<void> {
    const baseUrl = process.env.BASE_URL || 'https://dev-frontend-sup.cloudcouture.co';
    await this.page.goto(`${baseUrl}/login`);
  }

  /** Fill the email address field */
  async fillEmail(email: string): Promise<void> {
    const emailInput = this.page.getByRole('textbox', { name: 'Email address' });
    await emailInput.click();
    await emailInput.fill(email);
  }

  /** Click Continue button (after email) */
  async clickContinueAfterEmail(): Promise<void> {
    await this.page.getByRole('button', { name: 'Continue', exact: true }).click();
  }

  /** Fill the password field */
  async fillPassword(password: string): Promise<void> {
    const passwordInput = this.page.getByRole('textbox', { name: 'Password' });
    await passwordInput.click();
    await passwordInput.fill(password);
  }

  /** Click Continue button (after password) to submit login */
  async clickContinueAfterPassword(): Promise<void> {
    await this.page.getByRole('button', { name: 'Continue' }).click();
  }

  /** Wait for first step to complete (either factor-two page or dashboard). */
  async waitForLoginToComplete(): Promise<void> {
    await this.page.waitForURL(
      url => url.hash.includes('factor-two') || url.pathname.includes('/dashboard'),
      { timeout: 15000 }
    );
  }

  private get verificationCodeInput() {
    return this.page.getByRole('textbox', { name: 'Enter verification code' });
  }

  /** Wait until redirected to factor-two (2FA) page: /login#/factor-two */
  async waitForFactorTwoPage(): Promise<void> {
    await this.page.waitForURL(url => url.hash.includes('factor-two'), { timeout: 15000 });
  }

  /** Click "Email code to ..." to send the verification code to your email. */
  async clickSendEmailCode(): Promise<void> {
    const btn = this.page.getByRole('button', { name: /Email code to .+/i });
    await btn.click({ timeout: 30000 });
  }

  /** Fill the 2FA verification code into "Enter verification code" field. */
  async fillVerificationCode(code: string): Promise<void> {
    await this.verificationCodeInput.fill(code);
  }

  /** Wait until landed on dashboard: /dashboard */
  async waitForDashboard(): Promise<void> {
    await this.page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 15000 });
  }

  /**
   * Complete 2FA: fill verification code and submit → dashboard.
   * Set VERIFICATION_CODE in .env (paste the 6-digit code from your email before running).
   */
  async complete2FAAndWaitForDashboard(options?: {
    getCode?: () => Promise<string>;
    code?: string;
  }): Promise<void> {
    await this.waitForFactorTwoPage();

    const code = options?.getCode
      ? await options.getCode()
      : (options?.code ?? process.env.VERIFICATION_CODE?.trim());
    if (!code) {
      throw new Error('Set VERIFICATION_CODE in .env to the 6-digit code from your email.');
    }

    await this.fillVerificationCode(code);
    await this.waitForDashboard();
  }
}
