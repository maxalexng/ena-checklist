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

  test("every step card shows which stage it's in", async ({ page }) => {
    await page.getByPlaceholder("Search checklist…").fill("Client's contact particulars");
    const stepCard = page.locator(".agency").filter({ hasText: "Practice Administration" }).first();
    await expect(stepCard.locator(".stage-tag")).toHaveText("Pre-Design");

    await page.getByPlaceholder("Search checklist…").fill("Concept site plan / masterplan layout");
    const outlinePermissionCard = page.locator(".agency").filter({ hasText: "Outline Permission" }).first();
    await expect(outlinePermissionCard.locator(".stage-tag")).toHaveText("Concept Design");
  });

  test("Consultant Appointments has its own clearable item alongside the roster", async ({ page }) => {
    await page.getByPlaceholder("Search checklist…").fill("Consultant Appointments");
    const stepCard = page.locator(".agency").filter({ hasText: "Consultant Appointments" }).first();

    // The roster widget is still there...
    await expect(stepCard.getByText("No consultants appointed yet.")).toBeVisible();
    // ...and now there's also a real, clearable checklist item and progress bar, where
    // before this step contributed nothing to the project's overall completion count.
    const item = stepCard.locator(".item").filter({ hasText: "All required consultants appointed" });
    await expect(item).toBeVisible();
    const statusBtn = item.locator(".status-chip");
    await expect(statusBtn).toHaveText("Not started");
    // Each click reads the current status from a prop, not a readback — firing the next
    // click before the mutation's refetch lands would just repeat the same transition
    // instead of advancing, so wait for each step before clicking again.
    await statusBtn.click();
    await expect(statusBtn).toHaveText("In progress");
    await statusBtn.click();
    await expect(statusBtn).toHaveText("Submitted");
    await statusBtn.click();
    await expect(statusBtn).toHaveText("Cleared");
    await expect(stepCard.locator(".agency-progress-label")).toHaveText("1/1");
  });

  test("a conditional submission (Plan Lodgement) is tagged 'If applicable'", async ({ page }) => {
    await page.getByPlaceholder("Search checklist…").fill("PL checklist and application via CORENET");
    const submissionHead = page.locator(".submission-head").filter({ hasText: "Plan Lodgement" });
    await expect(submissionHead.getByText("If applicable")).toBeVisible();
  });

  test("Asbestos Survey & Removal sits first in the Construction stage and is conditional", async ({
    page,
  }) => {
    // Not hasText: "Construction" — "TOP Preparation & Post-Construction" (Stage 7) also
    // contains that substring. "Stage 6" is unambiguous.
    const constructionGroup = page
      .locator(".stage")
      .filter({ has: page.locator(".stage-label", { hasText: "Stage 6" }) });
    const firstStepInConstruction = constructionGroup.locator(".agency").first();
    await expect(firstStepInConstruction).toContainText("Asbestos Survey & Removal");

    const submissionHead = firstStepInConstruction.locator(".submission-head");
    await expect(submissionHead.getByText("If applicable")).toBeVisible();
  });
});
