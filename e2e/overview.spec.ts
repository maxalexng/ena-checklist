import { expect, test } from "@playwright/test";
import { createTestProject, deleteProjectByReference, login, uniqueE2eReference } from "./helpers";

test.describe("Overview tab", () => {
  let reference: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("overview");
    const project = await createTestProject({ reference, title: "Overview Test Project" });
    await login(page);
    await page.goto(`/projects/${project.id}`);
    await expect(page.getByRole("heading", { name: "Overview Test Project" })).toBeVisible();
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("editing project dates computes the LOA-suggested start and lets you apply it", async ({ page }) => {
    const loaSignedRow = page.locator("label", { hasText: "LOA Signed" });
    await loaSignedRow.locator("input[type=date]").fill("2024-04-09");

    const contractStartRow = page.locator(".ov-row", { hasText: "Actual Contract Start" });
    await expect(contractStartRow.getByText("Suggested: 2024-07-09")).toBeVisible();

    await contractStartRow.getByRole("button", { name: "Use this date →" }).click();
    await expect(contractStartRow.locator("input[type=date]")).toHaveValue("2024-07-09");

    // Persists after a reload.
    await page.reload();
    const reloadedRow = page.locator(".ov-row", { hasText: "Actual Contract Start" });
    await expect(reloadedRow.locator("input[type=date]")).toHaveValue("2024-07-09");
  });

  test("adding an Extension of Time updates the adjusted completion date", async ({ page }) => {
    const completionRow = page.locator(".ov-row", { hasText: "Target Practical Completion" });
    await completionRow.locator("input[type=date]").fill("2026-06-30");

    await page.locator("#eot-add-title").fill("EOT 1 - Adverse Weather");
    await page.locator("#eot-add-days").fill("10");
    await page.getByRole("button", { name: "+ Add EOT" }).click();

    const adjustedRow = page.locator(".ov-row", { hasText: "Adjusted Completion" });
    await expect(adjustedRow.getByText("2026-07-10 (+10 days EOT)")).toBeVisible();
  });

  test("adding a milestone log entry shows up under the right section", async ({ page }) => {
    const uraSection = page.locator(".ov-section").filter({ hasText: "URA — Provisional Permission" });
    await uraSection.locator('[data-field="type"]').fill("PP Submitted");
    await uraSection.locator('[data-field="date"]').fill("2024-03-14");
    await uraSection.getByRole("button", { name: "+ Add" }).click();

    await expect(uraSection.getByText("PP Submitted", { exact: true })).toBeVisible();
    await expect(uraSection.locator(".sl-row")).toHaveCount(1);

    await page.reload();
    const reloadedSection = page.locator(".ov-section").filter({ hasText: "URA — Provisional Permission" });
    await expect(reloadedSection.locator(".sl-row")).toHaveCount(1);
  });

  test("editing the project info bar (title/reference) saves and reflects in the masthead", async ({ page }) => {
    await page.getByLabel("Title").fill("Renamed Project Title");
    await page.getByLabel("Title").blur();

    await expect(page.getByRole("heading", { name: "Renamed Project Title" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Renamed Project Title" })).toBeVisible();
  });
});
