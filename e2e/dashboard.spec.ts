import { expect, test } from "@playwright/test";
import { createTestProject, deleteProjectByReference, uniqueE2eReference } from "./helpers";

test.describe("Dashboard project list", () => {
  let reference: string;

  test.afterEach(async () => {
    if (reference) await deleteProjectByReference(reference);
  });

  test("leads each project with its address, with the title in grey under it", async ({ page }) => {
    reference = uniqueE2eReference("dashboard");
    await createTestProject({ reference, title: "Dashboard Card Title", address: "99 Dashboard Card Road" });

    await page.goto("/");
    const card = page.locator("a.agency", { hasText: reference });
    await expect(card.locator("h3")).toHaveText("99 Dashboard Card Road");
    await expect(card.locator("p")).toHaveText("Dashboard Card Title");
  });

  test("falls back to the title when a project has no address", async ({ page }) => {
    reference = uniqueE2eReference("dashboard");
    await createTestProject({ reference, title: "Dashboard No Address" });

    await page.goto("/");
    const card = page.locator("a.agency", { hasText: reference });
    await expect(card.locator("h3")).toHaveText("Dashboard No Address");
    await expect(card.locator("p")).toHaveCount(0);
  });
});
