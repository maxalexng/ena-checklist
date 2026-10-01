import { test as setup } from "@playwright/test";
import { AUTH_STATE_PATH, E2E_SHARED_SETTINGS_ID, SHARED_SETTINGS_COOKIE, login } from "./helpers";

// Runs once before the rest of the suite (the "setup" project in playwright.config.ts):
// sign in through the form, then save the session cookies for every other spec to start
// from, so a full run makes one sign-in rather than one per test. The saved session also
// carries the cookie that points the app at the tests' own shared step order.
setup("sign in", async ({ page, baseURL }) => {
  await login(page);
  await page.context().addCookies([{ name: SHARED_SETTINGS_COOKIE, value: E2E_SHARED_SETTINGS_ID, url: baseURL! }]);
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
