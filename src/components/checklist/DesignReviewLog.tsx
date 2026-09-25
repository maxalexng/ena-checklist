"use client";

import { useState } from "react";
import type { MilestoneEntry } from "@/hooks/useProjectData";
import { useAddMilestone, useDeleteMilestone, useUpdateMilestone } from "@/hooks/useOverviewMutations";
import {
  formatDayGap,
  roundCountLabel,
  summarizeDesignReviews,
  type DesignReviewRow,
} from "@/lib/checklist/designReviews";
import type { DesignLogConfig } from "@/template/designLogs";

// A step's dated design log (see template/designLogs.ts): a fixed first row, any number of
// numbered rounds, then a fixed last row. The two fixed rows exist before they have
// a milestone behind them; the first edit to one creates it.
function ReviewRow({
  projectId,
  stepKey,
  config,
  row,
  locked,
}: {
  projectId: string;
  stepKey: string;
  config: DesignLogConfig;
  row: DesignReviewRow;
  locked: boolean;
}) {
  const addMilestone = useAddMilestone(projectId);
  const updateMilestone = useUpdateMilestone(projectId);
  const deleteMilestone = useDeleteMilestone(projectId);
  const entry = row.entry;
  // Local note state survives the full-project refetch a sibling row's edit triggers.
  const [note, setNote] = useState(entry?.note ?? "");

  function save(patch: { date?: string | null; note?: string }) {
    if (entry) {
      updateMilestone.mutate({ id: entry.id, ...patch });
    } else {
      addMilestone.mutate({
        stepKey,
        type: config.types[row.kind],
        date: patch.date ?? null,
        note: patch.note ?? "",
      });
    }
  }

  // A fixed row has no id until its first save lands; block a second insert meanwhile.
  const creating = !entry && addMilestone.isPending;

  return (
    <div className={`design-review-row design-review-${row.kind}`}>
      <span className="design-review-label">{row.label}</span>
      <input
        type="date"
        className="ov-amend-date-input"
        aria-label={`${row.label} date`}
        value={entry?.date ?? ""}
        disabled={locked || creating}
        onChange={(e) => save({ date: e.target.value || null })}
      />
      {row.daysSincePrevious !== null && (
        <span className="design-review-gap" title="Time since the previous dated row">
          +{formatDayGap(row.daysSincePrevious)}
        </span>
      )}
      <input
        className="ov-amend-note-input"
        placeholder="Note (optional)"
        aria-label={`${row.label} note`}
        value={note}
        disabled={locked || creating}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => {
          if (note !== (entry?.note ?? "")) save({ note });
        }}
      />
      {!locked && row.kind === "round" && entry && (
        <button
          type="button"
          className="ov-del"
          aria-label={`Remove ${row.label}`}
          onClick={() => deleteMilestone.mutate({ id: entry.id })}
        >
          ×
        </button>
      )}
    </div>
  );
}

export function DesignReviewLog({
  projectId,
  stepKey,
  config,
  entries,
  locked,
}: {
  projectId: string;
  stepKey: string;
  config: DesignLogConfig;
  entries: MilestoneEntry[];
  locked: boolean;
}) {
  const addMilestone = useAddMilestone(projectId);
  const summary = summarizeDesignReviews(entries, config);
  // The confirm row is always last, so the add button goes right before it.
  const addAfter = summary.rows.length - 2;

  let span = "";
  if (summary.totalDays !== null) {
    span = summary.confirmed
      ? ` · ${formatDayGap(summary.totalDays)} ${config.spanPhrase}`
      : ` · ${formatDayGap(summary.totalDays)} so far`;
  }

  return (
    <div className="items design-review-log">
      {summary.rows.map((row, i) => (
        <div key={row.entry?.id ?? row.kind} style={{ display: "contents" }}>
          <ReviewRow projectId={projectId} stepKey={stepKey} config={config} row={row} locked={locked} />
          {!locked && i === addAfter && (
            <button
              type="button"
              className="roles-add-btn design-review-add"
              disabled={addMilestone.isPending}
              onClick={() =>
                addMilestone.mutate({ stepKey, type: config.types.round, date: null, note: "" })
              }
            >
              + Add {config.roundNoun.toLowerCase()}
            </button>
          )}
        </div>
      ))}
      <span className="design-review-summary">
        {roundCountLabel(summary.roundCount, config.roundNoun)}
        {span}
      </span>
    </div>
  );
}
