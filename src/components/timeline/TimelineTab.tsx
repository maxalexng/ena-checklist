"use client";

import { Fragment, useMemo, useState } from "react";
import Image from "next/image";
import { STAGES, STAGE_BY_ID, agencyLogoSrc } from "@/template";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { useUpdateStageDurationWeeks } from "@/hooks/useTimelineMutations";
import { useUpdateMapNode, useUpdateProjectDates } from "@/hooks/useOverviewMutations";
import { projectSpan, pxForDate, stageBands, timelineStart, todayPx, type ProjectSpan } from "@/lib/checklist/timeline";
import { formatDateDMY } from "@/lib/checklist/dates";
import { mapInputsFor, planEndText, submissionMapState, type MapNodeState } from "@/lib/checklist/submissionMap";
import { MAP_STATUS_LABEL } from "@/components/overview/SubmissionMap";

/** The track column starts after the 260px label column and its 10px gap (.tl-row). */
const TRACK_OFFSET_PX = 270;

function bubbleClass(n: MapNodeState, extra: string): string {
  return ["tl-dot", `smap-st-${n.status}`, n.late ? "smap-late" : "", n.isNext ? "smap-next" : "", extra]
    .filter(Boolean)
    .join(" ");
}

/** A stage's bubbles on its row: one circle at the target, or, once a start is set, a
 * circle at each end joined by a pill. A typical target (not set by anyone yet) is dotted. */
function StageBubbles({ n, span }: { n: MapNodeState; span: ProjectSpan }) {
  const clamp = (px: number | null) => (px === null ? null : Math.min(Math.max(px, 0), span.trackWidthPx));
  const end = clamp(pxForDate(n.plan.end, span));
  const start = clamp(pxForDate(n.plan.start, span));
  if (end === null && start === null) return null;
  const typical = n.plan.endSource === "typical";
  const status = n.late ? `${MAP_STATUS_LABEL[n.status]}, late` : MAP_STATUS_LABEL[n.status];

  return (
    <>
      {start !== null && end !== null && (
        <span
          className="tl-pill"
          data-status={n.late ? "late" : n.status}
          style={{ left: Math.min(start, end), width: Math.abs(end - start) }}
        />
      )}
      {start !== null && (
        <span
          className={bubbleClass(n, "tl-dot-start")}
          style={{ left: start }}
          title={`${n.def.name}: start ${formatDateDMY(n.plan.start)}`}
          data-bubble="start"
        />
      )}
      {end !== null && (
        <span
          className={bubbleClass(n, typical ? "is-typical" : "")}
          style={{ left: end }}
          title={`${n.def.name}: ${status}, target ${planEndText(n.plan)}`}
          data-bubble="end"
          data-typical={typical || undefined}
        />
      )}
    </>
  );
}

function StageEditor({
  n,
  data,
  onChange,
}: {
  n: MapNodeState;
  data: ProjectChecklistData;
  onChange: (patch: { start?: string | null; startAfter?: string | null; end?: string | null }) => void;
}) {
  const own = data.project.submissionMap[n.def.id] ?? {};
  const startMode = own.start ? "date" : own.startAfter ?? "";
  const typical = n.plan.typicalEnd;

  return (
    <div className="tl-editor" data-testid="timeline-editor">
      <div className="tl-editor-inner">
        <div className="tl-editor-field">
          <label htmlFor={`tl-start-${n.def.id}`}>Start preparing</label>
          <select
            id={`tl-start-${n.def.id}`}
            value={startMode}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") onChange({ start: null, startAfter: null });
              // Start from whatever date the stage already shows, then let it be edited.
              else if (v === "date") onChange({ start: n.plan.start ?? n.plan.end, startAfter: null });
              else onChange({ startAfter: v, start: null });
            }}
          >
            <option value="">Not set</option>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                After {s.name}
              </option>
            ))}
            <option value="date">On a date…</option>
          </select>
          {startMode === "date" && (
            <input
              type="date"
              aria-label="Start date"
              value={own.start ?? ""}
              onChange={(e) => onChange({ start: e.target.value || null })}
            />
          )}
          {startMode && startMode !== "date" && n.plan.start && (
            <span className="tl-editor-hint">{formatDateDMY(n.plan.start)}</span>
          )}
        </div>
        <div className="tl-editor-field">
          <label htmlFor={`tl-end-${n.def.id}`}>Target / confirm by</label>
          <input
            id={`tl-end-${n.def.id}`}
            type="date"
            value={own.end ?? ""}
            onChange={(e) => onChange({ end: e.target.value || null })}
          />
          <span className="tl-editor-hint">
            {own.end
              ? typical && `Typical: ${formatDateDMY(typical)}, end of ${STAGE_BY_ID[n.plan.stageId].name}.`
              : n.plan.end
                ? `Now ${planEndText(n.plan)}.`
                : "No target yet."}
          </span>
          {own.end && (
            <button type="button" className="ov-jump" onClick={() => onChange({ end: null })}>
              Use typical
            </button>
          )}
        </div>
        <p className="tl-editor-hint">
          {MAP_STATUS_LABEL[n.status]}
          {n.late && ", late"}. Status comes from the checklist, or set it on the Overview tab&apos;s map.
        </p>
      </div>
    </div>
  );
}

export function TimelineTab({ projectId, data }: { projectId: string; data: ProjectChecklistData }) {
  const updateStageDuration = useUpdateStageDurationWeeks(projectId);
  const updateProjectDates = useUpdateProjectDates(projectId);
  const updateNode = useUpdateMapNode(projectId);
  const [durationsOpen, setDurationsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const dates = data.project.projectDates;
  const start = timelineStart(dates, data.project.stageDurationWeeks);
  const span = start ? projectSpan(start.date, data.project.stageDurationWeeks) : null;
  const rows = useMemo(() => submissionMapState(mapInputsFor(data)), [data]);

  const projectStartInput = (
    <label className="tl-project-start">
      Project start
      <input
        type="date"
        value={dates.projectStart ?? ""}
        // "" clears it: the patch is merged into project_dates, so a missing key would keep the old date.
        onChange={(e) => updateProjectDates.mutate({ projectStart: e.target.value })}
      />
    </label>
  );

  if (!span || !start) {
    return (
      <div className="tl-empty-prompt">
        <p>
          Set a project start to see the timeline. Each stage runs for its typical duration from there, and every
          submission gets a typical target date from the stage it sits in.
        </p>
        {projectStartInput}
        <p className="tl-editor-hint">
          Or set the <strong>Actual Contract Start</strong> on the Overview tab, and the stages before construction are
          counted back from it.
        </p>
      </div>
    );
  }

  const bands = stageBands(span, data.project.stageDurationWeeks);
  const todayLeft = todayPx(span);

  return (
    <div className="timeline-app">
      <div className="tl-toolbar">
        {projectStartInput}
        <span className="tl-toolbar-range">
          <strong>{span.totalWeeks}</strong> weeks from {formatDateDMY(start.date)}
          {start.basis === "contract" && (
            <> · counted back from the Actual Contract Start ({formatDateDMY(dates.contractStart)})</>
          )}
        </span>
        <button
          type="button"
          className="summary-btn tl-durations-toggle"
          onClick={() => setDurationsOpen((v) => !v)}
        >
          {durationsOpen ? "Hide" : "Edit"} stage durations
        </button>
      </div>

      {durationsOpen && (
        <div className="tl-durations">
          {STAGES.map((stage) => (
            <div className="tl-dur-row" key={stage.id}>
              <label>{stage.name}</label>
              <div className="tl-dur-field">
                <input
                  type="number"
                  min={0}
                  defaultValue={data.project.stageDurationWeeks[stage.id] || 0}
                  onBlur={(e) =>
                    updateStageDuration.mutate({ stageId: stage.id, weeks: Number(e.target.value) || 0 })
                  }
                />
                <label>weeks</label>
              </div>
            </div>
          ))}
          <div className="tl-dur-total">Total: {span.totalWeeks} weeks</div>
        </div>
      )}

      <div className="tl-scale-wrap" style={{ ["--tl-track-w" as string]: `${span.trackWidthPx}px` }}>
        <div className="tl-band-row">
          <div />
          <div className="tl-bands-track" style={{ width: span.trackWidthPx }}>
            {bands.map((b) => (
              <div
                key={b.stage.id}
                className={`tl-band${b.first ? " tl-band-first" : ""}${b.last ? " tl-band-last" : ""}`}
                style={{ left: b.leftPx, width: b.widthPx, background: "var(--surface-3)" }}
              >
                <span className="tl-band-label">
                  <span className="tl-band-num">{STAGES.findIndex((s) => s.id === b.stage.id) + 1}</span>
                  <span className="tl-band-name">{b.stage.name}</span>
                </span>
              </div>
            ))}
            {todayLeft >= 0 && todayLeft <= span.trackWidthPx && (
              <div className="tl-today" style={{ left: todayLeft }} />
            )}
          </div>
          <div />
        </div>

        <div className="tl-rows">
          <div className="tl-rows-overlay" style={{ left: TRACK_OFFSET_PX, width: span.trackWidthPx }} aria-hidden="true">
            {bands.slice(1).map((b) => (
              <span key={b.stage.id} className="tl-stage-line" style={{ left: b.leftPx }} />
            ))}
            {todayLeft >= 0 && todayLeft <= span.trackWidthPx && (
              <span className="tl-today" style={{ left: todayLeft }} />
            )}
          </div>

          {rows.map((row) => {
            const logo = agencyLogoSrc(row.def.agencyId);
            return (
              <Fragment key={row.def.agencyId}>
                <div className="tl-row tl-group-head" data-agency={row.def.agencyId}>
                  <div className="tl-row-label tl-group-label">
                    {logo && <Image src={logo} alt="" width={64} height={26} className="tl-logo" />}
                    <span className="tl-group-code">{row.def.label}</span>
                  </div>
                  <div />
                  <div />
                </div>
                {row.nodes.map((n) => {
                  const selected = selectedId === n.def.id;
                  return (
                    <Fragment key={n.def.id}>
                      <div
                        className={`tl-row tl-stage-row${n.status === "na" ? " is-na" : ""}${selected ? " is-selected" : ""}`}
                        data-node={n.def.id}
                        data-status={n.status}
                      >
                        <button
                          type="button"
                          className="tl-row-label tl-stage-btn"
                          aria-expanded={selected}
                          onClick={() => setSelectedId(selected ? null : n.def.id)}
                        >
                          <span className="tl-stage-code">{n.def.label}</span>
                          <span className="tl-row-name">{n.def.name}</span>
                        </button>
                        <div
                          className="tl-row-track tl-stage-track"
                          style={{ width: span.trackWidthPx }}
                          onClick={() => setSelectedId(selected ? null : n.def.id)}
                        >
                          <StageBubbles n={n} span={span} />
                        </div>
                        <div className="tl-row-dates tl-stage-dates">
                          {n.plan.start && <span>{formatDateDMY(n.plan.start)} →</span>}
                          <span className={n.plan.endSource === "typical" ? "is-typical" : ""}>
                            {n.plan.end ? formatDateDMY(n.plan.end) : "—"}
                          </span>
                        </div>
                      </div>
                      {selected && (
                        <StageEditor
                          n={n}
                          data={data}
                          onChange={(patch) => updateNode.mutate({ nodeId: n.def.id, patch })}
                        />
                      )}
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="tl-legend smap-legend">
        {(["pending", "progress", "done", "na"] as const).map((s) => (
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
          <span className="smap-dot smap-st-pending is-typical" />
          Typical target (from the stage)
        </span>
        <span className="smap-legend-item">
          <span className="tl-legend-range">
            <span className="smap-dot smap-st-progress" />
            <span className="tl-legend-pill" />
            <span className="smap-dot smap-st-progress" />
          </span>
          Start → target
        </span>
        <span className="smap-legend-item">
          <span className="tl-legend-today" />
          Today
        </span>
      </div>
      <p className="ov-hint">
        Click a stage to set when preparation starts and when it has to be confirmed by. Until then, its target is the end
        of the office stage its checklist step sits in, and moves with the step on the Checklist tab.
      </p>
    </div>
  );
}
