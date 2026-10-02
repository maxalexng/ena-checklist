// Status for every node on the Overview tab's submission map (src/template/submissionMap.ts).
// A node linked to checklist steps reads its status from their items, plus the step's
// submission log where several nodes share one step (URA PP and WP, BCA's piling ST). A
// node with no link is tracked by hand. Either kind can be overridden by hand.
//
// Each node also has a plan for the Timeline tab: a target date (by default, the end of the
// office stage its checklist step sits in) and, once someone sets one, a start date.
import { MAP_COLUMNS, MAP_COLUMN_STAGE, MAP_PHASES, STAGE_BY_ID, STEP_BY_ID, SUBMISSION_MAP } from "@/template";
import type { MapNodeDef, MapRowDef, StageId } from "@/template";
import type { SubmissionMapRow, SubmissionMapStatus } from "@/lib/supabase/database.types";
import { formatDateDMY } from "./dates";
import { stageOfStep } from "./grouping";
import { stageWindows, timelineStart } from "./timeline";

export type MapStatus = SubmissionMapStatus;

export interface MapInputs {
  itemsByKey: Record<string, { status: string; na: boolean } | undefined>;
  milestonesByStep: Record<string, { type: string }[] | undefined>;
  /** The older per-step planned dates (timeline_plan), read where a node has none of its own. */
  timelinePlanByStep: Record<string, { startDate?: string | null; endDate: string | null } | undefined>;
  overrides: SubmissionMapRow;
  /** Shared stage moves (Checklist tab), so a stage's typical target follows its step. */
  stepStage?: Record<string, string>;
  /** Each office stage's dates, or null when the timeline has no start date yet. */
  stageWindows?: Record<StageId, { start: string; end: string }> | null;
}

/** Builds the map's inputs from the loaded project. */
export function mapInputsFor(data: {
  itemsByKey: MapInputs["itemsByKey"];
  milestonesByStep: MapInputs["milestonesByStep"];
  timelinePlanByStep: MapInputs["timelinePlanByStep"];
  project: {
    submissionMap: SubmissionMapRow;
    step_stage: Record<string, string>;
    projectDates: { projectStart?: string; contractStart?: string };
    stageDurationWeeks: Record<string, number>;
  };
}): MapInputs {
  const start = timelineStart(data.project.projectDates, data.project.stageDurationWeeks);
  return {
    itemsByKey: data.itemsByKey,
    milestonesByStep: data.milestonesByStep,
    timelinePlanByStep: data.timelinePlanByStep,
    overrides: data.project.submissionMap,
    stepStage: data.project.step_stage,
    stageWindows: start ? stageWindows(start.date, data.project.stageDurationWeeks) : null,
  };
}

export interface MapNodePlan {
  /** The office stage whose end is the typical target. */
  stageId: StageId;
  /** End of that stage, or null without a timeline start. */
  typicalEnd: string | null;
  start: string | null;
  /** "date": set as a date. "stage": set as "after <stage>". "timeline": the older per-step plan. */
  startSource: "date" | "stage" | "timeline" | null;
  /** The target / confirm-by date. */
  end: string | null;
  endSource: "date" | "timeline" | "typical" | null;
}

export interface MapNodeState {
  def: MapNodeDef;
  agencyId: string;
  status: MapStatus;
  /** What the checklist says, before any manual status. Null for a node with no link, or
   * a required node whose linked items are all N/A: both are tracked by hand. */
  autoStatus: MapStatus | null;
  /** Where `status` came from. */
  source: "checklist" | "manual" | "untracked";
  cleared: number;
  applicable: number;
  plan: MapNodePlan;
  /** Past a target someone has set (not just the typical one) and not yet done. */
  late: boolean;
  /** The agency's first unfinished stage, when it hasn't started yet: what to pick up next. */
  isNext: boolean;
}

export interface MapRowState {
  def: MapRowDef;
  nodes: MapNodeState[];
}

export interface MapPhaseState {
  id: string;
  label: string;
  done: number;
  /** Nodes in this phase that apply to the project (not N/A). */
  total: number;
}

export interface MapSummary {
  done: number;
  total: number;
  inProgress: MapNodeState[];
  late: MapNodeState[];
  upNext: MapNodeState[];
  phases: MapPhaseState[];
  /** The first phase with anything still open, or null once everything is done. */
  currentPhaseId: string | null;
}

function itemKeysFor(node: MapNodeDef): string[] {
  return node.links.flatMap((link) => {
    const step = STEP_BY_ID[link.step];
    if (!step) return [];
    return step.items.filter((_, i) => !link.items || link.items.includes(i)).map((it) => it.id);
  });
}

function checklistStatus(records: { status: string; na: boolean }[]): MapStatus {
  const applicable = records.filter((r) => !r.na);
  if (applicable.length === 0) return "na";
  if (applicable.every((r) => r.status === "cleared")) return "done";
  if (applicable.some((r) => r.status !== "pending")) return "progress";
  return "pending";
}

/** The node's status from the checklist and the linked steps' submission logs, ignoring
 * any manual status. Null when the node links to nothing. */
export function autoNodeStatus(node: MapNodeDef, inputs: MapInputs): MapStatus | null {
  if (node.links.length === 0) return null;
  const records = itemKeysFor(node)
    .map((key) => inputs.itemsByKey[key])
    .filter((r): r is { status: string; na: boolean } => !!r);
  let status = checklistStatus(records);

  const entries = node.links.flatMap((link) => inputs.milestonesByStep[link.step] ?? []);
  if (status === "na" && node.required) {
    // Only optional parts of the stage are N/A, not the stage itself, so it's tracked by
    // hand, unless the submission log already shows it moving.
    if (node.log && entries.some((e) => node.log!.done.test(e.type))) return "done";
    return entries.length > 0 ? "progress" : null;
  }
  if (node.log) {
    if (entries.some((e) => node.log!.done.test(e.type))) return "done";
    if (status === "pending" && node.log.started && entries.some((e) => node.log!.started!.test(e.type))) {
      status = "progress";
    }
  } else if (status === "pending" && entries.length > 0) {
    // A logged submission round means the stage is under way, even before any item moves.
    status = "progress";
  }
  return status;
}

/** The office stage a node's typical target follows: its own if it names one, else its
 * first linked step's stage, else the column's default for a hand-tracked node. */
export function nodeStage(node: MapNodeDef, stepStage: Record<string, string> = {}): StageId {
  if (node.stage) return node.stage;
  const step = node.links[0] && STEP_BY_ID[node.links[0].step];
  return step ? stageOfStep(step, stepStage) : MAP_COLUMN_STAGE[node.column];
}

function latest(dates: (string | null | undefined)[]): string | null {
  const set = dates.filter((d): d is string => !!d);
  return set.length > 0 ? set.reduce((a, b) => (a > b ? a : b)) : null;
}

function earliest(dates: (string | null | undefined)[]): string | null {
  const set = dates.filter((d): d is string => !!d);
  return set.length > 0 ? set.reduce((a, b) => (a < b ? a : b)) : null;
}

/** A node's start and target: what's set on the node itself first, then the older
 * per-step plan of its linked steps, then (for the target) the end of its office stage. */
export function nodePlan(node: MapNodeDef, inputs: MapInputs): MapNodePlan {
  const own = inputs.overrides[node.id] ?? {};
  const stageId = nodeStage(node, inputs.stepStage);
  const windows = inputs.stageWindows ?? null;
  const typicalEnd = windows ? windows[stageId].end : null;
  const legacy = node.links.map((l) => inputs.timelinePlanByStep[l.step]);
  const legacyStart = earliest(legacy.map((p) => p?.startDate));
  const legacyEnd = latest(legacy.map((p) => p?.endDate));
  const afterStage = own.startAfter && windows ? windows[own.startAfter as StageId]?.end ?? null : null;

  const [start, startSource]: [string | null, MapNodePlan["startSource"]] = own.start
    ? [own.start, "date"]
    : afterStage
      ? [afterStage, "stage"]
      : legacyStart
        ? [legacyStart, "timeline"]
        : [null, null];
  const [end, endSource]: [string | null, MapNodePlan["endSource"]] = own.end
    ? [own.end, "date"]
    : legacyEnd
      ? [legacyEnd, "timeline"]
      : typicalEnd
        ? [typicalEnd, "typical"]
        : [null, null];
  return { stageId, typicalEnd, start, startSource, end, endSource };
}

/** "12 03 2027 (typical: end of Detailed Design)", or null with no target. */
export function planEndText(plan: MapNodePlan): string | null {
  if (!plan.end) return null;
  const why =
    plan.endSource === "typical"
      ? `typical: end of ${STAGE_BY_ID[plan.stageId].name}`
      : plan.endSource === "timeline"
        ? "from the step's planned dates"
        : "set on the Timeline tab";
  return `${formatDateDMY(plan.end)} (${why})`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function submissionMapState(inputs: MapInputs, today: string = todayIso()): MapRowState[] {
  return SUBMISSION_MAP.map((row) => {
    const nodes: MapNodeState[] = row.nodes.map((def) => {
      const autoStatus = autoNodeStatus(def, inputs);
      const manual = inputs.overrides[def.id]?.status;
      const items = itemKeysFor(def).map((key) => inputs.itemsByKey[key]).filter(Boolean);
      return {
        def,
        agencyId: row.agencyId,
        status: manual ?? autoStatus ?? "pending",
        autoStatus,
        source: manual ? "manual" : autoStatus ? "checklist" : "untracked",
        cleared: items.filter((r) => r && !r.na && r.status === "cleared").length,
        applicable: items.filter((r) => r && !r.na).length,
        plan: nodePlan(def, inputs),
        late: false,
        isNext: false,
      };
    });

    // N/A never spreads along a row: an agency's optional checklist steps being N/A says
    // nothing about its other stages (no traffic study, but LTA's BP and CSC still happen).
    nodes.forEach((n) => {
      // A typical target is only a guide, so it never makes a stage late on its own.
      const target = n.plan.endSource === "typical" ? null : n.plan.end;
      n.late = !!target && target < today && (n.status === "pending" || n.status === "progress");
    });
    const firstOpen = nodes.find((n) => n.status === "pending" || n.status === "progress");
    if (firstOpen && firstOpen.status === "pending") firstOpen.isNext = true;

    return { def: row, nodes };
  });
}

const COLUMN_INDEX: Record<string, number> = Object.fromEntries(MAP_COLUMNS.map((c, i) => [c, i]));

function byColumn(a: MapNodeState, b: MapNodeState): number {
  return COLUMN_INDEX[a.def.column] - COLUMN_INDEX[b.def.column];
}

export function submissionMapSummary(rows: MapRowState[]): MapSummary {
  const nodes = rows.flatMap((r) => r.nodes);
  const applicable = nodes.filter((n) => n.status !== "na");
  const phases = MAP_PHASES.map((phase) => {
    const inPhase = applicable.filter((n) => phase.columns.includes(n.def.column));
    return {
      id: phase.id,
      label: phase.label,
      done: inPhase.filter((n) => n.status === "done").length,
      total: inPhase.length,
    };
  });
  return {
    done: applicable.filter((n) => n.status === "done").length,
    total: applicable.length,
    inProgress: nodes.filter((n) => n.status === "progress").sort(byColumn),
    late: nodes.filter((n) => n.late).sort(byColumn),
    upNext: nodes.filter((n) => n.isNext).sort(byColumn),
    phases,
    currentPhaseId: phases.find((p) => p.done < p.total)?.id ?? null,
  };
}
