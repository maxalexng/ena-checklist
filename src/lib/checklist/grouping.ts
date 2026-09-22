import { STAGES, STEP_BY_ID, STEPS, defaultStepOrder, reconcileOrder } from "@/template";
import type { StageId, TemplateStep } from "@/template";

/** Effective order of steps for a project: its own saved order (if any), reconciled
 * against the current template (drops stale ids, appends new template steps at the end). */
export function effectiveStepOrder(savedOrder: string[] | null): string[] {
  const valid = defaultStepOrder();
  if (!savedOrder || savedOrder.length === 0) return valid;
  return reconcileOrder(savedOrder, valid);
}

/** A step's effective stage: the project's own override if it was ever dragged out of its
 * default, otherwise the template's default stage for that step. */
export function stageOfStep(step: TemplateStep, stepStageOverrides: Record<string, string>): StageId {
  const override = stepStageOverrides[step.id];
  return (override as StageId) || step.defaultStage;
}

export interface StageGroup {
  stage: (typeof STAGES)[number];
  steps: TemplateStep[];
}

/** Groups steps by their effective stage, in stage order, honoring the project's own step
 * order within each stage. Mirrors the prototype's orderedStageList(). */
export function orderedStageGroups(
  savedOrder: string[] | null,
  stepStageOverrides: Record<string, string>
): StageGroup[] {
  const order = effectiveStepOrder(savedOrder);
  const byStage: Record<string, TemplateStep[]> = {};
  order.forEach((id) => {
    const step = STEP_BY_ID[id];
    if (!step) return;
    const stageId = stageOfStep(step, stepStageOverrides);
    (byStage[stageId] ||= []).push(step);
  });
  return STAGES.map((stage) => ({ stage, steps: byStage[stage.id] || [] })).filter(
    (g) => g.steps.length > 0
  );
}

export function flattenSteps(groups: StageGroup[]): TemplateStep[] {
  return groups.flatMap((g) => g.steps);
}

export const ALL_STEPS = STEPS;
