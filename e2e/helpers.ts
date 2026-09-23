import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export async function login(page: Page) {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL;
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "PLAYWRIGHT_TEST_EMAIL / PLAYWRIGHT_TEST_PASSWORD are not set — see .env.local.example."
    );
  }
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}

/** Admin client for e2e-only cleanup (deleting throwaway test projects after a run) —
 * never used by the app itself, only by tests, and only with the service-role key that's
 * already local-only per .env.local's own comments. */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set for e2e cleanup.");
  }
  return createClient(url, key);
}

export function uniqueE2eReference(label: string) {
  return `E2E-${label}-${Date.now()}`;
}

export async function deleteProjectByReference(reference: string) {
  const supabase = adminClient();
  await supabase.from("projects").delete().eq("reference", reference);
}
