# Cloud Couture Brand – E2E Tests

Playwright E2E tests for Cloud Couture. Uses saved auth state so you only log in once.

## First-time setup: save login session

1. Set in `.env`:
   - `BASE_URL` – app URL (e.g. `https://dev-frontend-sup.cloudcouture.co`)
   - `LOGIN_EMAIL` – your login email
   - `LOGIN_PASSWORD` – your password
   - `VERIFICATION_CODE` – e.g. `424242` for Clerk dev, or the code from your email

2. Run the save-auth test once to sign in and store the browser session:

   ```bash
   npm run test:save-auth
   ```

   This signs in (email + password + verification code) and writes the session to **`playwright-auth-state.json`**. Later tests reuse this file and skip login.

## Run product creation tests

After the session is saved, run the product-creation tests:

```bash
 npm run test:product-creation
```

These use the stored session from `playwright-auth-state.json`, so you don’t need to log in again.

## Other commands

- **All tests:** `npm test`
- **Product creation (debug):** `npm run test:product-creation:debug`

## Notes

- Re-run `npm run test:save-auth` if the session expires or you change accounts.
- `playwright-auth-state.json` holds cookies and storage; keep it out of version control if it contains sensitive data (it’s in `.gitignore` by default).
