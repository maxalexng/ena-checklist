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
 * order within each stage. Mirrors the prototype's orderedStageList(). By default omits
 * stages with no steps in them (nothing to render); pass includeEmpty for callers that need
 * every stage slot to exist regardless — e.g. moveStepInOrder crossing into a stage that
 * currently has nothing in it. */
export function orderedStageGroups(
  savedOrder: string[] | null,
  stepStageOverrides: Record<string, string>,
  includeEmpty = false
): StageGroup[] {
  const order = effectiveStepOrder(savedOrder);
  const byStage: Record<string, TemplateStep[]> = {};
  order.forEach((id) => {
    const step = STEP_BY_ID[id];
    if (!step) return;
    const stageId = stageOfStep(step, stepStageOverrides);
    (byStage[stageId] ||= []).push(step);
  });
  const groups = STAGES.map((stage) => ({ stage, steps: byStage[stage.id] || [] }));
  return includeEmpty ? groups : groups.filter((g) => g.steps.length > 0);
}

export function flattenSteps(groups: StageGroup[]): TemplateStep[] {
  return groups.flatMap((g) => g.steps);
}

export const ALL_STEPS = STEPS;

export interface StepMoveResult {
  order: string[];
  /** Set only when the move actually crosses into a different stage — the caller should
   * merge this into the project's step_stage override map alongside persisting `order`. */
  stageId?: StageId;
}

/** Moves a step one place up/down. Within its own stage, that's a same-stage swap with its
 * neighbor. At the edge of its stage, it instead crosses into the adjacent stage — moving up
 * from the top of a stage lands as the last step of the previous one, moving down from the
 * bottom lands as the first step of the next one — so a step can be dragged into any stage
 * just by holding the same arrow. Returns null only when there's truly nowhere to go: moving
 * up from the very first step overall, or down from the very last.
 *
 * `groups` must come from orderedStageGroups(..., includeEmpty: true) — a stage a project has
 * emptied out by moving every step elsewhere is still a valid crossing target, and would be
 * silently skipped (or read as "no adjacent stage") if filtered out.
 *
 * Pure and stage-aware for the same-stage case: two steps can be adjacent in `order` yet
 * belong to different stage groups (once a step has been dragged to a different stage), so
 * the swap target is found via the *grouped* view, not raw adjacency in the flat array. */
export function moveStepInOrder(
  order: string[],
  groups: StageGroup[],
  stepId: string,
  direction: -1 | 1
): StepMoveResult | null {
  const groupIdx = groups.findIndex((g) => g.steps.some((s) => s.id === stepId));
  if (groupIdx === -1) return null;
  const group = groups[groupIdx];
  const idx = group.steps.findIndex((s) => s.id === stepId);
  const neighborIdx = idx + direction;

  if (neighborIdx >= 0 && neighborIdx < group.steps.length) {
    const neighborId = group.steps[neighborIdx].id;
    const a = order.indexOf(stepId);
    const b = order.indexOf(neighborId);
    if (a === -1 || b === -1) return null;
    const next = [...order];
    [next[a], next[b]] = [next[b], next[a]];
    return { order: next };
  }

  // At the edge of this stage — cross into the adjacent one instead of refusing the move.
  const targetGroupIdx = groupIdx + direction;
  if (targetGroupIdx < 0 || targetGroupIdx >= groups.length) return null;
  const targetGroup = groups[targetGroupIdx];

  if (targetGroup.steps.length === 0) {
    // Nothing there to anchor beside, but this step becomes that stage's only member —
    // its exact position in the flat array can't affect display grouping either way.
    return { order, stageId: targetGroup.stage.id };
  }

  const anchorId =
    direction === 1 ? targetGroup.steps[0].id : targetGroup.steps[targetGroup.steps.length - 1].id;
  const withoutStep = order.filter((id) => id !== stepId);
  const anchorIdx = withoutStep.indexOf(anchorId);
  if (anchorIdx === -1) return null;
  const insertAt = direction === 1 ? anchorIdx : anchorIdx + 1;
  const next = [...withoutStep];
  next.splice(insertAt, 0, stepId);
  return { order: next, stageId: targetGroup.stage.id };
}
