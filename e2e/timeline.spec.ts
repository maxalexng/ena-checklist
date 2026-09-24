import { expect, test } from "@playwright/test";
import {
  createTestProject,
  deleteProjectByReference,
  login,
  setProjectFields,
  uniqueE2eReference,
} from "./helpers";

const PROJECT_DATES_WITH_START = {
  contractStart: "2024-08-06",
  practicalCompletion: "",
  practicalCompletionNote: "",
  contractSigned: "",
  loaSigned: "",
  loaBasisType: "months",
  loaBasisMonths: "3",
  startAiRef: "",
  eot: [],
};

test.describe("Timeline tab", () => {
  let reference: string;

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("prompts for a contract start date when none is set", async ({ page }) => {
    reference = uniqueE2eReference("timeline-empty");
    const project = await createTestProject({ reference, title: "Timeline Empty" });
    await login(page);
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Timeline" }).click();

    await expect(page.getByText("Actual Contract Start")).toBeVisible();
    await expect(page.locator(".tl-scale-wrap")).toHaveCount(0);
  });

  test("renders stage bands and lets you edit a stage duration", async ({ page }) => {
    reference = uniqueE2eReference("timeline-bands");
    const project = await createTestProject({ reference, title: "Timeline Bands" });
    await setProjectFields(project.id, { project_dates: PROJECT_DATES_WITH_START });

    await login(page);
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Timeline" }).click();

    await expect(page.getByText("208 weeks from 06 08 2024")).toBeVisible();
    await expect(page.locator(".tl-band")).toHaveCount(8);

    await page.getByRole("button", { name: "Edit stage durations" }).click();
    const preDesignRow = page.locator(".tl-dur-row", { hasText: "Pre-Design" });
    await preDesignRow.locator("input[type=number]").fill("10");
    await preDesignRow.locator("input[type=number]").blur();

    // pre-design goes from 6 to 10 weeks -> total goes from 208 to 212.
    await expect(page.getByText("212 weeks from 06 08 2024")).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Timeline" }).click();
    await expect(page.getByText("212 weeks from 06 08 2024")).toBeVisible();
  });

  test("setting a per-step planned date range persists", async ({ page }) => {
    reference = uniqueE2eReference("timeline-plan");
    const project = await createTestProject({ reference, title: "Timeline Plan" });
    await setProjectFields(project.id, { project_dates: PROJECT_DATES_WITH_START });

    await login(page);
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Timeline" }).click();

    const uraRow = page.locator(".tl-row", { hasText: "Planning Permission (Written Permission)" });
    const dateInputs = uraRow.locator("input[type=date]");
    await dateInputs.nth(0).fill("2024-09-01");
    await dateInputs.nth(1).fill("2024-10-01");

    await page.reload();
    await page.getByRole("button", { name: "Timeline" }).click();
    const reloadedRow = page.locator(".tl-row", { hasText: "Planning Permission (Written Permission)" });
    const reloadedInputs = reloadedRow.locator("input[type=date]");
    await expect(reloadedInputs.nth(0)).toHaveValue("2024-09-01");
    await expect(reloadedInputs.nth(1)).toHaveValue("2024-10-01");
  });
});
