import { expect, test, type Page } from "@playwright/test";
import { createTestProject, deleteProjectByReference, uniqueE2eReference } from "./helpers";

const STEP = "Concept Design & Client Presentations";

async function openStep(page: Page) {
  await page.getByRole("button", { name: "Checklist" }).click();
  await page.getByPlaceholder("Search checklist…").fill(STEP);
  await expect(page.getByRole("heading", { name: STEP }).first()).toBeVisible();
}

function rowLabels(page: Page) {
  return page.locator(".design-review-label").allTextContents();
}

test.describe("Concept Design presentation log", () => {
  let reference: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("design-reviews");
    const project = await createTestProject({ reference, title: "Design Reviews Test Project" });
    await page.goto(`/projects/${project.id}`);
    await openStep(page);
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("starts with just the initial and confirm rows", async ({ page }) => {
    expect(await rowLabels(page)).toEqual(["Produce Initial Concept Design", "Revise and Confirm Design"]);
    await expect(page.locator(".design-review-summary")).toHaveText("0 presentations");
  });

  test("logs presentations between the fixed rows, with gaps and a total, persisting across reload", async ({
    page,
  }) => {
    await page.getByLabel("Produce Initial Concept Design date").fill("2026-03-02");
    await expect(page.getByLabel("Produce Initial Concept Design date")).toHaveValue("2026-03-02");

    const add = page.getByRole("button", { name: "+ Add presentation" });
    await add.click();
    await expect(page.getByLabel("First Presentation date")).toBeVisible();
    await page.getByLabel("First Presentation date").fill("2026-03-16");
    await expect(page.locator(".design-review-presentation .design-review-gap")).toHaveText("+2 wks");

    await add.click();
    await expect(page.getByLabel("Second Presentation date")).toBeVisible();
    await page.getByLabel("Second Presentation date").fill("2026-04-06");

    await page.getByLabel("Revise and Confirm Design date").fill("2026-04-20");
    await expect(page.locator(".design-review-summary")).toHaveText(
      "2 presentations · 7 wks from initial design to confirmation"
    );

    await page.reload();
    await openStep(page);
    expect(await rowLabels(page)).toEqual([
      "Produce Initial Concept Design",
      "First Presentation",
      "Second Presentation",
      "Revise and Confirm Design",
    ]);
    await expect(page.getByLabel("Second Presentation date")).toHaveValue("2026-04-06");
    await expect(page.locator(".design-review-gap")).toHaveText(["+2 wks", "+3 wks", "+2 wks"]);
  });

  test("removing a presentation renumbers the rest", async ({ page }) => {
    const add = page.getByRole("button", { name: "+ Add presentation" });
    await add.click();
    await expect(page.getByLabel("First Presentation date")).toBeVisible();
    await page.getByLabel("First Presentation date").fill("2026-05-01");
    await add.click();
    await expect(page.getByLabel("Second Presentation date")).toBeVisible();
    await page.getByLabel("Second Presentation date").fill("2026-05-15");

    await page.getByRole("button", { name: "Remove First Presentation" }).click();

    await expect(page.locator(".design-review-label")).toHaveCount(3);
    await expect(page.getByLabel("First Presentation date")).toHaveValue("2026-05-15");
    await expect(page.locator(".design-review-summary")).toHaveText("1 presentation");
  });

  test("locking the project disables the log", async ({ page }) => {
    await page.getByRole("button", { name: "+ Add presentation" }).click();
    await expect(page.getByLabel("First Presentation date")).toBeVisible();

    await page.getByRole("button", { name: "🔓 Unlocked" }).click();
    await expect(page.getByRole("button", { name: "🔒 Locked" })).toBeVisible();

    await expect(page.getByRole("button", { name: "+ Add presentation" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Remove First Presentation" })).toHaveCount(0);
    await expect(page.getByLabel("First Presentation date")).toBeDisabled();
    await expect(page.getByLabel("Produce Initial Concept Design date")).toBeDisabled();
  });
});
