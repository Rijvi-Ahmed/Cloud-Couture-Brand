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

  /** Go to My Listing from dashboard */
  async goToMyListing(): Promise<void> {
    await this.page.getByRole('link', { name: 'My Listing' }).click();
  }

  /** Open Add product section */
  async openAddProduct(): Promise<void> {
    await this.page.getByRole('button', { name: '+ Add product' }).click();
  }

  /** Select Product from dropdown */
  async selectProductFromDropdown(): Promise<void> {
    await this.page.getByRole('menuitem', { name: 'Product' }).click();
  }

  /** Fill Item name */
  async fillItemName(itemName: string = 'Classic Linen Summer Shirt'): Promise<void> {
    const input = this.page.getByRole('textbox', { name: 'Item name (Required)' });
    await input.click();
    await input.fill(itemName);
  }

  /** Verify Type is Product (disabled) */
  async verifyTypeIsProduct(): Promise<void> {
    await this.page.getByRole('combobox').filter({ hasText: /^Product$/ }).click();
  }

  /** Select or add product type from dropdown */
  async selectProductCategory(category: string = 'T-Shirt'): Promise<void> {
    await this.page.getByRole('combobox').filter({ hasText: 'Select or add category' }).click();
    await this.page.getByRole('button', { name: category }).click();
  }

  /** Select status */
  async selectStatus(status: string = 'Active'): Promise<void> {
    await this.page.getByRole('combobox').filter({ hasText: 'Draft' }).click();
    await this.page.getByRole('option', { name: status, exact: true }).click();
  }

  /** Add tags */
  async addTags(tags: string = 'Dress'): Promise<void> {
    const input = this.page.getByRole('textbox', { name: 'Tags (Optional)' });
    await input.click();
    await input.fill(tags);
  }

  /** Upload image */
  async uploadImage(filePath: string = 'bao-bao-GREEBEtyR9Y-unsplash.jpg'): Promise<void> {
    await this.page.locator('div').filter({ hasText: 'Click to upload or drag and' }).nth(1).setInputFiles(filePath);
    await this.page.getByRole('button', { name: 'Save & Upload' }).click();
  }

  /** Add short description */
  async addShortDescription(text: string = 'Test'): Promise<void> {
    await this.page.getByText('Item short description (').click();
    await this.page.locator('.ql-editor').first().click();
    await this.page.keyboard.type(text);
  }

  /** Add long description */
  async addLongDescription(text: string = 'Test'): Promise<void> {
    await this.page.getByText('Item long description (').click();
    const longEditor = this.page.locator('.ql-editor').nth(1);
    await longEditor.click();
    await this.page.keyboard.type(text);
  }

  /** Add Material */
  async addMaterial(material: string = 'Cotton'): Promise<void> {
    const input = this.page.getByRole('textbox', { name: 'Material (Optional)' });
    await input.click();
    await input.fill(material);
  }

  /** Add Material weight */
  async addMaterialWeight(weight: string = '200gm'): Promise<void> {
    const input = this.page.getByRole('textbox', { name: 'Material weight (Optional)' });
    await input.click();
    await input.fill(weight);
  }

  /** Add Fit */
  async addFit(fit: string = 'Semi Fit'): Promise<void> {
    const input = this.page.getByRole('textbox', { name: 'Fit (Optional)' });
    await input.click();
    await input.fill(fit);
  }

  /** Add Care instruction */
  async addCareInstruction(instruction: string = 'Test'): Promise<void> {
    const input = this.page.getByRole('textbox', { name: 'Care instruction (Optional)' });
    await input.click();
    await input.fill(instruction);
  }

  /** Add colors */
  async addColors(colors: [string, string] = ['Black', 'white']): Promise<void> {
    await this.page.getByRole('textbox', { name: 'Colors (Optional)' }).click();
    await this.page.getByRole('button', { name: 'Add more' }).click();
    await this.page.getByRole('textbox', { name: 'Enter option' }).click();
    await this.page.getByRole('textbox', { name: 'Enter option' }).fill(colors[0]);
    await this.page.getByRole('button', { name: 'Add more' }).click();
    await this.page.getByRole('textbox', { name: 'Enter option' }).nth(1).click();
    await this.page.getByRole('textbox', { name: 'Enter option' }).nth(1).fill(colors[1]);
  }

  /** Add sample price */
  async addSamplePrice(price: string = '100'): Promise<void> {
    const input = this.page.getByRole('spinbutton', { name: 'Sample price' });
    await input.click();
    await input.fill(price);
  }

  /** Add sample MOQ */
  async addSampleMOQ(moq: string = '1'): Promise<void> {
    const input = this.page.getByRole('spinbutton', { name: 'Sample MOQ' });
    await input.click();
    await input.fill(moq);
  }

  /** Add sample delivery time */
  async addSampleDeliveryTime(days: string = '2'): Promise<void> {
    const input = this.page.getByRole('spinbutton', { name: 'Sample delivery time' });
    await input.click();
    await input.fill(days);
  }

  /** Add production pricing */
  async addProductionPricing(perUnitCost: string = '100', productionMOQ: string = '1'): Promise<void> {
    await this.page.getByRole('heading', { name: 'Production pricing' }).click();
    await this.page.getByRole('button', { name: 'Add production price tier' }).click();
    const costInput = this.page.getByRole('textbox', { name: 'Enter per unit cost' });
    await costInput.click();
    await costInput.fill(perUnitCost);
    const moqInput = this.page.getByRole('textbox', { name: 'Enter production MOQ' });
    await moqInput.click();
    await moqInput.fill(productionMOQ);
  }

  /** Add production delivery time */
  async addProductionDeliveryTime(days: string = '5'): Promise<void> {
    const input = this.page.getByRole('spinbutton', { name: 'Production delivery time (' });
    await input.click();
    await input.fill(days);
  }

  /** Add additional notes */
  async addAdditionalNotes(notes: string = 'test'): Promise<void> {
    await this.page.getByText('Additional notes').click();
    const input = this.page.getByRole('textbox', { name: 'Additional notes' });
    await input.click();
    await input.fill(notes);
  }

  /** Add variation Size */
  async addVariationSize(sizes: [string, string] = ['M', 'L']): Promise<void> {
    await this.page.getByRole('heading', { name: 'Variations' }).click();
    await this.page.getByRole('button', { name: 'Add variant' }).click();
    await this.page.getByRole('combobox').filter({ hasText: 'Size' }).click();
    await this.page.getByRole('option', { name: 'Size' }).click();
    await this.page.getByRole('textbox', { name: 'Enter option' }).nth(2).click();
    await this.page.getByRole('textbox', { name: 'Enter option' }).nth(2).fill(sizes[0]);
    await this.page.getByRole('button', { name: 'Add more' }).nth(1).click();
    await this.page.getByRole('textbox', { name: 'Enter option' }).nth(3).click();
    await this.page.getByRole('textbox', { name: 'Enter option' }).nth(3).fill(sizes[1]);
  }

  /** Add variation Type */
  async addVariationType(): Promise<void> {
    await this.page.getByRole('button', { name: 'Add variant' }).click();
    await this.page.getByRole('combobox').filter({ hasText: 'Size' }).nth(1).click();
    await this.page.getByRole('option', { name: 'Type' }).click();
    await this.page.getByRole('combobox').filter({ hasText: 'Select option' }).click();
    await this.page.getByRole('option', { name: 'Exclusive', exact: true }).click();
    await this.page.getByRole('button', { name: 'Add more' }).nth(2).click();
    await this.page.getByRole('combobox').filter({ hasText: 'Select option' }).click();
    await this.page.getByRole('option', { name: 'Not-exclusive' }).click();
  }

  /** Add variation Duration */
  async addVariationDuration(duration: string = '2 year'): Promise<void> {
    await this.page.getByRole('button', { name: 'Add variant' }).click();
    await this.page.getByRole('combobox').filter({ hasText: 'Size' }).nth(1).click();
    await this.page.getByRole('option', { name: 'Duration' }).click();
    await this.page.getByRole('combobox').filter({ hasText: 'Select option' }).click();
    await this.page.getByRole('option', { name: duration }).click();
  }

  /** Add SKU number */
  async addSkuNumber(sku: string = 'SHRT-LIN-180-WHT-002'): Promise<void> {
    await this.page.getByText('SKU number').click();
    const input = this.page.getByRole('textbox', { name: 'SKU number' });
    await input.click();
    await input.fill(sku);
  }

  /** Click Save */
  async clickSave(): Promise<void> {
    await this.page.getByRole('button', { name: 'Save' }).click();
  }
}
