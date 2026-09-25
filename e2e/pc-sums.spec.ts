import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_PC_SUM_ITEMS } from "../src/template/pcSums";
import { adminClient, createTestProject, deleteProjectByReference, uniqueE2eReference } from "./helpers";

const STEP = "PC Sum Schedule & Client Selections";
const FIRST = DEFAULT_PC_SUM_ITEMS[0];

async function openStep(page: Page) {
  await page.getByRole("button", { name: "Checklist" }).click();
  await page.getByPlaceholder("Search checklist…").fill(STEP);
  await expect(page.getByRole("heading", { name: STEP }).first()).toBeVisible();
}

test.describe("PC sum schedule", () => {
  let reference: string;
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    reference = uniqueE2eReference("pc-sums");
    const project = await createTestProject({ reference, title: "PC Sums Test Project" });
    projectId = project.id;
    await page.goto(`/projects/${project.id}`);
    await openStep(page);
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

  test("a selection, supplier, allowance and confirmation persist across reload", async ({ page }) => {
    await page.getByLabel(`${FIRST} selection`).selectOption({ label: "Our recommendation" });
    await page.getByLabel(`${FIRST} supplier`).fill("Hansgrohe via Sanitary Supplies Pte Ltd");
    await page.getByLabel(`${FIRST} supplier`).blur();
    await page.getByLabel(`${FIRST} amount`).fill("S$18,500");
    await page.getByLabel(`${FIRST} amount`).blur();
    await expect(page.getByLabel(`${FIRST} amount`)).toHaveValue("18,500");
    await page.getByLabel(`${FIRST} confirmed by client`).check();
    await expect(page.locator(".pc-summary")).toContainText("1 of 18 decided · 1 confirmed by client");
    await expect(page.locator(".pc-summary")).toContainText("S$18,500");

    await page.reload();
    await openStep(page);
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
    await expect(page.locator(".pc-summary")).toContainText("0 of 17 decided");
  });

  test("rows can be added and removed", async ({ page }) => {
    await page.getByRole("button", { name: "+ Add PC sum" }).click();
    await expect(page.locator(".pc-row")).toHaveCount(19);
    const last = page.locator(".pc-item-input").last();
    await last.fill("Wine chiller");
    await last.blur();
    await expect(page.getByLabel("Wine chiller supplier")).toBeVisible();

    await page.getByRole("button", { name: "Remove Wine chiller" }).click();
    await expect(page.locator(".pc-row")).toHaveCount(18);
  });

  test("a project without PC sums can load the standard list", async ({ page }) => {
    const { error } = await adminClient().from("pc_sums").delete().eq("project_id", projectId);
    expect(error).toBeNull();
    await page.reload();
    await openStep(page);
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
