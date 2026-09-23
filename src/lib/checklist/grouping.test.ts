import { describe, expect, it } from "vitest";
import { STAGES, STEPS, defaultStepOrder } from "@/template";
import { effectiveStepOrder, flattenSteps, moveStepInOrder, orderedStageGroups, stageOfStep } from "./grouping";

describe("effectiveStepOrder", () => {
  it("returns the full template default order when nothing is saved", () => {
    expect(effectiveStepOrder(null)).toEqual(defaultStepOrder());
    expect(effectiveStepOrder([])).toEqual(defaultStepOrder());
  });

  it("reconciles a saved order against the current template", () => {
    const saved = [STEPS[2].id, STEPS[0].id];
    const result = effectiveStepOrder(saved);
    expect(result[0]).toBe(STEPS[2].id);
    expect(result[1]).toBe(STEPS[0].id);
    expect(result).toHaveLength(STEPS.length);
  });
});

describe("stageOfStep", () => {
  it("uses the step's own default stage when there's no override", () => {
    const step = STEPS[0];
    expect(stageOfStep(step, {})).toBe(step.defaultStage);
  });

  it("uses the project's override when the step was dragged to a different stage", () => {
    const step = STEPS[0];
    expect(stageOfStep(step, { [step.id]: "csc" })).toBe("csc");
  });
});

describe("orderedStageGroups", () => {
  it("covers every step across all groups exactly once", () => {
    const groups = orderedStageGroups(null, {});
    const flat = flattenSteps(groups);
    expect(flat).toHaveLength(STEPS.length);
    expect(new Set(flat.map((s) => s.id)).size).toBe(STEPS.length);
  });

  it("orders groups by stage order and omits empty stages", () => {
    const groups = orderedStageGroups(null, {});
    const stageIds = groups.map((g) => g.stage.id);
    const expectedOrder = STAGES.map((s) => s.id).filter((id) => stageIds.includes(id));
    expect(stageIds).toEqual(expectedOrder);
  });

  it("moves a step into its overridden stage's group", () => {
    const step = STEPS.find((s) => s.defaultStage !== "csc")!;
    const groups = orderedStageGroups(null, { [step.id]: "csc" });
    const cscGroup = groups.find((g) => g.stage.id === "csc")!;
    expect(cscGroup.steps.map((s) => s.id)).toContain(step.id);

    const originalGroup = groups.find((g) => g.stage.id === step.defaultStage);
    expect(originalGroup?.steps.map((s) => s.id)).not.toContain(step.id);
  });
});

describe("moveStepInOrder", () => {
  const order = defaultStepOrder();
  const groups = orderedStageGroups(null, {});
  // Pre-Design's 5 steps, in template order.
  const preDesignIds = groups.find((g) => g.stage.id === "pre-design")!.steps.map((s) => s.id);

  it("swaps a step down with its next same-stage neighbor", () => {
    const [first, second] = preDesignIds;
    const next = moveStepInOrder(order, groups, first, 1)!;
    const firstIdx = next.indexOf(first);
    const secondIdx = next.indexOf(second);
    expect(secondIdx).toBe(firstIdx - 1);
  });

  it("swaps a step up with its previous same-stage neighbor", () => {
    const [first, second] = preDesignIds;
    const next = moveStepInOrder(order, groups, second, -1)!;
    const firstIdx = next.indexOf(first);
    const secondIdx = next.indexOf(second);
    expect(secondIdx).toBe(firstIdx - 1);
  });

  it("returns null when already first in its stage group and moving up", () => {
    expect(moveStepInOrder(order, groups, preDesignIds[0], -1)).toBeNull();
  });

  it("returns null when already last in its stage group and moving down", () => {
    const last = preDesignIds[preDesignIds.length - 1];
    expect(moveStepInOrder(order, groups, last, 1)).toBeNull();
  });

  it("returns null for an unknown step id", () => {
    expect(moveStepInOrder(order, groups, "not__a__step", 1)).toBeNull();
  });

  it("only touches the two swapped positions, leaving every other step's slot alone", () => {
    const [first, second] = preDesignIds;
    const next = moveStepInOrder(order, groups, first, 1)!;
    order.forEach((id, i) => {
      if (id !== first && id !== second) {
        expect(next[i]).toBe(id);
      }
    });
  });

  it("does not disturb another stage's relative order when steps are interleaved by a stage override", () => {
    // Force the second pre-design step ("moved") into "csc", so pre-design's remaining
    // members are no longer contiguous in the flat array — the swap must still only swap
    // the two same-stage steps' own positions, leaving "moved" (and everything else) put.
    const moved = preDesignIds[1];
    const overriddenGroups = orderedStageGroups(null, { [moved]: "csc" });
    const preDesignNow = overriddenGroups.find((g) => g.stage.id === "pre-design")!.steps.map((s) => s.id);
    const [a, b] = preDesignNow;

    const aPos = order.indexOf(a);
    const bPos = order.indexOf(b);
    const movedPos = order.indexOf(moved);

    const next = moveStepInOrder(order, overriddenGroups, a, 1)!;
    expect(next[aPos]).toBe(b);
    expect(next[bPos]).toBe(a);
    expect(next[movedPos]).toBe(moved);
  });
});
