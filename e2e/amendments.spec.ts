import { expect, test } from "@playwright/test";
import { createTestProject, deleteProjectByReference, uniqueE2eReference } from "./helpers";

function localToday(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

test.describe("Amendment required notes on the Overview", () => {
  let reference: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("amendments");
    const project = await createTestProject({ reference, title: "Amendments Test Project" });
    await page.goto(`/projects/${project.id}`);
    await expect(page.getByRole("heading", { name: "Amendments Test Project" })).toBeVisible();
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("every agency section has the button, with nothing logged to start", async ({ page }) => {
    for (const agency of ["ura", "bca", "nparks", "lta", "pub", "scdf"]) {
      const log = page.getByTestId(`amendments-${agency}__AMENDMENTS`);
      await expect(log.getByRole("button", { name: "+ Amendment required" })).toBeVisible();
      await expect(log).toContainText("None logged.");
    }
    await expect(page.locator(".amend-badge")).toHaveCount(0);
  });

  test("logging one stamps today's date, keeps the note, flags the section and the map", async ({ page }) => {
    const log = page.getByTestId("amendments-pub__AMENDMENTS");
    await log.getByRole("button", { name: "+ Amendment required" }).click();

    await expect(log.getByLabel("Amendment 1 logged on")).toHaveValue(localToday());
    const saved = page.waitForResponse((r) => r.url().includes("/rest/v1/milestones") && r.request().method() === "PATCH");
    await log.getByLabel("Amendment 1 note").fill("Sump pump moved to the rear; drainage plan to be resubmitted");
    await log.getByLabel("Amendment 1 note").blur();
    await saved;

    const pubSection = page.locator(".ov-section").filter({ has: log });
    await expect(pubSection.locator(".amend-badge")).toHaveText("⚠ 1 amendment required");
    await expect(page.getByTestId("submission-map").locator('[data-node="pub-amend"]')).toHaveAttribute(
      "data-status",
      "progress"
    );
    await expect(page.getByTestId("submission-map").locator('[data-node="bca-amend"]')).toHaveAttribute(
      "data-status",
      "pending"
    );

    await page.reload();
    await expect(log.getByLabel("Amendment 1 note")).toHaveValue("Sump pump moved to the rear; drainage plan to be resubmitted");
    await expect(log.getByLabel("Amendment 1 logged on")).toHaveValue(localToday());

    // A second one stacks under the first; removing one leaves the other.
    await log.getByRole("button", { name: "+ Amendment required" }).click();
    await expect(log.getByLabel("Amendment 2 logged on")).toBeVisible();
    await expect(pubSection.locator(".amend-badge")).toHaveText("⚠ 2 amendments required");
    await log.getByRole("button", { name: "Remove amendment 1" }).click();
    await expect(log.locator(".amend-row")).toHaveCount(1);
    await log.getByRole("button", { name: "Remove amendment 1" }).click();
    await expect(log).toContainText("None logged.");
    await expect(page.getByTestId("submission-map").locator('[data-node="pub-amend"]')).toHaveAttribute(
      "data-status",
      "pending"
    );
  });

  test("date fields don't offer years before 2010", async ({ page }) => {
    const log = page.getByTestId("amendments-ura__AMENDMENTS");
    await log.getByRole("button", { name: "+ Amendment required" }).click();
    await expect(log.getByLabel("Amendment 1 logged on")).toHaveAttribute("min", "2010-01-01");
    await expect(page.getByLabel("SP Testing & Commissioning date", { exact: true })).toHaveAttribute("min", "2010-01-01");
  });
});
