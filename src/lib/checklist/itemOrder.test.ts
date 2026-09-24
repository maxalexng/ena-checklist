import { describe, expect, it } from "vitest";
import { STEPS } from "@/template";
import { defaultItemOrder, effectiveItemOrder, moveItemInOrder, orderedStepItems } from "./itemOrder";

// A step with several items, so a move actually has somewhere to go. SITE/PREINV (step
// realId "site") has 6 items in the real template.
const multiItemStep = STEPS.find((s) => s.items.length >= 3)!;
const [itemA, itemB, itemC] = multiItemStep.items;

describe("defaultItemOrder", () => {
  it("lists every item across every step exactly once, in template order", () => {
    const order = defaultItemOrder();
    const expectedTotal = STEPS.reduce((sum, s) => sum + s.items.length, 0);
    expect(order.length).toBe(expectedTotal);
    expect(new Set(order).size).toBe(expectedTotal);
    expect(order.slice(0, multiItemStep.items.length + 10)).toEqual(
      expect.arrayContaining(multiItemStep.items.map((i) => i.id))
    );
  });
});

describe("effectiveItemOrder", () => {
  it("falls back to the default order when nothing is saved", () => {
    expect(effectiveItemOrder(null)).toEqual(defaultItemOrder());
  });

  it("reconciles a saved order: keeps valid entries, drops stale ones, appends new ones", () => {
    const saved = [itemB.id, "stale__item__99", itemA.id];
    const result = effectiveItemOrder(saved);
    expect(result[0]).toBe(itemB.id);
    expect(result[1]).toBe(itemA.id);
    expect(result).not.toContain("stale__item__99");
    expect(result).toContain(itemC.id);
  });
});

describe("orderedStepItems", () => {
  it("sorts a step's items by their position in the given flat order", () => {
    const order = effectiveItemOrder([itemC.id, itemB.id, itemA.id, ...defaultItemOrder()]);
    const sorted = orderedStepItems(multiItemStep, order);
    // The step has more than 3 items — only the first 3 were pulled to the front; the rest
    // keep their original relative order after them.
    expect(sorted.slice(0, 3).map((i) => i.id)).toEqual([itemC.id, itemB.id, itemA.id]);
    expect(sorted.length).toBe(multiItemStep.items.length);
  });

  it("only returns items belonging to this step", () => {
    const sorted = orderedStepItems(multiItemStep, defaultItemOrder());
    expect(sorted.every((i) => multiItemStep.items.some((si) => si.id === i.id))).toBe(true);
    expect(sorted.length).toBe(multiItemStep.items.length);
  });
});

describe("moveItemInOrder", () => {
  const order = defaultItemOrder();
  const stepItems = orderedStepItems(multiItemStep, order);

  it("swaps an item down with its next same-step neighbor", () => {
    const next = moveItemInOrder(order, stepItems, itemA.id, 1)!;
    const nextSorted = orderedStepItems(multiItemStep, next);
    expect(nextSorted.map((i) => i.id).slice(0, 2)).toEqual([itemB.id, itemA.id]);
  });

  it("swaps an item up with its previous same-step neighbor", () => {
    const next = moveItemInOrder(order, stepItems, itemB.id, -1)!;
    const nextSorted = orderedStepItems(multiItemStep, next);
    expect(nextSorted.map((i) => i.id).slice(0, 2)).toEqual([itemB.id, itemA.id]);
  });

  it("returns null moving the first item up, or the last item down", () => {
    expect(moveItemInOrder(order, stepItems, stepItems[0].id, -1)).toBeNull();
    expect(moveItemInOrder(order, stepItems, stepItems[stepItems.length - 1].id, 1)).toBeNull();
  });

  it("returns null for an item id not present", () => {
    expect(moveItemInOrder(order, stepItems, "not__a__real__id", 1)).toBeNull();
  });

  it("only touches the two swapped positions in the flat array", () => {
    const next = moveItemInOrder(order, stepItems, itemA.id, 1)!;
    const changed = order
      .map((id, i) => (id !== next[i] ? i : -1))
      .filter((i) => i !== -1);
    expect(changed.length).toBe(2);
  });
});
