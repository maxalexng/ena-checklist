import { expect, test } from "@playwright/test";
import {
  adminClient,
  createTestProject,
  deleteProjectByReference,
  resetSharedStepOrder,
  uniqueE2eReference,
} from "./helpers";

test.describe("Next to-do and Top buttons", () => {
  let reference: string;
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    await resetSharedStepOrder();
    reference = uniqueE2eReference("next-todo");
    const project = await createTestProject({ reference, title: "Next To-do Test Project" });
    projectId = project.id;
    await page.goto(`/projects/${project.id}`);
    await page.getByRole("button", { name: "Checklist" }).click();
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("each click walks to the next to-do item, then Top scrolls back up", async ({ page }) => {
    // Leave just two to-dos, far apart in on-screen order, and clear everything else.
    const ids = await page.locator(".content .item[id^='item-']").evaluateAll((els) => els.map((el) => el.id));
    const first = ids[3].slice("item-".length);
    const second = ids[ids.length - 5].slice("item-".length);
    const supabase = adminClient();
    await supabase.from("checklist_items").update({ status: "cleared" }).eq("project_id", projectId);
    await supabase
      .from("checklist_items")
      .update({ status: "pending" })
      .eq("project_id", projectId)
      .in("item_key", [first, second]);
    await page.reload();
    await page.getByRole("button", { name: "Checklist" }).click();

    // Collapsed steps open up when the jump lands inside them.
    await page.getByRole("button", { name: "Collapse all" }).click();

    const next = page.locator(".checklist-fabs .fab");
    const top = page.getByRole("button", { name: "↑ Top" });

    await next.click();
    await expect(page.locator(`[id="item-${first}"]`)).toBeInViewport();

    // The buttons float, so they're still in reach after scrolling down.
    await next.click();
    await expect(page.locator(`[id="item-${second}"]`)).toBeInViewport();
    await expect(next).toBeInViewport();
    await expect(top).toBeInViewport();

    await next.click();
    await expect(next).toHaveText("✓ No more to-dos");

    // After the last one, the walk starts over from the top.
    await expect(next).toHaveText("⏭ Next to-do");
    await next.click();
    await expect(page.locator(`[id="item-${first}"]`)).toBeInViewport();

    await page.locator(`[id="item-${second}"]`).scrollIntoViewIfNeeded();
    await top.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("Top, the lock and Next to-do stack in that order, all the same width", async ({ page }) => {
    const boxes = await Promise.all(
      [
        page.getByRole("button", { name: "↑ Top" }),
        page.getByRole("button", { name: "🔓 Unlocked" }),
        page.getByRole("button", { name: "⏭ Next to-do" }),
      ].map(async (button) => (await button.boundingBox())!)
    );
    expect(boxes[0].y).toBeLessThan(boxes[1].y);
    expect(boxes[1].y + boxes[1].height).toBeLessThan(boxes[2].y);
    for (const box of boxes) {
      expect(box.width).toBe(boxes[0].width);
      expect(box.x).toBe(boxes[0].x);
    }
    // Evenly spaced, with the same gap above and below the lock.
    expect(boxes[1].y - boxes[0].y).toBeCloseTo(boxes[2].y - boxes[1].y, 0);
  });

  test("says all caught up when nothing is left to do", async ({ page }) => {
    await adminClient().from("checklist_items").update({ status: "cleared" }).eq("project_id", projectId);
    await page.reload();
    await page.getByRole("button", { name: "Checklist" }).click();

    await page.locator(".checklist-fabs .fab").click();
    await expect(page.locator(".checklist-fabs .fab")).toHaveText("✓ All caught up");
  });
});
