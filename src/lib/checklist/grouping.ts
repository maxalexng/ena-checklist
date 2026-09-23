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

/** Moves a step one place up/down within its own stage group, returning the new full
 * flat step_order array to persist (or null if there's no valid move — already at the
 * edge of its group, or the step/neighbor isn't in `order`). Pure and stage-aware: two
 * steps can be adjacent in `order` yet belong to different stage groups (once a step has
 * been dragged to a different stage), so the swap target is found via the *grouped* view,
 * not raw adjacency in the flat array — swapping their two positions in the flat array
 * (wherever they happen to sit) reorders them within their shared stage without disturbing
 * any other stage's relative order. */
export function moveStepInOrder(
  order: string[],
  groups: StageGroup[],
  stepId: string,
  direction: -1 | 1
): string[] | null {
  const group = groups.find((g) => g.steps.some((s) => s.id === stepId));
  if (!group) return null;
  const idx = group.steps.findIndex((s) => s.id === stepId);
  const neighborIdx = idx + direction;
  if (neighborIdx < 0 || neighborIdx >= group.steps.length) return null;
  const neighborId = group.steps[neighborIdx].id;

  const a = order.indexOf(stepId);
  const b = order.indexOf(neighborId);
  if (a === -1 || b === -1) return null;

  const next = [...order];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
