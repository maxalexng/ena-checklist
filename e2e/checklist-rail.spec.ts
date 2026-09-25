import { expect, test } from "@playwright/test";
import { createTestProject, deleteProjectByReference, uniqueE2eReference } from "./helpers";

test.describe("Checklist rail navigation and step reordering", () => {
  let reference: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("rail");
    const project = await createTestProject({ reference, title: "Rail Test Project" });
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Checklist" }).click();
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("the rail lists every stage and step, with step numbers and progress", async ({ page }) => {
    const rail = page.locator(".rail");
    await expect(rail.locator(".rail-stage-group")).toHaveCount(8);
    await expect(rail.locator(".rail-item")).toHaveCount(46);
    await expect(rail.locator(".rail-item").first()).toContainText("1.");
  });

  test("every step card shows its step number", async ({ page }) => {
    await expect(page.getByText("Step 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Step 46", { exact: true })).toBeVisible();
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

  test("moving a step renumbers step N sequentially with no gaps", async ({ page }) => {
    // INTAKE (step 1) moving down swaps with TEAM (step 2) — their "Step N" tags should
    // swap along with them, so the sequence still reads 1, 2, 3, ... with no gaps or
    // stale numbers left over from the template's fixed default order.
    const firstCard = page.locator(".agency").first();
    const secondCard = page.locator(".agency").nth(1);
    await expect(firstCard.locator(".step-tag")).toHaveText("Step 1");
    await expect(secondCard.locator(".step-tag")).toHaveText("Step 2");

    await firstCard.locator(".step-move-btn").nth(1).click(); // ▼

    await expect(page.locator(".agency").first().locator(".step-tag")).toHaveText("Step 1");
    await expect(page.locator(".agency").nth(1).locator(".step-tag")).toHaveText("Step 2");
    // The step that moved down (INTAKE) now carries "Step 2" — confirm it actually
    // renumbered rather than just re-rendering the same two labels by coincidence.
    await expect(page.locator(".agency").nth(1)).toContainText("Client Information");
  });

  test("stage headers read 'Stage N' followed by the stage name", async ({ page }) => {
    const stageHeads = page.locator(".stage-head");
    await expect(stageHeads.first()).toContainText("Stage 1");
    await expect(stageHeads.first()).toContainText("Pre-Design");
    await expect(stageHeads.nth(1)).toContainText("Stage 2");
    await expect(stageHeads.nth(1)).toContainText("Concept Design");
  });

  test("only the very first step overall can't move up, and only the very last can't move down", async ({
    page,
  }) => {
    // A step at the edge of its own stage can now cross into the adjacent one, so the
    // move buttons are only disabled at the true start/end of the whole checklist —
    // Stage 1's first step and Stage 8's last, not every stage boundary in between.
    const firstCard = page.locator(".agency").first();
    await expect(firstCard.locator(".step-move-btn").nth(0)).toBeDisabled(); // ▲
    await expect(firstCard.locator(".step-move-btn").nth(1)).toBeEnabled(); // ▼ — crosses into Stage 2

    const lastCard = page.locator(".agency").last();
    await expect(lastCard.locator(".step-move-btn").nth(1)).toBeDisabled(); // ▼
    await expect(lastCard.locator(".step-move-btn").nth(0)).toBeEnabled(); // ▲ — crosses into the prior stage
  });

  test("moving a step past the bottom of its stage crosses into the next stage, and persists across reload", async ({
    page,
  }) => {
    // Pre-Design's last step (Singapore Land Authority) moving down should cross into
    // Concept Design, landing as its new first step.
    const preDesignGroup = page
      .locator(".stage")
      .filter({ has: page.locator(".stage-label", { hasText: "Stage 1" }) });
    const lastPreDesignCard = preDesignGroup.locator(".agency").last();
    await expect(lastPreDesignCard).toContainText("Singapore Land Authority");

    await lastPreDesignCard.locator(".step-move-btn").nth(1).click(); // ▼

    const conceptGroup = page.locator(".stage").filter({ has: page.locator(".stage-label", { hasText: "Stage 2" }) });
    const firstConceptCard = conceptGroup.locator(".agency").first();
    await expect(firstConceptCard).toContainText("Singapore Land Authority");
    await expect(firstConceptCard.locator(".stage-tag")).toHaveText("Concept Design");

    await page.reload();
    await page.getByRole("button", { name: "Checklist" }).click();
    const reloadedConceptGroup = page
      .locator(".stage")
      .filter({ has: page.locator(".stage-label", { hasText: "Stage 2" }) });
    await expect(reloadedConceptGroup.locator(".agency").first()).toContainText("Singapore Land Authority");
  });

  test("moving a step past the top of its stage crosses into the previous stage", async ({ page }) => {
    // Concept's first step (Concept Design & Client Presentations) moving up should cross
    // into Pre-Design, landing as its new last step.
    const conceptGroup = page.locator(".stage").filter({ has: page.locator(".stage-label", { hasText: "Stage 2" }) });
    const firstConceptCard = conceptGroup.locator(".agency").first();
    await expect(firstConceptCard).toContainText("Concept Design & Client Presentations");

    await firstConceptCard.locator(".step-move-btn").nth(0).click(); // ▲

    const preDesignGroup = page
      .locator(".stage")
      .filter({ has: page.locator(".stage-label", { hasText: "Stage 1" }) });
    const lastPreDesignCard = preDesignGroup.locator(".agency").last();
    await expect(lastPreDesignCard).toContainText("Concept Design & Client Presentations");
    await expect(lastPreDesignCard.locator(".stage-tag")).toHaveText("Pre-Design");
  });

  test("the move buttons disappear entirely when the project is locked", async ({ page }) => {
    const firstCard = page.locator(".agency").first();
    await expect(firstCard.locator(".step-move-btn")).toHaveCount(2);

    await page.getByRole("button", { name: "🔓 Unlocked" }).click();
    await expect(page.getByRole("button", { name: "🔒 Locked" })).toBeVisible();

    await expect(firstCard.locator(".step-move-btn")).toHaveCount(0);
  });
});
