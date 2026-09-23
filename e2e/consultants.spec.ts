import { expect, test } from "@playwright/test";
import { createTestProject, deleteProjectByReference, login, uniqueE2eReference } from "./helpers";

test.describe("Consultants widget", () => {
  let reference: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("consultants");
    const project = await createTestProject({ reference, title: "Consultants Test Project" });
    await login(page);
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Checklist" }).click();
    // Narrows the (large) checklist tree down to just the Consultant Appointments step.
    await page.getByPlaceholder("Search checklist…").fill("Consultant Appointments");
    await expect(page.getByRole("heading", { name: "Consultant Appointments" })).toBeVisible();
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("starts with no consultants appointed", async ({ page }) => {
    await expect(page.getByText("No consultants appointed yet.")).toBeVisible();
  });

  test("adding a consultant with company, role, and date persists across reload", async ({ page }) => {
    await page.getByRole("button", { name: "+ Add consultant" }).click();

    const row = page.locator(".item").filter({ has: page.locator(".consultant-role-select") });
    await row.getByPlaceholder("Company").fill("Edmund Ng Architects Pte Ltd");
    await row.getByPlaceholder("Company").blur();
    await row.locator(".consultant-role-select").selectOption({ label: "Architect" });
    await row.locator("input[type=date]").fill("2023-04-14");

    await page.reload();
    await page.getByRole("button", { name: "Checklist" }).click();
    await page.getByPlaceholder("Search checklist…").fill("Consultant Appointments");

    const reloadedRow = page.locator(".item").filter({ has: page.locator(".consultant-role-select") });
    await expect(reloadedRow.getByPlaceholder("Company")).toHaveValue("Edmund Ng Architects Pte Ltd");
    const selectedRoleText = await reloadedRow
      .locator(".consultant-role-select")
      .evaluate((el: HTMLSelectElement) => el.selectedOptions[0]?.textContent);
    expect(selectedRoleText).toBe("Architect");
    await expect(reloadedRow.locator("input[type=date]")).toHaveValue("2023-04-14");
  });

  test("removing a consultant deletes the row", async ({ page }) => {
    await page.getByRole("button", { name: "+ Add consultant" }).click();
    await expect(page.locator(".item").filter({ has: page.locator(".consultant-role-select") })).toHaveCount(1);

    await page.locator(".item").filter({ has: page.locator(".consultant-role-select") }).locator(".ov-del").click();

    await expect(page.locator(".item").filter({ has: page.locator(".consultant-role-select") })).toHaveCount(0);
    await expect(page.getByText("No consultants appointed yet.")).toBeVisible();
  });
});
