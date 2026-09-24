import { expect, test } from "@playwright/test";
import { createTestProject, deleteProjectByReference, login, uniqueE2eReference } from "./helpers";

test.describe("Reordering items within a step", () => {
  let reference: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("itemorder");
    const project = await createTestProject({ reference, title: "Item Order Test Project" });
    await login(page);
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Checklist" }).click();
    // Site Investigation & Utility Plans (PREINV) has 6 items — enough room to reorder.
    await page.getByPlaceholder("Search checklist…").fill("Topographic survey");
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("moving an item down swaps it with its next neighbor and persists across reload", async ({ page }) => {
    const items = page.locator(".item");
    const firstBefore = await items.nth(0).locator(".item-text").textContent();
    const secondBefore = await items.nth(1).locator(".item-text").textContent();

    await items.nth(0).locator(".item-move-btn").nth(1).click(); // ▼

    await expect(items.nth(0).locator(".item-text")).toHaveText(secondBefore!);
    await expect(items.nth(1).locator(".item-text")).toHaveText(firstBefore!);
    // The label swaps along with the item, so it still reads "4a." for whichever item is
    // now first, not a stale label stuck to the old position.
    await expect(items.nth(0).locator(".item-label")).toHaveText("4a.");
    await expect(items.nth(1).locator(".item-label")).toHaveText("4b.");

    await page.reload();
    await page.getByRole("button", { name: "Checklist" }).click();
    await page.getByPlaceholder("Search checklist…").fill("Topographic survey");
    const reloadedItems = page.locator(".item");
    await expect(reloadedItems.nth(0).locator(".item-text")).toHaveText(secondBefore!);
    await expect(reloadedItems.nth(1).locator(".item-text")).toHaveText(firstBefore!);
  });

  test("the first item in a step can't move up, and the last can't move down", async ({ page }) => {
    const items = page.locator(".item");
    await expect(items.first().locator(".item-move-btn").nth(0)).toBeDisabled(); // ▲
    await expect(items.last().locator(".item-move-btn").nth(1)).toBeDisabled(); // ▼
  });

  test("locking the project hides item move buttons entirely", async ({ page }) => {
    const firstItem = page.locator(".item").nth(1);
    await expect(firstItem.locator(".item-move-btn")).toHaveCount(2);

    await page.getByRole("button", { name: "🔓 Unlocked" }).click();
    await expect(page.getByRole("button", { name: "🔒 Locked" })).toBeVisible();

    await expect(firstItem.locator(".item-move-btn")).toHaveCount(0);

    await page.getByRole("button", { name: "🔒 Locked" }).click();
    await expect(firstItem.locator(".item-move-btn")).toHaveCount(2);
  });
});
