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
    // Suggestion text displays DD MM YYYY; the <input type="date"> itself still uses the
    // HTML-required YYYY-MM-DD value (checked below).
    await expect(contractStartRow.getByText("Suggested: 09 07 2024")).toBeVisible();

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
    await expect(adjustedRow.getByText("10 07 2026 (+10 days EOT)")).toBeVisible();
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

  test("logging a PP grant shows a PP Expiry bubble with an extension reminder", async ({ page }) => {
    const uraSection = page.locator(".ov-section").filter({ hasText: "URA — Provisional Permission" });
    await uraSection.locator('[data-field="type"]').fill("PP Cleared / Granted");
    await uraSection.locator('[data-field="date"]').fill("2024-06-15");
    await uraSection.getByRole("button", { name: "+ Add" }).click();

    // The label, date, and days-remaining are one combined coloured bubble now, not a plain
    // label next to a small coloured date.
    const bubble = uraSection.locator(".ms-expiry");
    await expect(bubble).toContainText("PP Expiry");
    await expect(bubble).toContainText("15 12 2024");
    await expect(uraSection.locator(".ov-hint")).toContainText("15 10 2024"); // extension deadline

    // No manual validity input anymore — the standard periods are fixed.
    await expect(page.getByText("PP validity (months)")).toHaveCount(0);
  });

  test("logging a WP grant supersedes PP with a 2-year WP Expiry", async ({ page }) => {
    const uraSection = page.locator(".ov-section").filter({ hasText: "URA — Provisional Permission" });

    await uraSection.locator('[data-field="type"]').fill("PP Cleared / Granted");
    await uraSection.locator('[data-field="date"]').fill("2024-06-15");
    await uraSection.getByRole("button", { name: "+ Add" }).click();

    await uraSection.locator('[data-field="type"]').fill("WP Granted");
    await uraSection.locator('[data-field="date"]').fill("2024-09-01");
    await uraSection.getByRole("button", { name: "+ Add" }).click();

    const bubble = uraSection.locator(".ms-expiry");
    await expect(bubble).toContainText("WP Expiry");
    await expect(bubble).toContainText("01 09 2026"); // +2 years
  });

  // Same months-ago-from-today approach as dates.test.ts's zone tests — anchored to "now"
  // so these don't silently bit-rot as the calendar moves on. ppWpExpiryInfo always bases
  // the expiry on whichever same-kind entry has the *latest* date, so each zone needs its
  // own project (adding a second, older PP entry wouldn't override the first).
  function monthsAgoIso(months: number): string {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - months);
    return d.toISOString().slice(0, 10);
  }

  test("the PP Expiry bubble is green just after grant", async ({ page }) => {
    const uraSection = page.locator(".ov-section").filter({ hasText: "URA — Provisional Permission" });
    await uraSection.locator('[data-field="type"]').fill("PP Cleared / Granted");
    await uraSection.locator('[data-field="date"]').fill(monthsAgoIso(0));
    await uraSection.getByRole("button", { name: "+ Add" }).click();
    await expect(uraSection.locator(".ms-expiry")).toHaveClass(/\bok\b/);
  });

  test("the PP Expiry bubble turns amber partway through validity", async ({ page }) => {
    const uraSection = page.locator(".ov-section").filter({ hasText: "URA — Provisional Permission" });
    await uraSection.locator('[data-field="type"]').fill("PP Cleared / Granted");
    await uraSection.locator('[data-field="date"]').fill(monthsAgoIso(3));
    await uraSection.getByRole("button", { name: "+ Add" }).click();
    await expect(uraSection.locator(".ms-expiry")).toHaveClass(/\bsoon\b/);
  });

  test("the PP Expiry bubble turns red in the final stretch, before actually expiring", async ({ page }) => {
    const uraSection = page.locator(".ov-section").filter({ hasText: "URA — Provisional Permission" });
    await uraSection.locator('[data-field="type"]').fill("PP Cleared / Granted");
    await uraSection.locator('[data-field="date"]').fill(monthsAgoIso(5));
    await uraSection.getByRole("button", { name: "+ Add" }).click();
    const bubble = uraSection.locator(".ms-expiry");
    await expect(bubble).toHaveClass(/\burgent\b/);
    await expect(bubble).not.toContainText("expired"); // still ~1 month left, not overdue
  });

  test("editing the project info bar (title/reference) saves and reflects in the masthead", async ({ page }) => {
    await page.getByLabel("Title").fill("Renamed Project Title");
    await page.getByLabel("Title").blur();

    await expect(page.getByRole("heading", { name: "Renamed Project Title" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Renamed Project Title" })).toBeVisible();
  });
});
