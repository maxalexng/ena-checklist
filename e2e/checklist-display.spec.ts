import { expect, test } from "@playwright/test";
import { createTestProject, deleteProjectByReference, login, uniqueE2eReference } from "./helpers";

test.describe("Checklist item labels and conditional badges", () => {
  let reference: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("display");
    const project = await createTestProject({ reference, title: "Display Test Project" });
    await login(page);
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Checklist" }).click();
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("item labels combine the step number with a letter (1a, 1b, ...) instead of a decimal", async ({
    page,
  }) => {
    // Step 4 (Site Investigation & Utility Plans) has 6 items, all in one step — enough to
    // see the letter sequence advance past the first entry.
    await page.getByPlaceholder("Search checklist…").fill("Topographic survey");
    const labels = page.locator(".item-label");
    await expect(labels.first()).toHaveText("4a.");
    await expect(page.locator(".item-label", { hasText: "4b." })).toBeVisible();
  });

  test("a conditional submission (Outline Permission) is tagged 'If applicable'", async ({ page }) => {
    // The search index covers step name/blurb/items, not the submission's own name — search
    // by its first item's text instead to land on the Outline Permission (OP) step.
    await page.getByPlaceholder("Search checklist…").fill("Concept site plan / masterplan layout");
    const submissionHead = page.locator(".submission-head").filter({ hasText: "Outline Permission" });
    await expect(submissionHead.getByText("If applicable")).toBeVisible();
  });

  test("a non-conditional submission (CORENET team registration) has no 'If applicable' tag", async ({
    page,
  }) => {
    await page.getByPlaceholder("Search checklist…").fill("CORENET — Project Team Registration");
    const submissionHead = page.locator(".submission-head").filter({ hasText: "CORENET" }).first();
    await expect(submissionHead.getByText("If applicable")).toHaveCount(0);
  });
});
