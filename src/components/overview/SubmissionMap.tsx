"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { MAP_COLUMNS, MAP_PHASES, STEP_BY_ID, agencyLogoSrc } from "@/template";
import type { MapColumnId } from "@/template";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { useUpdateMapNode } from "@/hooks/useOverviewMutations";
import { formatDateDMY } from "@/lib/checklist/dates";
import { flattenSteps, orderedStageGroups } from "@/lib/checklist/grouping";
import {
  mapInputsFor,
  planEndText,
  submissionMapState,
  submissionMapSummary,
  type MapNodeState,
  type MapStatus,
} from "@/lib/checklist/submissionMap";

export const MAP_STATUS_LABEL: Record<MapStatus, string> = {
  pending: "Not started",
  progress: "In progress",
  done: "Done",
  na: "N/A",
};

const STATUS_CHOICES: MapStatus[] = ["pending", "progress", "done", "na"];

/** Node centre as a percentage across the track. */
function columnPct(column: MapColumnId): number {
  return ((MAP_COLUMNS.indexOf(column) + 0.5) / MAP_COLUMNS.length) * 100;
}

function nodeTitle(n: MapNodeState): string {
  const status = n.late ? `${MAP_STATUS_LABEL[n.status]}, late` : MAP_STATUS_LABEL[n.status];
  return `${n.def.name}: ${status}${n.plan.end ? ` (target ${formatDateDMY(n.plan.end)})` : ""}`;
}

function nodeClass(n: MapNodeState, selected: boolean): string {
  return [
    "smap-node",
    `smap-st-${n.status}`,
    n.late ? "smap-late" : "",
    n.isNext ? "smap-next" : "",
    selected ? "smap-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Runs of consecutive stages made by the same outside party, for the bracket under them. */
function byGroups(nodes: MapNodeState[]): { by: string; first: string; from: number; to: number }[] {
  const groups: { by: string; first: string; from: number; to: number }[] = [];
  nodes.forEach((n, i) => {
    const by = n.def.by;
    if (!by) return;
    const last = groups[groups.length - 1];
    if (last && nodes[i - 1]?.def.by === by) last.to = columnPct(n.def.column);
    else groups.push({ by, first: n.def.id, from: columnPct(n.def.column), to: columnPct(n.def.column) });
  });
  return groups;
}

function sourceText(n: MapNodeState): string {
  switch (n.source) {
    case "manual":
      return n.autoStatus
        ? `Set by hand. The checklist says ${MAP_STATUS_LABEL[n.autoStatus].toLowerCase()}.`
        : "Set by hand.";
    case "checklist":
      return n.applicable > 0
        ? `From the checklist: ${n.cleared} of ${n.applicable} items cleared.`
        : "From the checklist: every item is N/A.";
    default:
      return n.def.links.length > 0
        ? "Its checklist items are all N/A, but the stage itself still applies, so it's tracked here by hand."
        : "No checklist step covers this stage, so it's tracked here by hand.";
  }
}

export function SubmissionMap({
  projectId,
  data,
  onOpenStep,
}: {
  projectId: string;
  data: ProjectChecklistData;
  onOpenStep?: (stepKey: string) => void;
}) {
  const updateNode = useUpdateMapNode(projectId);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => submissionMapState(mapInputsFor(data)), [data]);
  const summary = useMemo(() => submissionMapSummary(rows), [rows]);
  // Where an agency's logo jumps to: its first step in the project's current order.
  const firstStepByAgency = useMemo(() => {
    const out: Record<string, string> = {};
    flattenSteps(orderedStageGroups(data.project.step_order, data.project.step_stage)).forEach((s) => {
      out[s.realId] ??= s.id;
    });
    return out;
  }, [data.project.step_order, data.project.step_stage]);
  const selected = rows.flatMap((r) => r.nodes).find((n) => n.def.id === selectedId) ?? null;

  function select(id: string) {
    setSelectedId((cur) => (cur === id ? null : id));
  }

  function agencyLabel(n: MapNodeState): string {
    return rows.find((r) => r.def.agencyId === n.agencyId)?.def.label ?? n.agencyId;
  }


  const chipGroups: { key: string; title: string; nodes: MapNodeState[]; empty: string }[] = [
    { key: "late", title: "Late", nodes: summary.late, empty: "Nothing late." },
    { key: "progress", title: "In progress", nodes: summary.inProgress, empty: "Nothing under way." },
    { key: "next", title: "Up next", nodes: summary.upNext, empty: "Nothing waiting to start." },
  ];

  return (
    <div className="ov-section smap" data-testid="submission-map">
      <div className="ov-section-head">
        <h3>Submission map</h3>
        <span className="smap-tally">
          <strong>{summary.done}</strong> of {summary.total} stages done
          {summary.late.length > 0 && <span className="smap-tally-late"> · {summary.late.length} late</span>}
        </span>
      </div>
      <p className="ov-blurb">
        Each agency&apos;s route through the CORENET process, left to right. Most stages update themselves from the
        checklist and submission logs; click any stage to see why, set it by hand, or jump to its checklist step.
      </p>

      <div className="smap-legend" aria-hidden="true">
        {STATUS_CHOICES.map((s) => (
          <span key={s} className="smap-legend-item">
            <span className={`smap-dot smap-st-${s}`} />
            {MAP_STATUS_LABEL[s]}
          </span>
        ))}
        <span className="smap-legend-item">
          <span className="smap-dot smap-st-pending smap-late" />
          Late
        </span>
        <span className="smap-legend-item">
          <span className="smap-dot smap-st-pending smap-next" />
          Up next
        </span>
      </div>

      <div className="smap-scroll">
        <div className="smap-grid">
          <div className="smap-corner" />
          <div className="smap-phases">
            {MAP_PHASES.map((phase) => {
              const first = MAP_COLUMNS.indexOf(phase.columns[0]);
              const state = summary.phases.find((p) => p.id === phase.id)!;
              const current = summary.currentPhaseId === phase.id;
              const complete = state.total > 0 && state.done === state.total;
              return (
                <div
                  key={phase.id}
                  className={`smap-phase${current ? " is-current" : ""}${complete ? " is-complete" : ""}`}
                  style={{
                    left: `${(first / MAP_COLUMNS.length) * 100}%`,
                    width: `${(phase.columns.length / MAP_COLUMNS.length) * 100}%`,
                  }}
                >
                  <span className="smap-phase-name">{phase.label}</span>
                  <span className="smap-phase-count">
                    {state.total > 0 ? `${state.done}/${state.total}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>

          {rows.map((row) => {
            const logo = agencyLogoSrc(row.def.agencyId);
            const jumpTo = firstStepByAgency[row.def.agencyId];
            const allNa = row.nodes.every((n) => n.status === "na");
            return (
              <div key={row.def.agencyId} className={`smap-row${allNa ? " is-na" : ""}`} data-agency={row.def.agencyId}>
                <button
                  type="button"
                  className="smap-agency"
                  disabled={!onOpenStep || !jumpTo}
                  onClick={() => jumpTo && onOpenStep?.(jumpTo)}
                  aria-label={`Go to ${row.def.label} steps`}
                  title={`Go to ${row.def.label} steps in the checklist`}
                >
                  {logo ? (
                    <Image src={logo} alt="" width={76} height={34} className="smap-logo" />
                  ) : (
                    <span className="smap-logo" />
                  )}
                  <span className="smap-agency-text">
                    <span className="smap-agency-code">{row.def.label}</span>
                    <span className="smap-agency-scope">{row.def.scope.join(" · ")}</span>
                  </span>
                </button>

                <div className="smap-track">
                  <span className="smap-feed" style={{ left: `${columnPct("top")}%` }} />
                  <span className="smap-feed" style={{ left: `${columnPct("csc")}%` }} />
                  {row.nodes.slice(1).map((n, i) => {
                    const prev = row.nodes[i];
                    const from = columnPct(prev.def.column);
                    const to = columnPct(n.def.column);
                    const passed = prev.status === "done" || prev.status === "na";
                    return (
                      <span
                        key={`seg-${n.def.id}`}
                        className={`smap-seg${passed ? " is-passed" : ""}${n.def.route ? " is-route" : ""}`}
                        style={{ left: `${from}%`, width: `${to - from}%` }}
                      >
                        {n.def.route && <span className="smap-route">{n.def.route}</span>}
                      </span>
                    );
                  })}
                  {byGroups(row.nodes).map((g) => (
                    <span
                      key={`by-${g.first}`}
                      className="smap-by"
                      style={{ left: `calc(${g.from}% - 26px)`, width: `calc(${g.to - g.from}% + 52px)` }}
                    >
                      <span className="smap-by-label">by {g.by}</span>
                    </span>
                  ))}
                  {row.nodes.map((n) => (
                    <div key={n.def.id} className="smap-node-wrap" style={{ left: `${columnPct(n.def.column)}%` }}>
                      <span className={`smap-node-label${n.status === "na" ? " is-na" : ""}`}>
                        {n.def.label}
                        {n.def.optional && "*"}
                      </span>
                      <button
                        type="button"
                        className={nodeClass(n, selectedId === n.def.id)}
                        data-node={n.def.id}
                        data-status={n.status}
                        aria-label={`${row.def.label} ${n.def.label}: ${MAP_STATUS_LABEL[n.status]}${n.late ? ", late" : ""}`}
                        aria-pressed={selectedId === n.def.id}
                        title={nodeTitle(n)}
                        onClick={() => select(n.def.id)}
                      >
                        {n.late ? "!" : n.status === "done" ? "✓" : ""}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="ov-hint smap-foot">
        * Only some projects need these (OPP, demolition). Every agency&apos;s TOP and CSC clearances feed BCA&apos;s overall TOP and CSC.
        A stage turns late once its target date on the Timeline tab has passed.
      </p>

      {selected && (
        <div className="smap-detail" data-testid="submission-map-detail">
          <div className="smap-detail-head">
            <span className={`smap-dot smap-st-${selected.status}${selected.late ? " smap-late" : ""}`} />
            <strong>
              {selected.def.name}
            </strong>
            {selected.late && <span className="smap-late-tag">Late</span>}
            <button type="button" className="roles-panel-close" aria-label="Close" onClick={() => setSelectedId(null)}>
              ×
            </button>
          </div>
          {selected.def.by && <p className="smap-detail-source">Submitted by the {selected.def.by}.</p>}
          <p className="smap-detail-source">{sourceText(selected)}</p>
          {selected.plan.end && <p className="smap-detail-source">Target: {planEndText(selected.plan)}.</p>}
          <div className="seg-toggle smap-status-toggle" role="group" aria-label="Status">
            {selected.autoStatus !== null && (
              <button
                type="button"
                className={`seg-btn${selected.source !== "manual" ? " active" : ""}`}
                onClick={() => updateNode.mutate({ nodeId: selected.def.id, patch: { status: null } })}
              >
                Auto ({MAP_STATUS_LABEL[selected.autoStatus]})
              </button>
            )}
            {STATUS_CHOICES.map((s) => (
              <button
                key={s}
                type="button"
                className={`seg-btn${
                  selected.status === s && (selected.source === "manual" || selected.autoStatus === null) ? " active" : ""
                }`}
                onClick={() =>
                  updateNode.mutate({
                    nodeId: selected.def.id,
                    // Picking what the checklist already says just returns the node to auto.
                    patch: { status: s === selected.autoStatus ? null : s },
                  })
                }
              >
                {MAP_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          {selected.def.links.length > 0 && onOpenStep && (
            <div className="smap-detail-links">
              {[...new Set(selected.def.links.map((l) => l.step))].map((stepKey) => (
                <button key={stepKey} type="button" className="ov-jump" onClick={() => onOpenStep(stepKey)}>
                  {STEP_BY_ID[stepKey]?.code} · {STEP_BY_ID[stepKey]?.submission.name} → checklist
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="smap-chips">
        {chipGroups.map((g) => (
          <div key={g.key} className={`smap-chip-group smap-chip-${g.key}`}>
            <span className="ov-label">{g.title}</span>
            {g.nodes.length === 0 ? (
              <span className="ov-empty">{g.empty}</span>
            ) : (
              g.nodes.map((n) => (
                <button
                  key={n.def.id}
                  type="button"
                  className={`smap-chip${selectedId === n.def.id ? " is-selected" : ""}`}
                  onClick={() => select(n.def.id)}
                >
                  {agencyLabel(n)} {n.def.label}
                  {g.key === "late" && n.plan.end && (
                    <span className="smap-chip-due"> · due {formatDateDMY(n.plan.end)}</span>
                  )}
                </button>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
