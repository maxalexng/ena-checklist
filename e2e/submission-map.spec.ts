import { expect, test, type Page } from "@playwright/test";
import { adminClient, createTestProject, deleteProjectByReference, uniqueE2eReference } from "./helpers";

function mapNode(page: Page, nodeId: string) {
  return page.getByTestId("submission-map").locator(`[data-node="${nodeId}"]`);
}

function statusButton(page: Page, name: string | RegExp) {
  return page.getByTestId("submission-map-detail").getByRole("group", { name: "Status" }).getByRole("button", { name });
}

test.describe("Overview submission map", () => {
  let reference: string;
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("submission-map");
    const project = await createTestProject({ reference, title: "Submission Map Test Project" });
    projectId = project.id;
    await page.goto(`/projects/${project.id}`);
    await expect(page.getByRole("heading", { name: "Submission Map Test Project" })).toBeVisible();
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("shows every agency, with a new project's stages not started", async ({ page }) => {
    const map = page.getByTestId("submission-map");
    await expect(map.locator(".smap-row")).toHaveCount(9);
    for (const agency of ["URA", "BCA", "NEA", "LTA", "PUB", "NParks", "SCDF", "SLA", "TFCC"]) {
      await expect(map.locator(".smap-agency-code", { hasText: new RegExp(`^${agency}$`) })).toBeVisible();
    }
    await expect(map.locator(".smap-agency img")).toHaveCount(9);
    await expect(mapNode(page, "bca-bp")).toHaveAttribute("data-status", "pending");
    await expect(map).toContainText("0 of");
    // Each agency's first stage is what's up next.
    await expect(map.locator(".smap-chip-next .smap-chip", { hasText: "SCDF BP" })).toBeVisible();
  });

  test("a stage follows its checklist step, and can be overridden and returned to auto", async ({ page }) => {
    await adminClient()
      .from("checklist_items")
      .update({ status: "cleared" })
      .eq("project_id", projectId)
      .eq("step_key", "scdf__FS");
    await page.reload();

    await expect(mapNode(page, "scdf-bp")).toHaveAttribute("data-status", "done");
    // With BP done, SCDF's next stage is the FSC / TFP for TOP.
    await expect(page.locator(".smap-chip-next .smap-chip", { hasText: "SCDF TOP" })).toBeVisible();

    await mapNode(page, "scdf-bp").click();
    const detail = page.getByTestId("submission-map-detail");
    await expect(detail).toContainText("From the checklist: 6 of 6 items cleared.");
    await statusButton(page, "In progress").click();
    await expect(mapNode(page, "scdf-bp")).toHaveAttribute("data-status", "progress");
    await expect(detail).toContainText("Set by hand. The checklist says done.");

    await page.reload();
    await expect(mapNode(page, "scdf-bp")).toHaveAttribute("data-status", "progress");

    await mapNode(page, "scdf-bp").click();
    await statusButton(page, "Auto (Done)").click();
    await expect(mapNode(page, "scdf-bp")).toHaveAttribute("data-status", "done");
    await page.reload();
    await expect(mapNode(page, "scdf-bp")).toHaveAttribute("data-status", "done");
  });

  test("a stage with no checklist step is set by hand and persists", async ({ page }) => {
    await mapNode(page, "nea-top").click();
    await expect(page.getByTestId("submission-map-detail")).toContainText("tracked here by hand");
    await expect(statusButton(page, /^Auto/)).toHaveCount(0);

    await statusButton(page, "Done").click();
    await expect(mapNode(page, "nea-top")).toHaveAttribute("data-status", "done");
    // A quick second pick on another node mustn't undo the first.
    await mapNode(page, "nea-csc").click();
    await statusButton(page, "N/A").click();
    await expect(mapNode(page, "nea-csc")).toHaveAttribute("data-status", "na");

    await page.reload();
    await expect(mapNode(page, "nea-top")).toHaveAttribute("data-status", "done");
    await expect(mapNode(page, "nea-csc")).toHaveAttribute("data-status", "na");
  });

  test("URA PP and WP read the PP submission log", async ({ page }) => {
    await adminClient()
      .from("milestones")
      .insert([
        { project_id: projectId, step_key: "ura__PP", type: "Submitted", date: "2026-01-05", note: "", sort_order: 0 },
        { project_id: projectId, step_key: "ura__PP", type: "Provisional Permission", date: "2026-03-02", note: "", sort_order: 1 },
      ]);
    await page.reload();
    await expect(mapNode(page, "ura-pp")).toHaveAttribute("data-status", "done");
    await expect(mapNode(page, "ura-wp")).toHaveAttribute("data-status", "pending");
  });

  test("a stage past its planned end date shows as late", async ({ page }) => {
    await adminClient()
      .from("timeline_plan")
      .insert({ project_id: projectId, step_key: "scdf__FS", start_date: "2025-01-01", end_date: "2025-06-30" });
    await page.reload();

    await expect(mapNode(page, "scdf-bp")).toHaveClass(/smap-late/);
    await expect(page.locator(".smap-chip-late .smap-chip", { hasText: "SCDF BP" })).toContainText("due 30 06 2025");
    await expect(page.getByTestId("submission-map").locator(".smap-tally")).toContainText("1 late");
  });

  test("clicking an agency opens its first step in the checklist", async ({ page }) => {
    await page.getByTestId("submission-map").getByRole("button", { name: "Go to SCDF steps" }).click();
    await expect(page.locator("#step-scdf__FS")).toBeInViewport();
  });

  test("a stage's panel links to its checklist step", async ({ page }) => {
    await mapNode(page, "pub-dc").click();
    await page.getByTestId("submission-map-detail").getByRole("button", { name: /Sewerage & Sanitary plan submission/ }).click();
    await expect(page.locator("#step-pub__SS")).toBeInViewport();
  });
});
