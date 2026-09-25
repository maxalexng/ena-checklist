import { expect, test } from "@playwright/test";
import { adminClient, deleteProjectByReference, login, uniqueE2eReference } from "./helpers";

test.describe("smoke: login, dashboard, project creation", () => {
  // Start signed out (not from the saved session) so the login form itself stays covered.
  test.use({ storageState: { cookies: [], origins: [] } });

  let reference: string;

  test.afterEach(async () => {
    if (reference) await deleteProjectByReference(reference);
  });

  test("logs in, creates a project, and it seeds the full checklist", async ({ page }) => {
    reference = uniqueE2eReference("create");

    await login(page);
    await expect(page.getByRole("heading", { name: "Submissions Register" })).toBeVisible();

    await page.getByRole("link", { name: "+ New Project" }).click();
    await page.getByLabel("Reference *").fill(reference);
    await page.getByLabel("Title").fill("E2E Test Project");
    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByText(reference)).toBeVisible();
    await expect(page.getByText("189", { exact: true })).toBeVisible();
    await expect(page.getByText("NOT STARTED")).toBeVisible();

    const supabase = adminClient();
    const { data: project } = await supabase.from("projects").select("id").eq("reference", reference).single();
    expect(project).not.toBeNull();

    const { count } = await supabase
      .from("checklist_items")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project!.id);
    expect(count).toBe(189);

    const { count: roleCount } = await supabase
      .from("project_roles")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project!.id);
    expect(roleCount).toBe(11);
  });

  test("rejects an unauthenticated request to a project page", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/projects/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/login/);
  });
});
