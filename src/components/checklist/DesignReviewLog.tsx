"use client";

import { useState } from "react";
import type { MilestoneEntry } from "@/hooks/useProjectData";
import { useAddMilestone, useDeleteMilestone, useUpdateMilestone } from "@/hooks/useOverviewMutations";
import {
  DESIGN_REVIEW_TYPES,
  formatDayGap,
  summarizeDesignReviews,
  type DesignReviewRow,
} from "@/lib/checklist/designReviews";

// The Concept Design step's dated log: Produce Initial Concept Design, then any number of
// presentations, then Revise and Confirm Design. The two fixed rows exist before they have
// a milestone behind them; the first edit to one creates it.
function ReviewRow({
  projectId,
  stepKey,
  row,
  locked,
}: {
  projectId: string;
  stepKey: string;
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
        type: DESIGN_REVIEW_TYPES[row.kind],
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
      {!locked && row.kind === "presentation" && entry && (
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
  entries,
  locked,
}: {
  projectId: string;
  stepKey: string;
  entries: MilestoneEntry[];
  locked: boolean;
}) {
  const addMilestone = useAddMilestone(projectId);
  const summary = summarizeDesignReviews(entries);
  // The confirm row is always last, so the add button goes right before it.
  const addAfter = summary.rows.length - 2;

  const count = summary.presentationCount;
  let span = "";
  if (summary.totalDays !== null) {
    span = summary.confirmed
      ? ` · ${formatDayGap(summary.totalDays)} from initial design to confirmation`
      : ` · ${formatDayGap(summary.totalDays)} so far`;
  }

  return (
    <div className="items design-review-log">
      {summary.rows.map((row, i) => (
        <div key={row.entry?.id ?? row.kind} style={{ display: "contents" }}>
          <ReviewRow projectId={projectId} stepKey={stepKey} row={row} locked={locked} />
          {!locked && i === addAfter && (
            <button
              type="button"
              className="roles-add-btn design-review-add"
              disabled={addMilestone.isPending}
              onClick={() =>
                addMilestone.mutate({ stepKey, type: DESIGN_REVIEW_TYPES.presentation, date: null, note: "" })
              }
            >
              + Add presentation
            </button>
          )}
        </div>
      ))}
      <span className="design-review-summary">
        {count} presentation{count === 1 ? "" : "s"}
        {span}
      </span>
    </div>
  );
}
