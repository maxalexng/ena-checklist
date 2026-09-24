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

  it("includeEmpty keeps every stage present, even ones with nothing in them", () => {
    const withEmpty = orderedStageGroups(null, {}, true);
    expect(withEmpty).toHaveLength(STAGES.length);
    expect(withEmpty.map((g) => g.stage.id)).toEqual(STAGES.map((s) => s.id));
  });
});

describe("moveStepInOrder", () => {
  const order = defaultStepOrder();
  const groups = orderedStageGroups(null, {}, true);
  // Pre-Design's 5 steps, in template order. Pre-Design is Stage 1 (nothing before it);
  // Concept is Stage 2, immediately after.
  const preDesignIds = groups.find((g) => g.stage.id === "pre-design")!.steps.map((s) => s.id);
  const conceptIds = groups.find((g) => g.stage.id === "concept")!.steps.map((s) => s.id);

  it("swaps a step down with its next same-stage neighbor, without changing its stage", () => {
    const [first, second] = preDesignIds;
    const result = moveStepInOrder(order, groups, first, 1)!;
    const firstIdx = result.order.indexOf(first);
    const secondIdx = result.order.indexOf(second);
    expect(secondIdx).toBe(firstIdx - 1);
    expect(result.stageId).toBeUndefined();
  });

  it("swaps a step up with its previous same-stage neighbor, without changing its stage", () => {
    const [first, second] = preDesignIds;
    const result = moveStepInOrder(order, groups, second, -1)!;
    const firstIdx = result.order.indexOf(first);
    const secondIdx = result.order.indexOf(second);
    expect(secondIdx).toBe(firstIdx - 1);
    expect(result.stageId).toBeUndefined();
  });

  it("returns null moving up from the very first step overall (nothing before Stage 1)", () => {
    expect(moveStepInOrder(order, groups, preDesignIds[0], -1)).toBeNull();
  });

  it("returns null moving down from the very last step overall (nothing after the last stage)", () => {
    const lastStageId = groups[groups.length - 1].stage.id;
    const lastGroupSteps = groups.find((g) => g.stage.id === lastStageId)!.steps;
    const veryLastStep = lastGroupSteps[lastGroupSteps.length - 1].id;
    expect(moveStepInOrder(order, groups, veryLastStep, 1)).toBeNull();
  });

  it("crosses into the next stage when moving down past the bottom of its own", () => {
    const last = preDesignIds[preDesignIds.length - 1];
    const result = moveStepInOrder(order, groups, last, 1)!;
    expect(result.stageId).toBe("concept");
    // Lands as the new first step of Concept — the caller is responsible for merging
    // stageId into the override map (moveStepInOrder itself doesn't touch it), so the
    // re-check below applies it explicitly rather than relying on each step's own default.
    const conceptNow = orderedStageGroups(result.order, { [last]: result.stageId! }, true).find(
      (g) => g.stage.id === "concept"
    )!;
    expect(conceptNow.steps[0].id).toBe(last);
  });

  it("crosses into the previous stage when moving up past the top of its own", () => {
    const first = conceptIds[0];
    const result = moveStepInOrder(order, groups, first, -1)!;
    expect(result.stageId).toBe("pre-design");
    // Lands as the new last step of Pre-Design (see note above on applying the override).
    const preDesignNow = orderedStageGroups(result.order, { [first]: result.stageId! }, true).find(
      (g) => g.stage.id === "pre-design"
    )!;
    expect(preDesignNow.steps[preDesignNow.steps.length - 1].id).toBe(first);
  });

  it("crossing into a stage a project has emptied out just sets the stage, order untouched", () => {
    // Empty out Concept by overriding all of its steps into some other stage.
    const overrides = Object.fromEntries(conceptIds.map((id) => [id, "csc"]));
    const emptiedGroups = orderedStageGroups(order, overrides, true);
    expect(emptiedGroups.find((g) => g.stage.id === "concept")!.steps).toHaveLength(0);

    const last = preDesignIds[preDesignIds.length - 1];
    const result = moveStepInOrder(order, emptiedGroups, last, 1)!;
    expect(result.stageId).toBe("concept");
    expect(result.order).toBe(order); // unchanged — nothing to anchor beside
  });

  it("returns null for an unknown step id", () => {
    expect(moveStepInOrder(order, groups, "not__a__step", 1)).toBeNull();
  });

  it("only touches the two swapped positions, leaving every other step's slot alone", () => {
    const [first, second] = preDesignIds;
    const result = moveStepInOrder(order, groups, first, 1)!;
    order.forEach((id, i) => {
      if (id !== first && id !== second) {
        expect(result.order[i]).toBe(id);
      }
    });
  });

  it("does not disturb another stage's relative order when steps are interleaved by a stage override", () => {
    // Force the second pre-design step ("moved") into "csc", so pre-design's remaining
    // members are no longer contiguous in the flat array — the swap must still only swap
    // the two same-stage steps' own positions, leaving "moved" (and everything else) put.
    const moved = preDesignIds[1];
    const overriddenGroups = orderedStageGroups(null, { [moved]: "csc" }, true);
    const preDesignNow = overriddenGroups.find((g) => g.stage.id === "pre-design")!.steps.map((s) => s.id);
    const [a, b] = preDesignNow;

    const aPos = order.indexOf(a);
    const bPos = order.indexOf(b);
    const movedPos = order.indexOf(moved);

    const result = moveStepInOrder(order, overriddenGroups, a, 1)!;
    expect(result.order[aPos]).toBe(b);
    expect(result.order[bPos]).toBe(a);
    expect(result.order[movedPos]).toBe(moved);
  });
});
