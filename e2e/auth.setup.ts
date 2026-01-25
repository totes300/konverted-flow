import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

/**
 * Authentication setup for Playwright tests.
 *
 * IMPORTANT: Before running tests, you need to:
 * 1. Set CLERK_TEST_EMAIL and CLERK_TEST_PASSWORD environment variables
 * 2. Or manually authenticate and save the storage state
 *
 * For development/testing, you can:
 * - Use Clerk's development mode which allows test credentials
 * - Or run tests against a test environment with seeded data
 */
setup("authenticate", async ({ page }) => {
  // Check if we have test credentials
  const email = process.env.CLERK_TEST_EMAIL;
  const password = process.env.CLERK_TEST_PASSWORD;

  if (!email || !password) {
    console.log(
      "⚠️  CLERK_TEST_EMAIL and CLERK_TEST_PASSWORD not set. " +
        "Running tests in unauthenticated mode or using existing session."
    );
    // Save empty storage state for tests that need to handle auth themselves
    await page.context().storageState({ path: authFile });
    return;
  }

  // Navigate to sign-in page
  await page.goto("/sign-in");

  // Wait for Clerk's sign-in form to load
  await page.waitForSelector('input[name="identifier"]', { timeout: 10000 });

  // Fill in credentials
  await page.fill('input[name="identifier"]', email);
  await page.click('button:has-text("Continue")');

  // Wait for password field and fill it
  await page.waitForSelector('input[name="password"]', { timeout: 10000 });
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Continue")');

  // Wait for redirect to dashboard/tasks
  await page.waitForURL(/\/(tasks|dashboard)/, { timeout: 30000 });

  // Verify we're authenticated
  await expect(page).not.toHaveURL(/sign-in/);

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
