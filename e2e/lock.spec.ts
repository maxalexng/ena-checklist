import { expect, test } from "@playwright/test";
import { createTestProject, deleteProjectByReference, login, uniqueE2eReference } from "./helpers";

test.describe("Lock mechanism", () => {
  let reference: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("lock");
    const project = await createTestProject({ reference, title: "Lock Test Project" });
    await login(page);
    await page.goto(`/projects/${project.id}`);
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("starts unlocked, with project info editable and assign controls visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: "🔓 Unlocked" })).toBeVisible();
    await expect(page.getByLabel("Title")).toBeEnabled();

    await page.getByRole("button", { name: "Checklist" }).click();
    await expect(page.getByRole("button", { name: "+ Assign" }).first()).toBeVisible();
  });

  test("locking disables project info fields and hides assign controls", async ({ page }) => {
    await page.getByRole("button", { name: "🔓 Unlocked" }).click();
    await expect(page.getByRole("button", { name: "🔒 Locked" })).toBeVisible();

    await expect(page.getByLabel("Title")).toBeDisabled();
    await expect(page.getByLabel("Address")).toBeDisabled();
    await expect(page.getByLabel("Reference", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("Current Stage")).toBeDisabled();

    await page.getByRole("button", { name: "Checklist" }).click();
    await expect(page.getByRole("button", { name: "+ Assign" })).toHaveCount(0);

    // The lock button's own label promises "step order can't be edited" while locked.
    await expect(page.locator(".agency").first().locator(".step-move-btn")).toHaveCount(0);
  });

  test("an already-assigned responsible party can't be removed while locked, and reappears when unlocked", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Checklist" }).click();
    await page.getByRole("button", { name: "+ Assign" }).first().click();
    await page.locator(".assign-role-select").first().selectOption({ index: 0 });
    // Not getByRole("button", { name: "Add" }) — that's a substring match, and the rail
    // now has a step named "...Member Addition" that sorts before this button in the DOM.
    await page.locator(".assign-confirm").first().click();
    await expect(page.locator(".assign-chip")).toHaveCount(1);
    await expect(page.locator(".assign-remove")).toHaveCount(1);

    await page.getByRole("button", { name: "🔓 Unlocked" }).click();
    await expect(page.locator(".assign-chip")).toHaveCount(1);
    await expect(page.locator(".assign-remove")).toHaveCount(0);

    await page.getByRole("button", { name: "🔒 Locked" }).click();
    await expect(page.locator(".assign-remove")).toHaveCount(1);
  });

  test("unlocking re-enables project info fields and assign controls", async ({ page }) => {
    await page.getByRole("button", { name: "🔓 Unlocked" }).click();
    await page.getByRole("button", { name: "🔒 Locked" }).click();

    await expect(page.getByLabel("Title")).toBeEnabled();
    await page.getByRole("button", { name: "Checklist" }).click();
    await expect(page.getByRole("button", { name: "+ Assign" }).first()).toBeVisible();
  });
});
