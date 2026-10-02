import { expect, test } from "@playwright/test";
import {
  createTestProject,
  deleteProjectByReference,
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

  test("prompts for a start date when none is set, and a project start shows the timeline", async ({ page }) => {
    reference = uniqueE2eReference("timeline-empty");
    const project = await createTestProject({ reference, title: "Timeline Empty" });
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Timeline" }).click();

    await expect(page.getByText("Actual Contract Start")).toBeVisible();
    await expect(page.locator(".tl-scale-wrap")).toHaveCount(0);

    await page.getByLabel("Project start").fill("2026-01-05");
    await expect(page.getByText("208 weeks from 05 01 2026")).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Timeline" }).click();
    await expect(page.getByText("208 weeks from 05 01 2026")).toBeVisible();
  });

  test("renders stage bands and lets you edit a stage duration", async ({ page }) => {
    reference = uniqueE2eReference("timeline-bands");
    const project = await createTestProject({ reference, title: "Timeline Bands" });
    await setProjectFields(project.id, { project_dates: PROJECT_DATES_WITH_START });

    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Timeline" }).click();

    // Construction starts on the contract start, so the 48 weeks of stages before it come first.
    await expect(page.getByText("208 weeks from 05 09 2023")).toBeVisible();
    await expect(page.getByText("counted back from the Actual Contract Start (06 08 2024)")).toBeVisible();
    await expect(page.locator(".tl-band")).toHaveCount(8);

    await page.getByRole("button", { name: "Edit stage durations" }).click();
    const preDesignRow = page.locator(".tl-dur-row", { hasText: "Pre-Design" });
    await preDesignRow.locator("input[type=number]").fill("10");
    await preDesignRow.locator("input[type=number]").blur();

    // pre-design goes from 6 to 10 weeks -> total goes from 208 to 212, starting 4 weeks earlier.
    await expect(page.getByText("212 weeks from 08 08 2023")).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Timeline" }).click();
    await expect(page.getByText("212 weeks from 08 08 2023")).toBeVisible();
  });

  test("lists the map's stages under each agency's logo, with typical targets", async ({ page }) => {
    reference = uniqueE2eReference("timeline-stages");
    const project = await createTestProject({ reference, title: "Timeline Stages" });
    await setProjectFields(project.id, { project_dates: { ...PROJECT_DATES_WITH_START, projectStart: "2026-01-05" } });

    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Timeline" }).click();

    await expect(page.locator(".tl-group-head")).toHaveCount(9);
    await expect(page.locator(".tl-group-head img")).toHaveCount(9);
    const pp = page.locator('.tl-stage-row[data-node="ura-pp"]');
    // Typical target: the end of Detailed Design, 40 weeks after 5 Jan 2026.
    await expect(pp.locator('[data-bubble="end"]')).toHaveAttribute("data-typical", "true");
    await expect(pp.locator(".tl-stage-dates")).toHaveText("12 10 2026");
    await expect(pp.locator('[data-bubble="start"]')).toHaveCount(0);
  });

  test("a stage's start and target can be set, persist, and reset to typical", async ({ page }) => {
    reference = uniqueE2eReference("timeline-plan");
    const project = await createTestProject({ reference, title: "Timeline Plan" });
    await setProjectFields(project.id, { project_dates: { ...PROJECT_DATES_WITH_START, projectStart: "2026-01-05" } });

    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Timeline" }).click();

    const pp = page.locator('.tl-stage-row[data-node="ura-pp"]');
    await pp.getByRole("button", { name: /Provisional Permission/ }).click();
    const editor = page.getByTestId("timeline-editor");
    await editor.getByLabel("Start preparing").selectOption({ label: "After Design Development" });
    // Pre-design + concept + design development = 26 weeks after 5 Jan 2026.
    await expect(pp.locator('[data-bubble="start"]')).toBeVisible();
    await expect(pp.locator(".tl-pill")).toBeVisible();
    await expect(pp.locator(".tl-stage-dates")).toHaveText("06 07 2026 →12 10 2026");

    await editor.getByLabel("Target / confirm by").fill("2026-09-15");
    await expect(pp.locator('[data-bubble="end"]')).not.toHaveAttribute("data-typical", "true");

    await page.reload();
    await page.getByRole("button", { name: "Timeline" }).click();
    await expect(pp.locator(".tl-stage-dates")).toHaveText("06 07 2026 →15 09 2026");

    await pp.getByRole("button", { name: /Provisional Permission/ }).click();
    await page.getByTestId("timeline-editor").getByRole("button", { name: "Use typical" }).click();
    await expect(pp.locator(".tl-stage-dates")).toHaveText("06 07 2026 →12 10 2026");
    await expect(pp.locator('[data-bubble="end"]')).toHaveAttribute("data-typical", "true");
  });

  test("only a target someone has set makes a stage late", async ({ page }) => {
    reference = uniqueE2eReference("timeline-late");
    const project = await createTestProject({ reference, title: "Timeline Late" });
    // A project that started in 2020 is past every typical target, but those don't count.
    await setProjectFields(project.id, {
      project_dates: { ...PROJECT_DATES_WITH_START, projectStart: "2020-01-06" },
      submission_map: { "ura-pp": { end: "2020-06-01" } },
    });

    await page.goto(`/projects/${project.id}`);
    const map = page.getByTestId("submission-map");
    await expect(map.locator('[data-node="ura-pp"]')).toHaveClass(/smap-late/);
    await expect(map.locator('[data-node="ura-wp"]')).not.toHaveClass(/smap-late/);
    await expect(map.locator(".smap-tally")).toContainText("1 late");
    await page.getByRole("button", { name: "Timeline" }).click();
    await expect(page.locator('.tl-stage-row[data-node="ura-pp"] [data-bubble="end"]')).toHaveClass(/smap-late/);
  });
});
