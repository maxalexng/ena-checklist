import { expect, test } from "@playwright/test";
import { createTestProject, deleteProjectByReference, uniqueE2eReference } from "./helpers";

// Optimistic updates (useChecklistMutations.ts's useProjectMutation) patch the cache the
// instant you click, before the network round trip — so a fast run of clicks on the same
// control each see the previous click's result immediately, instead of the button briefly
// reading stale state while a refetch is still in flight. These tests fire clicks back to
// back, with no wait in between, to prove that actually holds.
test.describe("Rapid clicking stays correct and responsive", () => {
  let reference: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("fastclick");
    const project = await createTestProject({ reference, title: "Fast Clicking Test Project" });
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Checklist" }).click();
    await page.getByPlaceholder("Search checklist…").fill("Topographic survey");
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("three back-to-back clicks on a status chip advance it all the way to Cleared", async ({ page }) => {
    const statusBtn = page.locator(".item").first().locator(".status-chip");
    await expect(statusBtn).toHaveText("Not started");

    await statusBtn.click();
    await statusBtn.click();
    await statusBtn.click();

    await expect(statusBtn).toHaveText("Cleared");
  });

  test("clicking N/A on several items back-to-back marks all of them, not just the last", async ({ page }) => {
    const items = page.locator(".item");
    const count = await items.count();

    for (let i = 0; i < count; i++) {
      await items.nth(i).locator(".na-toggle").click();
    }

    for (let i = 0; i < count; i++) {
      await expect(items.nth(i)).toHaveClass(/is-na/);
    }
  });

  test("clicking a status chip back and forth several times lands on the expected status", async ({ page }) => {
    const statusBtn = page.locator(".item").first().locator(".status-chip");
    // pending -> progress -> submitted -> cleared -> pending -> progress: 5 clicks, 4-cycle.
    for (let i = 0; i < 5; i++) {
      await statusBtn.click();
    }
    await expect(statusBtn).toHaveText("In progress");
  });
});
