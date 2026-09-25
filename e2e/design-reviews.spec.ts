import { expect, test, type Page } from "@playwright/test";
import { createTestProject, deleteProjectByReference, uniqueE2eReference } from "./helpers";

const STEP = "Concept Design & Client Presentations";

async function openStep(page: Page, step = STEP) {
  await page.getByRole("button", { name: "Checklist" }).click();
  await page.getByPlaceholder("Search checklist…").fill(step);
  await expect(page.getByRole("heading", { name: step }).first()).toBeVisible();
}

function rowLabels(page: Page) {
  return page.locator(".design-review-label").allTextContents();
}

test.describe("Dated design logs", () => {
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
    await expect(page.locator(".design-review-round .design-review-gap")).toHaveText("+2 wks");

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

  test("the DD and tender set steps each run their own log with their own labels", async ({ page }) => {
    await openStep(page, "Design Development & Client Sign-off");
    const dev = page.locator("#step-admin__DEV");
    await dev.getByLabel("DD Set Issued to Client date").fill("2026-06-01");
    await expect(dev.getByLabel("DD Set Issued to Client date")).toHaveValue("2026-06-01");
    await dev.getByRole("button", { name: "+ Add review meeting" }).click();
    await expect(dev.getByLabel("First Review Meeting date")).toBeVisible();
    await dev.getByLabel("First Review Meeting date").fill("2026-06-15");
    await dev.getByLabel("Design Frozen / Signed Off date").fill("2026-06-29");
    await expect(dev.locator(".design-review-summary")).toHaveText(
      "1 review meeting · 4 wks from DD set issued to design freeze"
    );

    await openStep(page, "Tender Drawing Set & Documents");
    const tender = page.locator("#step-admin__TENDERSET");
    expect(await tender.locator(".design-review-label").allTextContents()).toEqual([
      "Tender Set Issued for Coordination",
      "Tender Set Issued",
    ]);
    await expect(tender.getByRole("button", { name: "+ Add coordination round" })).toBeVisible();
    await expect(tender.locator(".design-review-summary")).toHaveText("0 coordination rounds");
  });

  test("the tender calling step logs addenda and counts them with the right plural", async ({ page }) => {
    await openStep(page, "Tender Calling & Evaluation");
    const step = page.locator("#step-admin__TENDER");
    await step.getByLabel("Tender Called date").fill("2026-08-03");
    await expect(step.getByLabel("Tender Called date")).toHaveValue("2026-08-03");
    const add = step.getByRole("button", { name: "+ Add tender addendum" });
    await add.click();
    await expect(step.getByLabel("First Tender Addendum date")).toBeVisible();
    await add.click();
    await expect(step.getByLabel("Second Tender Addendum date")).toBeVisible();
    await step.getByLabel("Tender Recommendation Approved date").fill("2026-09-14");
    await expect(step.locator(".design-review-summary")).toHaveText(
      "2 tender addenda · 6 wks from tender called to recommendation approved"
    );
  });
});
