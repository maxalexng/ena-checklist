import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createProject, type NewProjectInput } from "../src/lib/projects/createProject";

/** Where auth.setup.ts saves the signed-in session that every other spec starts from. */
export const AUTH_STATE_PATH = "playwright/.auth/user.json";

/** Signs in through the real login form. Only auth.setup.ts and the smoke test call this —
 * every other spec reuses the saved session, because signing in once per test (~60 per run)
 * trips Supabase's auth rate limit ("Request rate limit reached") partway through a run. */
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
  // A failed sign-in redirects back to /login?error=… — surface that message right away
  // instead of waiting out the whole test timeout for a navigation that never comes.
  await page.waitForURL((url) => url.pathname === "/" || url.searchParams.has("error"));
  const error = new URL(page.url()).searchParams.get("error");
  if (error) throw new Error(`Sign-in failed: ${error}`);
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

/** Seeds a full project (227 checklist items, 11 default roles and the standard PC sum list)
 * the same way the app's own "New Project" flow does — reuses createProject() directly rather
 * than duplicating its seeding logic, so a future change to that flow can't silently drift
 * out of sync with what these tests set up. Runs with the service-role client, bypassing RLS
 * (there's no logged-in user in this setup step — tests start from the session
 * auth.setup.ts saved). */
export async function createTestProject(input: NewProjectInput) {
  return createProject(adminClient(), input, null);
}

/** The step order is shared by every project (shared_settings, migration 0008) — including
 * the real ones in the same Supabase project these tests run against. Specs that assume the
 * template's default order, or that move steps, save the live order first, reset it to the
 * default, and put the saved one back afterwards. Real users see the default order for the
 * length of those specs. */
export async function saveSharedStepOrder(): Promise<() => Promise<void>> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("shared_settings")
    .select("step_order, step_stage")
    .eq("id", "global")
    .maybeSingle();
  if (error) throw error;
  return async () => {
    const { error: restoreError } = await supabase.from("shared_settings").upsert({
      id: "global",
      step_order: data?.step_order ?? null,
      step_stage: data?.step_stage ?? {},
      updated_at: new Date().toISOString(),
    });
    if (restoreError) throw restoreError;
  };
}

export async function resetSharedStepOrder() {
  const supabase = adminClient();
  const { error } = await supabase
    .from("shared_settings")
    .upsert({ id: "global", step_order: null, step_stage: {}, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function setProjectFields(projectId: string, fields: Record<string, unknown>) {
  const supabase = adminClient();
  const { error } = await supabase.from("projects").update(fields).eq("id", projectId);
  if (error) throw error;
}
