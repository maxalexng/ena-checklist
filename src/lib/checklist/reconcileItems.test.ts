import { describe, expect, it } from "vitest";
import { STEPS } from "@/template";
import { missingItemRows } from "./reconcileItems";

describe("missingItemRows", () => {
  it("returns nothing when every template item already exists", () => {
    const allKeys = STEPS.flatMap((s) => s.items.map((i) => i.id));
    expect(missingItemRows("proj-1", allKeys)).toEqual([]);
  });

  it("returns a row for every template item when nothing exists yet", () => {
    const total = STEPS.reduce((sum, s) => sum + s.items.length, 0);
    const rows = missingItemRows("proj-1", []);
    expect(rows.length).toBe(total);
    expect(rows.every((r) => r.project_id === "proj-1" && r.status === "pending" && r.na === false)).toBe(true);
  });

  it("returns only the item(s) actually missing, with the right step_key and agency_id", () => {
    const consultantsStep = STEPS.find((s) => s.isConsultantList)!;
    const missingItem = consultantsStep.items[0];
    // Everything except this one item is already "present".
    const allExceptOne = STEPS.flatMap((s) => s.items.map((i) => i.id)).filter((id) => id !== missingItem.id);

    const rows = missingItemRows("proj-2", allExceptOne);
    expect(rows).toEqual([
      {
        project_id: "proj-2",
        item_key: missingItem.id,
        step_key: consultantsStep.id,
        agency_id: consultantsStep.realId,
        status: "pending",
        na: false,
      },
    ]);
  });
});
