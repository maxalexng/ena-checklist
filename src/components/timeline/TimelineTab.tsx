"use client";

import { useState } from "react";
import { STAGES, STEP_BY_ID } from "@/template";
import { timelineKeys } from "@/template";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { useUpdateStageDurationWeeks, useUpdateTimelinePlanField } from "@/hooks/useTimelineMutations";
import { aggregateStatus, projectSpan, pxForDate, stageBands, todayPx } from "@/lib/checklist/timeline";
import { formatDateDMY } from "@/lib/checklist/dates";

export function TimelineTab({ projectId, data }: { projectId: string; data: ProjectChecklistData }) {
  const updateTimelinePlanField = useUpdateTimelinePlanField(projectId);
  const updateStageDuration = useUpdateStageDurationWeeks(projectId);
  const [durationsOpen, setDurationsOpen] = useState(false);

  const span = projectSpan(data.project.projectDates.contractStart, data.project.stageDurationWeeks);

  if (!span) {
    return (
      <div className="tl-empty-prompt">
        Set an <strong>Actual Contract Start</strong> date on the Overview tab (Project Dates) to see the
        timeline — it&apos;s calculated from that date plus each stage&apos;s duration.
      </div>
    );
  }

  const bands = stageBands(span, data.project.stageDurationWeeks);
  const todayLeft = todayPx(span);
  const rows = timelineKeys()
    .map((key) => STEP_BY_ID[key])
    .filter(Boolean);

  return (
    <div className="timeline-app">
      <div className="tl-toolbar">
        <span className="tl-toolbar-range">
          <strong>{span.totalWeeks}</strong> weeks from {formatDateDMY(data.project.projectDates.contractStart)}
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
          {rows.map((step) => {
            const statuses = step.items.map((it) => data.itemsByKey[it.id]).filter(Boolean);
            const status = aggregateStatus(statuses);
            const plan = data.timelinePlanByStep[step.id];
            const milestones = data.milestonesByStep[step.id] ?? [];
            const left = pxForDate(plan?.startDate, span);
            const right = pxForDate(plan?.endDate, span);
            const tooltip = milestones
              .map((m) => `${m.type}${m.date ? ` — ${formatDateDMY(m.date)}` : ""}`)
              .join("\n");

            return (
              <div className="tl-row" key={step.id}>
                <div className="tl-row-label">
                  <span className="tl-row-code">{step.code}</span>
                  <span className="tl-row-name">{step.submission.name}</span>
                </div>
                <div className="tl-row-track" style={{ width: span.trackWidthPx }} title={tooltip || undefined}>
                  {left !== null && right !== null && (
                    <div
                      className={`tl-bar tl-st-${status}`}
                      style={{ left: Math.max(0, left), width: Math.max(3, right - left) }}
                    />
                  )}
                </div>
                <div className="tl-row-dates">
                  <input
                    type="date"
                    value={plan?.startDate ?? ""}
                    onChange={(e) =>
                      updateTimelinePlanField.mutate({
                        stepKey: step.id,
                        field: "start_date",
                        value: e.target.value || null,
                      })
                    }
                  />
                  <span>–</span>
                  <input
                    type="date"
                    value={plan?.endDate ?? ""}
                    onChange={(e) =>
                      updateTimelinePlanField.mutate({
                        stepKey: step.id,
                        field: "end_date",
                        value: e.target.value || null,
                      })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="tl-legend">
        <span className="tl-legend-item">
          <span className="tl-legend-dot" style={{ background: "var(--st-pending)", opacity: 0.6 }} />
          Not started
        </span>
        <span className="tl-legend-item">
          <span className="tl-legend-dot" style={{ background: "var(--st-progress)" }} />
          In progress / submitted
        </span>
        <span className="tl-legend-item">
          <span className="tl-legend-dot" style={{ background: "var(--st-cleared)" }} />
          Cleared
        </span>
        <span className="tl-legend-item">
          <span className="tl-legend-dot" style={{ background: "var(--danger)" }} />
          Today
        </span>
      </div>
    </div>
  );
}
