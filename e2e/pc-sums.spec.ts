import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_PC_SUMS, DEFAULT_PC_SUM_ITEMS, PC_SUM_PHASES } from "../src/template/pcSums";
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

// The first of the two roll-up lines on the tab (the second is the awards line).
function summaryLine(page: Page) {
  return page.locator(".pc-summary").first();
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
    await expect(summaryLine(page)).toHaveText(
      `0 of ${DEFAULT_PC_SUM_ITEMS.length} decided · 0 confirmed by client · Total allowances S$0 (${DEFAULT_PC_SUM_ITEMS.length} not priced yet)`
    );
  });

  test("the checklist step shows the roll-up and links to the PC Sums tab", async ({ page }) => {
    await openStep(page);
    const step = page.locator("#step-admin__PCSUMS");
    await expect(step.locator(".pc-row")).toHaveCount(0);
    await expect(step.locator(".pc-summary")).toHaveText(
      `0 of ${N} decided · 0 confirmed by client · Total allowances S$0 (${N} not priced yet) · Nothing awarded yet`
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
    await expect(summaryLine(page)).toContainText("Total allowances S$5,000");

    await page.getByLabel(`${FIRST} selection`).selectOption({ label: "Specified in contract" });
    await expect(amount).toHaveText("In contract");
    await expect(summaryLine(page)).toHaveText(
      `1 of ${N} decided · 0 confirmed by client · 1 specified in contract · Total allowances S$0 (${N - 1} not priced yet)`
    );

    await page.reload();
    await openTab(page);
    await expect(page.getByLabel(`${FIRST} selection`)).toHaveValue("contract");

    // Switching back to a PC sum brings the saved allowance back.
    await page.getByLabel(`${FIRST} selection`).selectOption({ label: "Client's choice" });
    await expect(page.getByLabel(`${FIRST} amount`)).toHaveValue("5,000");
    await expect(summaryLine(page)).toContainText("Total allowances S$5,000");
  });

  test("the schedule is grouped by phase in site order, with early-prep notes", async ({ page }) => {
    const phases = page.locator("tbody.pc-phase");
    await expect(phases).toHaveCount(PC_SUM_PHASES.length);
    for (const [i, phase] of PC_SUM_PHASES.entries()) {
      const group = phases.nth(i);
      await expect(group).toHaveAttribute("data-phase", phase.id);
      await expect(group.locator(".pc-phase-name")).toHaveText(phase.name);
      const items = DEFAULT_PC_SUMS.filter((d) => d.phase === phase.id).map((d) => d.item);
      await expect(group.locator(".pc-item-input")).toHaveCount(items.length);
      for (const [j, item] of items.entries()) await expect(group.locator(".pc-item-input").nth(j)).toHaveValue(item);
    }
    await expect(page.getByLabel("Sanitary Wares & Fittings note")).toHaveValue(/^Early prep: Concealed mixers/);
  });

  test("rows move within their phase, and changing a row's phase moves it to that group", async ({ page }) => {
    const structure = page.locator('tbody[data-phase="structure"]');
    const firstFix = page.locator('tbody[data-phase="firstFix"]');
    const lastStructure = DEFAULT_PC_SUMS.filter((d) => d.phase === "structure").at(-1)!.item;
    await expect(page.getByRole("button", { name: `Move ${FIRST} up`, exact: true })).toBeDisabled();
    // The last row of a phase can't move down into the next phase.
    await expect(page.getByRole("button", { name: `Move ${lastStructure} down`, exact: true })).toBeDisabled();

    await page.getByRole("button", { name: "Move Swimming Pool System up", exact: true }).click();
    await expect(structure.locator(".pc-item-input").first()).toHaveValue("Swimming Pool System");

    await page.getByRole("button", { name: "Show quotes for Wine Cellar", exact: true }).click();
    await page.getByLabel("Wine Cellar phase").selectOption({ label: "M&E first fix" });
    await expect(structure.getByLabel("Wine Cellar selection")).toHaveCount(0);
    await expect(firstFix.getByLabel("Wine Cellar selection")).toBeVisible();

    await page.reload();
    await openTab(page);
    await expect(structure.locator(".pc-item-input").first()).toHaveValue("Swimming Pool System");
    await expect(firstFix.getByLabel("Wine Cellar selection")).toBeVisible();
  });

  test("quotes, the recommended star and the award track against the allowance", async ({ page }) => {
    await page.getByLabel(`${FIRST} amount`, { exact: true }).fill("10,000");
    await page.getByLabel(`${FIRST} amount`, { exact: true }).blur();

    await page.getByRole("button", { name: `Show quotes for ${FIRST}`, exact: true }).click();
    await expect(page.getByLabel(`${FIRST} awarded to`)).toBeDisabled();
    for (const [i, [supplier, amount]] of [
      ["BeLift Pte Ltd", "11,000"],
      ["Eastern Lifts", "9,200"],
    ].entries()) {
      await page.getByRole("button", { name: "+ Add quote" }).click();
      const q = `${FIRST} quote ${i + 1}`;
      await page.getByLabel(`${q} supplier`).fill(supplier);
      await page.getByLabel(`${q} supplier`).blur();
      await page.getByLabel(`${q} amount`).fill(amount);
      await page.getByLabel(`${q} amount`).blur();
      await expect(page.getByLabel(`${q} amount`)).toHaveValue(amount);
    }

    // Only one quote carries the star at a time.
    await page.getByRole("button", { name: `${FIRST} quote 2 recommended` }).click();
    await page.getByRole("button", { name: `${FIRST} quote 1 recommended` }).click();
    await expect(page.getByRole("button", { name: `${FIRST} quote 1 recommended` })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: `${FIRST} quote 2 recommended` })).toHaveAttribute("aria-pressed", "false");

    // Awarding to a quote fills in the awarded amount from it.
    await page.getByLabel(`${FIRST} awarded to`).selectOption({ label: "Eastern Lifts — S$9,200" });
    await expect(page.getByLabel(`${FIRST} awarded amount`)).toHaveValue("9,200");
    await expect(page.getByLabel(`${FIRST} variance`)).toHaveText("−S$800");
    await expect(page.locator(".pc-award-summary")).toHaveText(
      `Awarded S$9,200 on 1 of ${N} items · S$800 under the allowances`
    );
    await expect(page.locator(".pc-row").first().locator(".pc-subline")).toHaveText(
      "2 quotes · recommended: BeLift Pte Ltd · awarded: Eastern Lifts"
    );

    await page.reload();
    await openTab(page);
    await expect(page.getByLabel(`${FIRST} awarded amount`)).toHaveValue("9,200");
    await page.getByRole("button", { name: `Show quotes for ${FIRST}`, exact: true }).click();
    await expect(page.getByLabel(`${FIRST} quote 2 supplier`)).toHaveValue("Eastern Lifts");
    await expect(page.getByLabel(`${FIRST} awarded to`)).toHaveValue(/.+/);
    await expect(page.getByRole("button", { name: `${FIRST} quote 1 recommended` })).toHaveAttribute("aria-pressed", "true");

    // A negotiated figure over the allowance shows as over budget.
    await page.getByLabel(`${FIRST} awarded amount`).fill("10,500");
    await page.getByLabel(`${FIRST} awarded amount`).blur();
    await expect(page.getByLabel(`${FIRST} variance`)).toHaveText("+S$500");
    await expect(page.locator(".pc-award-summary")).toHaveText(
      `Awarded S$10,500 on 1 of ${N} items · S$500 over the allowances`
    );

    // Removing the awarded quote clears who it went to but keeps the amount.
    await page.getByRole("button", { name: `Remove ${FIRST} quote 2` }).click();
    await expect(page.getByLabel(`${FIRST} quote 2 supplier`)).toHaveCount(0);
    await expect(page.getByLabel(`${FIRST} awarded to`)).toHaveValue("");
    await expect(page.getByLabel(`${FIRST} awarded amount`)).toHaveValue("10,500");
  });

  test("a selection, allowance and confirmation persist across reload", async ({ page }) => {
    await page.getByLabel(`${FIRST} selection`).selectOption({ label: "Our recommendation" });
    await page.getByLabel(`${FIRST} amount`).fill("S$18,500");
    await page.getByLabel(`${FIRST} amount`).blur();
    await expect(page.getByLabel(`${FIRST} amount`)).toHaveValue("18,500");
    await page.getByLabel(`${FIRST} confirmed by client`).check();
    await expect(summaryLine(page)).toContainText(`1 of ${N} decided · 1 confirmed by client`);
    await expect(summaryLine(page)).toContainText("S$18,500");

    await page.reload();
    await openTab(page);
    await expect(page.getByLabel(`${FIRST} selection`)).toHaveValue("recommended");
    await expect(page.getByLabel(`${FIRST} amount`)).toHaveValue("18,500");
    await expect(page.getByLabel(`${FIRST} confirmed by client`)).toBeChecked();
  });

  test("an invalid allowance is flagged and not saved; N/A drops a row from the totals", async ({ page }) => {
    const amount = page.getByLabel(`${FIRST} amount`);
    await amount.fill("about 5k");
    await amount.blur();
    await expect(amount).toHaveAttribute("aria-invalid", "true");
    await expect(summaryLine(page)).toContainText("Total allowances S$0");

    await page.getByLabel(`${FIRST} not applicable`).check();
    await expect(page.locator(".pc-row").first()).toHaveClass(/pc-row-na/);
    await expect(summaryLine(page)).toContainText(`0 of ${N - 1} decided`);
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
    await expect(summaryLine(page)).toContainText("6 confirmed by client");
    // Reloading with a (deliberately delayed) save still held back would cancel it.
    await expect.poll(() => savesDone).toBe(rows.length);
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => (window as unknown as { __pcFlicker: string[] }).__pcFlicker)).toEqual([]);

    await page.reload();
    await openTab(page);
    for (const box of boxes) await expect(box).toBeChecked();
  });

  test("rows can be added and removed", async ({ page }) => {
    await page.getByRole("button", { name: "Add PC sum to Envelope" }).click();
    await expect(page.locator(".pc-row")).toHaveCount(N + 1);
    const last = page.locator('tbody[data-phase="envelope"] .pc-item-input').last();
    await expect(last).toHaveValue("");
    await last.fill("Wine chiller");
    await last.blur();
    await expect(page.getByLabel("Wine chiller selection")).toBeVisible();

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

    await expect(page.getByRole("button", { name: /^Add PC sum to / })).toHaveCount(0);
    await expect(page.getByRole("button", { name: `Remove ${FIRST}` })).toHaveCount(0);
    await page.getByRole("button", { name: `Show quotes for ${FIRST}`, exact: true }).click();
    await expect(page.getByRole("button", { name: "+ Add quote" })).toHaveCount(0);
    await expect(page.getByLabel(`${FIRST} phase`)).toBeDisabled();
    await expect(page.getByLabel(`${FIRST} awarded amount`)).toBeDisabled();
    await expect(page.getByLabel(`${FIRST} selection`)).toBeDisabled();
    await expect(page.getByLabel(`${FIRST} amount`)).toBeDisabled();
    await expect(page.getByLabel(`${FIRST} confirmed by client`)).toBeDisabled();
  });
});
