import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'https://dev-frontend-sup.cloudcouture.co';
const authStatePath =
  process.env.AUTH_STORAGE_PATH || path.join(process.cwd(), 'playwright-auth-state.json');
const useSavedAuth = fs.existsSync(authStatePath) ? { storageState: authStatePath } : {};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...useSavedAuth,
  },
  projects: [
    {
      name: 'save-auth',
      testMatch: '**/saveAuthState.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL,
        storageState: undefined,
      },
    },
    {
      name: 'chromium',
      testIgnore: '**/saveAuthState.spec.ts',
      use: { ...devices['Desktop Chrome'], ...useSavedAuth },
    },
    {
      name: 'firefox',
      testIgnore: '**/saveAuthState.spec.ts',
      use: { ...devices['Desktop Firefox'], ...useSavedAuth },
    },
    {
      name: 'webkit',
      testIgnore: '**/saveAuthState.spec.ts',
      use: { ...devices['Desktop Safari'], ...useSavedAuth },
    },
  ],
});
