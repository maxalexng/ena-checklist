import { expect, test } from "@playwright/test";
import { createTestProject, deleteProjectByReference, login, uniqueE2eReference } from "./helpers";

test.describe("Roles panel", () => {
  let reference: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("roles");
    const project = await createTestProject({ reference, title: "Roles Test Project" });
    await login(page);
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Roles", exact: true }).click();
    await expect(page.locator(".roles-panel")).toBeVisible();
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("shows the 11 default office roles, Architect first", async ({ page }) => {
    await expect(page.locator(".role-row")).toHaveCount(11);
    await expect(page.locator(".role-row").first().locator(".role-name-input")).toHaveValue("Architect");
  });

  test("renaming a role persists across reload", async ({ page }) => {
    const architectRow = page.locator(".role-row").first();
    await architectRow.locator(".role-name-input").fill("Architect (QP)");
    await architectRow.locator(".role-name-input").blur();

    await page.reload();
    await page.getByRole("button", { name: "Roles", exact: true }).click();
    await expect(page.locator(".role-row").first().locator(".role-name-input")).toHaveValue("Architect (QP)");
  });

  test("a rename shows up in the checklist's responsible-party dropdown", async ({ page }) => {
    const architectRow = page.locator(".role-row").first();
    await architectRow.locator(".role-name-input").fill("Architect (QP)");
    await architectRow.locator(".role-name-input").blur();

    await page.getByRole("button", { name: "Roles", exact: true }).click(); // close the panel
    await page.getByRole("button", { name: "Checklist" }).click();
    await page.getByRole("button", { name: "+ Assign" }).first().click();
    await expect(page.getByRole("combobox").getByRole("option", { name: "Architect (QP)" })).toHaveCount(1);
  });

  test("cycling a role's color changes its swatch", async ({ page }) => {
    const firstSwatch = page.locator(".role-swatch").first();
    const before = await firstSwatch.evaluate((el) => getComputedStyle(el).backgroundColor);
    await firstSwatch.click();
    // toHaveCSS auto-retries until the mutation's refetch lands, unlike a one-shot evaluate().
    await expect(firstSwatch).not.toHaveCSS("background-color", before);
  });

  test("adding a new role appends it to the list", async ({ page }) => {
    await page.locator(".roles-add-row input").fill("Landscape Architect");
    await page.locator(".roles-add-row").getByRole("button", { name: "+ Add" }).click();

    await expect(page.locator(".role-row")).toHaveCount(12);
    await expect(page.locator(".role-row").last().locator(".role-name-input")).toHaveValue(
      "Landscape Architect"
    );
  });
});
