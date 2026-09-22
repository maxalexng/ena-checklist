"use client";

import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { STATUS_LABEL } from "@/template";
import type { ItemStatus } from "@/template";

const RING_CIRCUMFERENCE = 169.6; // matches the prototype's hardcoded r≈27 circle

export function SummaryStats({ data }: { data: ProjectChecklistData }) {
  const records = Object.values(data.itemsByKey);
  const applicable = records.filter((r) => !r.na).length;
  const counts: Record<ItemStatus, number> = { pending: 0, progress: 0, submitted: 0, cleared: 0 };
  let naCount = 0;
  records.forEach((r) => {
    if (r.na) {
      naCount++;
    } else {
      counts[r.status]++;
    }
  });
  const pct = applicable > 0 ? Math.round((counts.cleared / applicable) * 100) : 0;
  const offset = RING_CIRCUMFERENCE * (1 - pct / 100);

  return (
    <div className="summary">
      <div className="ring-wrap">
        <svg viewBox="0 0 64 64">
          <circle className="ring-bg" cx="32" cy="32" r="27" />
          <circle
            className="ring-fg"
            cx="32"
            cy="32"
            r="27"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="ring-label">{pct}%</span>
      </div>
      <div className="summary-stats">
        <div className="summary-stat">
          <strong>{counts.pending}</strong>
          <span>
            <span className="dot" style={{ background: "var(--st-pending)" }} />
            {STATUS_LABEL.pending}
          </span>
        </div>
        <div className="summary-stat">
          <strong>{counts.progress}</strong>
          <span>
            <span className="dot" style={{ background: "var(--st-progress)" }} />
            {STATUS_LABEL.progress}
          </span>
        </div>
        <div className="summary-stat">
          <strong>{counts.submitted}</strong>
          <span>
            <span className="dot" style={{ background: "var(--st-submitted)" }} />
            {STATUS_LABEL.submitted}
          </span>
        </div>
        <div className="summary-stat">
          <strong>{counts.cleared}</strong>
          <span>
            <span className="dot" style={{ background: "var(--st-cleared)" }} />
            {STATUS_LABEL.cleared}
          </span>
        </div>
        <div className="summary-stat">
          <strong>{naCount}</strong>
          <span>
            <span className="dot" style={{ background: "var(--st-na)" }} />
            {STATUS_LABEL.na}
          </span>
        </div>
      </div>
    </div>
  );
}
