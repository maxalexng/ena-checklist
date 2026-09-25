import { expect, test } from "@playwright/test";
import { createTestProject, deleteProjectByReference, login, uniqueE2eReference } from "./helpers";

test.describe("Fees tab", () => {
  let reference: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("fees");
    const project = await createTestProject({ reference, title: "Fees Test Project" });
    await login(page);
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Fees" }).click();
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("starts at the spreadsheet's own worked example total for 1 house, 1,000 m² SGFA", async ({ page }) => {
    // Default inputs (1 unit, non-GCBA, PUB Minor, NParks non-TCA) with 1,000 m² SGFA —
    // matches the office spreadsheet's own $13,655 worked total exactly.
    await page.locator('input[type="number"]').first().fill("1000"); // Total SGFA
    await page.locator('input[type="number"]').first().blur();

    await expect(page.getByText("TOTAL AUTHORITY SUBMISSION FEES FOR DEVELOPMENT")).toBeVisible();
    const totalRow = page.locator(".fee-total-row");
    await expect(totalRow).toContainText("S$13,655");
  });

  test("switching to GCBA raises the URA first-submission fee to $8,000 and updates the total", async ({
    page,
  }) => {
    const sgfaInput = page.locator('input[type="number"]').first();
    await sgfaInput.fill("1000");
    await sgfaInput.blur();

    await page.getByLabel("In Good Class Bungalow Area (GCBA)?").selectOption("yes");

    const uraRow = page.locator(".fee-table tr", { hasText: "First submission (per house)" });
    await expect(uraRow.locator(".fee-amount")).toHaveText("S$8,000");

    const totalRow = page.locator(".fee-total-row");
    // 13,655 base - 6,000 (non-GCBA) + 8,000 (GCBA) = 15,655
    await expect(totalRow).toContainText("S$15,655");
  });

  test("switching PUB project type to Major raises that fee to $1,850", async ({ page }) => {
    await page.getByLabel("PUB project type").selectOption("Major");
    const pubRow = page.locator(".fee-table tr", { hasText: "Drainage / sewerage / sanitary" });
    await expect(pubRow.locator(".fee-amount")).toHaveText("S$1,850");
  });

  test("selecting a different NParks category updates its fee", async ({ page }) => {
    await page.getByLabel("NPARKS category").selectOption("tca-gcb");
    const nparksRow = page.locator(".fee-table tr", { hasText: "NPARKS" });
    await expect(nparksRow.locator(".fee-amount")).toHaveText("S$2,675");
  });

  test("inputs persist across reload", async ({ page }) => {
    const sgfaInput = page.locator('input[type="number"]').first();
    await sgfaInput.fill("2500");
    await sgfaInput.blur();
    // Auto-retrying: waits for the mutation's refetch to actually land (the read-only
    // "rounded up" field reflecting the new SGFA) instead of racing a fixed sleep.
    await expect(page.getByLabel("SGFA rounded up to next 100 m² (auto)")).toHaveValue("2500");

    await page.getByLabel("In Good Class Bungalow Area (GCBA)?").selectOption("yes");
    const uraRow = page.locator(".fee-table tr", { hasText: "First submission (per house)" });
    await expect(uraRow.locator(".fee-amount")).toHaveText("S$8,000");

    await page.reload();
    await page.getByRole("button", { name: "Fees" }).click();

    await expect(page.locator('input[type="number"]').first()).toHaveValue("2500");
    await expect(page.getByLabel("In Good Class Bungalow Area (GCBA)?")).toHaveValue("yes");
  });

  test("the calculator inputs are disabled while the project is locked", async ({ page }) => {
    await page.getByRole("button", { name: "🔓 Unlocked" }).click();
    await expect(page.getByRole("button", { name: "🔒 Locked" })).toBeVisible();

    await expect(page.locator('input[type="number"]').first()).toBeDisabled();
    await expect(page.getByLabel("PUB project type")).toBeDisabled();
  });
});
