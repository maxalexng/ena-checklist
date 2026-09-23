import { expect, test } from "@playwright/test";
import { createTestProject, deleteProjectByReference, login, uniqueE2eReference } from "./helpers";

test.describe("Checklist rail navigation and step reordering", () => {
  let reference: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("rail");
    const project = await createTestProject({ reference, title: "Rail Test Project" });
    await login(page);
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Checklist" }).click();
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("the rail lists every stage and step, with step numbers and progress", async ({ page }) => {
    const rail = page.locator(".rail");
    await expect(rail.locator(".rail-stage-group")).toHaveCount(8);
    await expect(rail.locator(".rail-item")).toHaveCount(39);
    await expect(rail.locator(".rail-item").first()).toContainText("1.");
  });

  test("every step card shows its step number", async ({ page }) => {
    await expect(page.getByText("Step 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Step 39", { exact: true })).toBeVisible();
  });

  test("clicking a rail item expands and scrolls to that step", async ({ page }) => {
    // The rail's 39th item is far down the page and its step card starts collapsed by
    // default only if the user collapsed it — steps start expanded, so instead verify the
    // click actually scrolls the page to bring that step card into view.
    const lastRailItem = page.locator(".rail-item").last();
    const lastStepCode = await lastRailItem.locator(".rail-code").textContent();
    await lastRailItem.click();

    await page.waitForTimeout(500); // smooth-scroll animation
    const targetCard = page.locator(".agency", { hasText: lastStepCode!.split(".")[1]?.trim() || "" }).last();
    await expect(targetCard).toBeInViewport();
  });

  test("moving a step down persists its new position across reload", async ({ page }) => {
    // Pre-Design's first step (INTAKE) moving down should swap with its next same-stage
    // neighbor (TEAM) in the rail's flattened list.
    const rail = page.locator(".rail");
    const firstStageGroup = rail.locator(".rail-stage-group").first();
    const beforeNames = await firstStageGroup.locator(".rail-name").allTextContents();
    const [firstBefore, secondBefore] = beforeNames;

    const firstCard = page.locator(".agency").first();
    await firstCard.locator(".step-move-btn").nth(1).click(); // ▼ is the second button

    // Auto-retrying: waits for the mutation's refetch + re-render to actually land instead
    // of racing a fixed sleep against real network latency.
    await expect(firstStageGroup.locator(".rail-name").first()).toHaveText(secondBefore);
    await expect(firstStageGroup.locator(".rail-name").nth(1)).toHaveText(firstBefore);

    await page.reload();
    await page.getByRole("button", { name: "Checklist" }).click();
    const reloadedGroup = page.locator(".rail").locator(".rail-stage-group").first();
    await expect(reloadedGroup.locator(".rail-name").first()).toHaveText(secondBefore);
    await expect(reloadedGroup.locator(".rail-name").nth(1)).toHaveText(firstBefore);
  });

  test("the first step in a stage can't move up, and the last can't move down", async ({ page }) => {
    const firstCard = page.locator(".agency").first();
    await expect(firstCard.locator(".step-move-btn").nth(0)).toBeDisabled(); // ▲

    // Pre-Design's last step (excluding any moved to another stage) — find it via the rail.
    const preDesignSteps = page.locator(".rail-stage-group").first().locator(".rail-name");
    const lastPreDesignName = await preDesignSteps.last().textContent();
    const lastCard = page.locator(".agency", { hasText: lastPreDesignName! }).last();
    await expect(lastCard.locator(".step-move-btn").nth(1)).toBeDisabled(); // ▼
  });
});
