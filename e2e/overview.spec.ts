import { expect, test, type Page } from "@playwright/test";
import { createTestProject, deleteProjectByReference, uniqueE2eReference } from "./helpers";

/** The .ov-row whose own label is exactly `label` — other rows' hint text can mention it. */
function overviewRow(page: Page, label: string) {
  return page.locator(".ov-row").filter({ has: page.locator(".ov-label", { hasText: new RegExp(`^${label}$`) }) });
}

test.describe("Overview tab", () => {
  let reference: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("overview");
    const project = await createTestProject({ reference, title: "Overview Test Project" });
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

  test("the AI reference sits inside the Actual Contract Start row and persists", async ({ page }) => {
    const contractStartRow = page.locator(".ov-row", { hasText: "Actual Contract Start" });
    const aiRef = contractStartRow.getByLabel("AI Reference (regularising start)");
    await aiRef.fill("AI/2024/0123");
    await expect(page.locator(".ov-row", { hasText: "AI Reference" })).toHaveCount(1);

    await page.reload();
    await expect(
      page.locator(".ov-row", { hasText: "Actual Contract Start" }).getByLabel("AI Reference (regularising start)"),
    ).toHaveValue("AI/2024/0123");
  });

  test("EOTs are tallied and added to the target practical completion", async ({ page }) => {
    const completionRow = overviewRow(page, "Target Practical Completion");
    await completionRow.locator("input[type=date]").fill("2026-06-30");

    const tally = page.locator(".ov-ext-total");
    await expect(tally).toHaveCount(0);

    await page.locator("#eot-add-title").fill("EOT 1 - Adverse Weather");
    await page.locator("#eot-add-days").fill("10");
    await page.getByRole("button", { name: "+ Add EOT" }).click();
    await expect(tally).toContainText("Total: 1 EOT issued · 10 days awarded");
    await expect(tally).toContainText("Extended Completion: 10 07 2026");

    await page.locator("#eot-add-title").fill("EOT 2 - Late Utility Diversion");
    await page.locator("#eot-add-days").fill("5");
    await page.getByRole("button", { name: "+ Add EOT" }).click();
    await expect(tally).toContainText("Total: 2 EOTs issued · 15 days awarded");
    await expect(tally).toContainText("Extended Completion: 15 07 2026");
    await expect(tally).toContainText("Target Practical Completion 30 06 2026 + 15 days");
  });

  test("actual completion shows days late against the extended completion date", async ({ page }) => {
    const actualRow = overviewRow(page, "Actual Completion");
    await expect(actualRow).toContainText("Set a Target Practical Completion to track days late.");

    await overviewRow(page, "Target Practical Completion").locator("input[type=date]").fill("2026-06-30");
    await page.locator("#eot-add-title").fill("EOT 1 - Adverse Weather");
    await page.locator("#eot-add-days").fill("10");
    await page.getByRole("button", { name: "+ Add EOT" }).click();
    await expect(page.locator(".ov-ext-total")).toContainText("Extended Completion: 10 07 2026");

    await actualRow.locator("input[type=date]").fill("2026-07-25");
    const badge = actualRow.locator(".completion-delay");
    await expect(badge).toHaveText("Completed 15 days late");
    await expect(badge).toHaveClass(/\burgent\b/);
    await expect(actualRow).toContainText("vs Extended Completion 10 07 2026");

    await actualRow.locator("input[type=date]").fill("2026-07-08");
    await expect(badge).toHaveText("Completed 2 days early");
    await expect(badge).toHaveClass(/\bok\b/);

    await page.reload();
    const reloaded = overviewRow(page, "Actual Completion");
    await expect(reloaded.locator("input[type=date]")).toHaveValue("2026-07-08");
    await expect(reloaded.locator(".completion-delay")).toHaveText("Completed 2 days early");
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

  test("interim certificates: folder, latest IC number and value of works against the contract sum", async ({
    page,
  }) => {
    // The % updates as you type, so wait for each save to land before the next edit.
    async function fillAndSave(label: string, value: string, endpoint = "merge_project_dates") {
      await page.getByLabel(label).fill(value);
      const saved = page.waitForResponse((r) => r.url().includes(endpoint) && r.ok());
      await page.getByLabel(label).blur();
      await saved;
    }

    const progress = page.locator(".ic-progress");
    await expect(progress).toContainText("Enter the value of works and the Contract Sum");

    // The folder link sits behind a folder icon, like a checklist item's drawing location.
    await expect(page.getByLabel("Interim Certificates folder link")).toHaveCount(0);
    await page.getByRole("button", { name: "Interim Certificates folder (empty)" }).click();
    await fillAndSave("Interim Certificates folder link", "https://example.com/project/interim-certificates");
    await expect(page.getByRole("link", { name: "Open ↗" })).toHaveAttribute(
      "href",
      "https://example.com/project/interim-certificates",
    );
    await expect(page.getByRole("button", { name: "Interim Certificates folder (saved)" })).toHaveClass(/\bhas-file\b/);

    await fillAndSave("Latest IC No.", "12");
    await fillAndSave("Contract Sum", "S$10,000,000.00", "/rest/v1/projects");
    await fillAndSave("Value of Works Done", "9m");

    await expect(progress).toContainText("90% of Contract Sum");
    await expect(progress).toContainText("S$9,000,000.00 / S$10,000,000.00");
    await expect(progress.locator(".ms-expiry")).toHaveClass(/\bok\b/);

    // Variations can push the value of works past the contract sum.
    await fillAndSave("Value of Works Done", "12,000,000");
    await expect(progress).toContainText("120% of Contract Sum");
    await expect(progress).toContainText("over the Contract Sum");
    await expect(progress.locator(".ms-expiry")).toHaveClass(/\bsoon\b/);

    await page.reload();
    await page.getByRole("button", { name: "Interim Certificates folder (saved)" }).click();
    await expect(page.getByLabel("Interim Certificates folder link")).toHaveValue(
      "https://example.com/project/interim-certificates",
    );
    await expect(page.getByLabel("Latest IC No.")).toHaveValue("12");
    await expect(page.getByLabel("Value of Works Done")).toHaveValue("12,000,000");
    await expect(page.locator(".ic-progress")).toContainText("120% of Contract Sum");
  });
});
