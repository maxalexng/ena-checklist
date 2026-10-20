import { expect, test } from "@playwright/test";
import { createTestProject, deleteProjectByReference, uniqueE2eReference } from "./helpers";

// Date fields typed in by hand, digit by digit as on a numpad. Chrome reports a whole date as
// soon as the first year digit goes in (year 0002); saving that used to redraw the field
// mid-typing and wipe the year.
test.describe("Typing a date by hand", () => {
  test.use({ locale: "en-GB" });
  let reference: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("date-typing");
    const project = await createTestProject({ reference, title: "Date Typing Test Project" });
    await page.goto(`/projects/${project.id}`);
    await expect(page.getByRole("heading", { name: "Date Typing Test Project" })).toBeVisible();
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("keeps every digit of the year in a submission log checkpoint", async ({ page }) => {
    const field = page.getByLabel("NParks DC Clearance date");
    await field.focus();
    await page.keyboard.type("21072025", { delay: 120 });
    await expect(page.getByLabel("NParks DC Clearance date")).toHaveValue("2025-07-21");

    await page.reload();
    await expect(page.getByLabel("NParks DC Clearance date")).toHaveValue("2025-07-21");
  });

  test("keeps every digit of the year in a project date, and saves it", async ({ page }) => {
    const field = page.getByLabel("SP Testing & Commissioning date", { exact: true });
    await field.focus();
    await page.keyboard.type("03112026", { delay: 120 });
    await page.keyboard.press("Tab");
    await expect(field).toHaveValue("2026-11-03");

    await page.reload();
    await expect(page.getByLabel("SP Testing & Commissioning date", { exact: true })).toHaveValue("2026-11-03");
  });
});
