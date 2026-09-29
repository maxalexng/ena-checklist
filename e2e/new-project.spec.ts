import { expect, test, type Page } from "@playwright/test";
import { adminClient, deleteProjectByReference, uniqueE2eReference } from "./helpers";

async function projectIds(reference: string) {
  const { data, error } = await adminClient().from("projects").select("id").eq("reference", reference);
  if (error) throw error;
  return (data ?? []).map((p) => p.id);
}

async function submitNewProject(page: Page, reference: string, title: string) {
  await page.goto("/new");
  await page.getByLabel("Reference *").fill(reference);
  await page.getByLabel("Title").fill(title);
  await page.getByRole("button", { name: "Create project" }).click();
}

test.describe("New Project form doesn't create duplicates", () => {
  let reference: string;

  test.beforeEach(() => {
    reference = uniqueE2eReference("newproj");
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("the button disables itself while the project is being created", async ({ page }) => {
    await page.goto("/new");
    await page.getByLabel("Reference *").fill(reference);
    await page.getByLabel("Title").fill("Duplicate Guard Project");
    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByRole("button", { name: "Creating project…" })).toBeDisabled();
    await page.waitForURL(/\/projects\//);
    expect(await projectIds(reference)).toHaveLength(1);
  });

  test("submitting the same form again opens the project just created instead of a copy", async ({ page }) => {
    await submitNewProject(page, reference, "Duplicate Guard Project");
    await page.waitForURL(/\/projects\//);
    const firstUrl = page.url();

    await submitNewProject(page, reference, "Duplicate Guard Project");
    await page.waitForURL(/\/projects\//);

    expect(page.url()).toBe(firstUrl);
    expect(await projectIds(reference)).toHaveLength(1);
  });

  test("a different title under the same reference is still a separate project", async ({ page }) => {
    await submitNewProject(page, reference, "Duplicate Guard Project A");
    await page.waitForURL(/\/projects\//);
    await submitNewProject(page, reference, "Duplicate Guard Project B");
    await page.waitForURL(/\/projects\//);

    expect(await projectIds(reference)).toHaveLength(2);
  });
});
