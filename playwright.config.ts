import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "fs";

// No dotenv dependency — same tiny .env.local parser used by the local-only scripts/*.ts
// files. Next.js's own dev server loads .env.local itself; this just makes the same vars
// (PLAYWRIGHT_TEST_EMAIL/PASSWORD, etc.) visible to the Playwright test process too.
if (existsSync(".env.local")) {
  const envText = readFileSync(".env.local", "utf-8");
  for (const line of envText.split("\n")) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
