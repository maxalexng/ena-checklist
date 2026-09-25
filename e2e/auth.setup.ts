import { test as setup } from "@playwright/test";
import { AUTH_STATE_PATH, login } from "./helpers";

// Runs once before the rest of the suite (the "setup" project in playwright.config.ts):
// sign in through the form, then save the session cookies for every other spec to start
// from, so a full run makes one sign-in rather than one per test.
setup("sign in", async ({ page }) => {
  await login(page);
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
