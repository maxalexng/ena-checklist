// Status for every node on the Overview tab's submission map (src/template/submissionMap.ts).
// A node linked to checklist steps reads its status from their items, plus the step's
// submission log where several nodes share one step (URA PP and WP, BCA's piling ST). A
// node with no link is tracked by hand. Either kind can be overridden by hand.
import { MAP_COLUMNS, MAP_PHASES, STEP_BY_ID, SUBMISSION_MAP } from "@/template";
import type { MapNodeDef, MapRowDef } from "@/template";
import type { SubmissionMapRow, SubmissionMapStatus } from "@/lib/supabase/database.types";

export type MapStatus = SubmissionMapStatus;

export interface MapInputs {
  itemsByKey: Record<string, { status: string; na: boolean } | undefined>;
  milestonesByStep: Record<string, { type: string }[] | undefined>;
  timelinePlanByStep: Record<string, { endDate: string | null } | undefined>;
  overrides: SubmissionMapRow;
}

export interface MapNodeState {
  def: MapNodeDef;
  agencyId: string;
  status: MapStatus;
  /** What the checklist says, before any manual status. Null for a node with no link. */
  autoStatus: MapStatus | null;
  /** Where `status` came from. "inherited": a hand-tracked node in a row whose linked
   * nodes are all N/A, so the agency isn't involved in this project. */
  source: "checklist" | "manual" | "untracked" | "inherited";
  cleared: number;
  applicable: number;
  /** Latest planned end date among the linked steps (Timeline tab), if any. */
  due: string | null;
  /** Past its planned end date and not yet done. */
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

function dueDate(node: MapNodeDef, inputs: MapInputs): string | null {
  const dates = node.links
    .map((link) => inputs.timelinePlanByStep[link.step]?.endDate)
    .filter((d): d is string => !!d);
  return dates.length > 0 ? dates.reduce((a, b) => (a > b ? a : b)) : null;
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
        due: dueDate(def, inputs),
        late: false,
        isNext: false,
      };
    });

    // An agency whose every linked stage is N/A isn't involved in this project, so its
    // hand-tracked stages are N/A too, unless someone has set them.
    const linked = nodes.filter((n) => n.autoStatus !== null);
    if (linked.length > 0 && linked.every((n) => n.status === "na")) {
      nodes.forEach((n) => {
        if (n.source === "untracked") {
          n.status = "na";
          n.source = "inherited";
        }
      });
    }

    nodes.forEach((n) => {
      n.late = !!n.due && n.due < today && (n.status === "pending" || n.status === "progress");
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
