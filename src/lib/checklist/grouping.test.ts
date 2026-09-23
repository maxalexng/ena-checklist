import { describe, expect, it } from "vitest";
import { STAGES, STEPS, defaultStepOrder } from "@/template";
import { effectiveStepOrder, flattenSteps, orderedStageGroups, stageOfStep } from "./grouping";

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
