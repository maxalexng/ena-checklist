import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_PC_SUM_ITEMS } from "../src/template/pcSums";
import { adminClient, createTestProject, deleteProjectByReference, uniqueE2eReference } from "./helpers";

const STEP = "PC Sum Schedule & Client Selections";
const FIRST = DEFAULT_PC_SUM_ITEMS[0];
const N = DEFAULT_PC_SUM_ITEMS.length;

async function openStep(page: Page) {
  await page.getByRole("button", { name: "Checklist" }).click();
  await page.getByPlaceholder("Search checklist…").fill(STEP);
  await expect(page.getByRole("heading", { name: STEP }).first()).toBeVisible();
}

async function openTab(page: Page) {
  await page.getByRole("button", { name: "PC Sums", exact: true }).click();
  await expect(page.getByRole("heading", { name: STEP })).toBeVisible();
}

test.describe("PC sum schedule", () => {
  let reference: string;
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("pc-sums");
    const project = await createTestProject({ reference, title: "PC Sums Test Project" });
    projectId = project.id;
    await page.goto(`/projects/${project.id}`);
    await openTab(page);
  });

  test.afterEach(async () => {
    await deleteProjectByReference(reference);
  });

  test("a new project starts with the standard PC sum list", async ({ page }) => {
    await expect(page.locator(".pc-row")).toHaveCount(DEFAULT_PC_SUM_ITEMS.length);
    await expect(page.locator(".pc-item-input").first()).toHaveValue(FIRST);
    await expect(page.locator(".pc-summary")).toHaveText(
      `0 of ${DEFAULT_PC_SUM_ITEMS.length} decided · 0 confirmed by client · Total allowances S$0 (${DEFAULT_PC_SUM_ITEMS.length} not priced yet)`
    );
  });

  test("the checklist step shows the roll-up and links to the PC Sums tab", async ({ page }) => {
    await openStep(page);
    const step = page.locator("#step-admin__PCSUMS");
    await expect(step.locator(".pc-row")).toHaveCount(0);
    await expect(step.locator(".pc-summary")).toHaveText(
      `0 of ${DEFAULT_PC_SUM_ITEMS.length} decided · 0 confirmed by client · Total allowances S$0 (${DEFAULT_PC_SUM_ITEMS.length} not priced yet)`
    );

    await step.getByRole("button", { name: "Open the PC sum schedule →" }).click();
    await expect(page.getByRole("heading", { name: STEP })).toBeVisible();
    await expect(page.locator(".pc-row")).toHaveCount(DEFAULT_PC_SUM_ITEMS.length);
  });

  test("specified in contract counts as decided, hides the allowance and leaves it out of the total", async ({
    page,
  }) => {
    const amount = page.getByLabel(`${FIRST} amount`);
    await amount.fill("5,000");
    await amount.blur();
    await expect(page.locator(".pc-summary")).toContainText("Total allowances S$5,000");

    await page.getByLabel(`${FIRST} selection`).selectOption({ label: "Specified in contract" });
    await expect(amount).toHaveText("In contract");
    await expect(page.locator(".pc-summary")).toHaveText(
      `1 of ${N} decided · 0 confirmed by client · 1 specified in contract · Total allowances S$0 (${N - 1} not priced yet)`
    );

    await page.reload();
    await openTab(page);
    await expect(page.getByLabel(`${FIRST} selection`)).toHaveValue("contract");

    // Switching back to a PC sum brings the saved allowance back.
    await page.getByLabel(`${FIRST} selection`).selectOption({ label: "Client's choice" });
    await expect(page.getByLabel(`${FIRST} amount`)).toHaveValue("5,000");
    await expect(page.locator(".pc-summary")).toContainText("Total allowances S$5,000");
  });

  test("a selection, supplier, allowance and confirmation persist across reload", async ({ page }) => {
    await page.getByLabel(`${FIRST} selection`).selectOption({ label: "Our recommendation" });
    await page.getByLabel(`${FIRST} supplier`).fill("Hansgrohe via Sanitary Supplies Pte Ltd");
    await page.getByLabel(`${FIRST} supplier`).blur();
    await page.getByLabel(`${FIRST} amount`).fill("S$18,500");
    await page.getByLabel(`${FIRST} amount`).blur();
    await expect(page.getByLabel(`${FIRST} amount`)).toHaveValue("18,500");
    await page.getByLabel(`${FIRST} confirmed by client`).check();
    await expect(page.locator(".pc-summary")).toContainText(`1 of ${N} decided · 1 confirmed by client`);
    await expect(page.locator(".pc-summary")).toContainText("S$18,500");

    await page.reload();
    await openTab(page);
    await expect(page.getByLabel(`${FIRST} selection`)).toHaveValue("recommended");
    await expect(page.getByLabel(`${FIRST} supplier`)).toHaveValue("Hansgrohe via Sanitary Supplies Pte Ltd");
    await expect(page.getByLabel(`${FIRST} amount`)).toHaveValue("18,500");
    await expect(page.getByLabel(`${FIRST} confirmed by client`)).toBeChecked();
  });

  test("an invalid allowance is flagged and not saved; N/A drops a row from the totals", async ({ page }) => {
    const amount = page.getByLabel(`${FIRST} amount`);
    await amount.fill("about 5k");
    await amount.blur();
    await expect(amount).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".pc-summary")).toContainText("Total allowances S$0");

    await page.getByLabel(`${FIRST} not applicable`).check();
    await expect(page.locator(".pc-row").first()).toHaveClass(/pc-row-na/);
    await expect(page.locator(".pc-summary")).toContainText(`0 of ${N - 1} decided`);
  });

  test("clicking quickly down the confirmed column never flickers a tick back off", async ({ page }) => {
    const rows = DEFAULT_PC_SUM_ITEMS.slice(0, 6);
    const boxes = rows.map((item) => page.getByLabel(`${item} confirmed by client`));

    // Slow each save down like a laggy connection, so a click's save is still in flight when
    // the one before it finishes and refetches.
    await page.route(/\/rest\/v1\/pc_sums/, async (route) => {
      if (route.request().method() === "PATCH") await new Promise((r) => setTimeout(r, 700));
      await route.continue();
    });

    // Watch every frame for a ticked box going unticked, which is what an early refetch
    // (landing before a later click was saved) used to do.
    await page.evaluate((labels) => {
      const w = window as unknown as { __pcFlicker: string[] };
      w.__pcFlicker = [];
      const seen = new Set<string>();
      const tick = () => {
        for (const label of labels) {
          const box = document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`);
          if (box?.checked) seen.add(label);
          else if (seen.has(label)) w.__pcFlicker.push(label);
        }
        requestAnimationFrame(tick);
      };
      tick();
    }, rows.map((item) => `${item} confirmed by client`));

    let savesDone = 0;
    page.on("response", (res) => {
      if (/\/rest\/v1\/pc_sums/.test(res.url()) && res.request().method() === "PATCH") savesDone++;
    });

    // At a person's pace: each earlier save finishes and refetches while the next is in flight.
    for (const box of boxes) {
      await box.click();
      await page.waitForTimeout(400);
    }
    await expect(page.locator(".pc-summary")).toContainText("6 confirmed by client");
    // Reloading with a (deliberately delayed) save still held back would cancel it.
    await expect.poll(() => savesDone).toBe(rows.length);
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => (window as unknown as { __pcFlicker: string[] }).__pcFlicker)).toEqual([]);

    await page.reload();
    await openTab(page);
    for (const box of boxes) await expect(box).toBeChecked();
  });

  test("rows can be added and removed", async ({ page }) => {
    await page.getByRole("button", { name: "+ Add PC sum" }).click();
    await expect(page.locator(".pc-row")).toHaveCount(N + 1);
    const last = page.locator(".pc-item-input").last();
    await last.fill("Wine chiller");
    await last.blur();
    await expect(page.getByLabel("Wine chiller supplier")).toBeVisible();

    await page.getByRole("button", { name: "Remove Wine chiller" }).click();
    await expect(page.locator(".pc-row")).toHaveCount(N);
  });

  test("a project without PC sums can load the standard list", async ({ page }) => {
    const { error } = await adminClient().from("pc_sums").delete().eq("project_id", projectId);
    expect(error).toBeNull();
    await page.reload();
    await openTab(page);
    await expect(page.getByText("No PC sums on this project yet.")).toBeVisible();

    // Locked, the load button is hidden, so the empty state says how to get it back.
    await page.getByRole("button", { name: "🔓 Unlocked" }).click();
    await expect(page.getByText("Unlock the project to load the standard PC sum list.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Load the standard PC sum list" })).toHaveCount(0);
    await page.getByRole("button", { name: "🔒 Locked" }).click();
    await expect(page.getByText("Unlock the project to load the standard PC sum list.")).toHaveCount(0);

    await page.getByRole("button", { name: "Load the standard PC sum list" }).click();
    await expect(page.locator(".pc-row")).toHaveCount(DEFAULT_PC_SUM_ITEMS.length);
  });

  test("locking the project disables the schedule", async ({ page }) => {
    await page.getByRole("button", { name: "🔓 Unlocked" }).click();
    await expect(page.getByRole("button", { name: "🔒 Locked" })).toBeVisible();

    await expect(page.getByRole("button", { name: "+ Add PC sum" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: `Remove ${FIRST}` })).toHaveCount(0);
    await expect(page.getByLabel(`${FIRST} selection`)).toBeDisabled();
    await expect(page.getByLabel(`${FIRST} amount`)).toBeDisabled();
    await expect(page.getByLabel(`${FIRST} confirmed by client`)).toBeDisabled();
  });
});
