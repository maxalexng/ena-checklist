import { expect, test } from "@playwright/test";
import { createTestProject, deleteProjectByReference, uniqueE2eReference } from "./helpers";

test.describe("Checklist search highlighting", () => {
  let reference: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("highlight");
    const project = await createTestProject({ reference, title: "Search Highlight Test Project" });
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Checklist" }).click();
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("matched words are wrapped in a highlight bubble, and cleared when the search is", async ({ page }) => {
    const search = page.getByPlaceholder("Search checklist…");
    await search.fill("topographic");

    const item = page.locator(".item").filter({ hasText: "Topographic survey" }).first();
    // Case-insensitive match, but the original casing is what's shown in the bubble.
    await expect(item.locator(".item-text mark.search-hit").first()).toHaveText("Topographic");
    // The bubble only wraps the match, so the item still reads as its full text.
    await expect(item.locator(".item-text")).toContainText("Topographic survey");

    await search.fill("");
    await expect(page.locator("mark.search-hit")).toHaveCount(0);
  });

  test("collapsed steps open while searching and go back to collapsed when the search is cleared", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Collapse all" }).click();
    const step = page.locator(".agency").filter({ hasText: "Topographic survey" }).first();
    await expect(step).toHaveClass(/collapsed/);

    const search = page.getByPlaceholder("Search checklist…");
    await search.fill("topographic");
    await expect(step).not.toHaveClass(/collapsed/);
    await expect(step.locator(".item-text mark.search-hit").first()).toBeVisible();

    // A step can still be collapsed by hand mid-search...
    await step.locator(".agency-head").click();
    await expect(step).toHaveClass(/collapsed/);
    // ...and changing the search opens matches again.
    await search.fill("topographic survey");
    await expect(step).not.toHaveClass(/collapsed/);

    await search.fill("");
    await expect(step).toHaveClass(/collapsed/);
  });
});
