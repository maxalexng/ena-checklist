"use client";

import type { ProjectDates } from "@/lib/supabase/database.types";
import { contractProgress, formatDateDMY, type ContractProgressSegment } from "@/lib/checklist/dates";

function pct(fraction: number): string {
  return `${(fraction * 100).toFixed(3)}%`;
}

function months(n: number): string {
  return n.toFixed(1);
}

function Segment({ segment, className }: { segment: ContractProgressSegment; className: string }) {
  return (
    <div
      className={`cp-seg ${className}`}
      style={{ left: pct(segment.start), width: pct(segment.width) }}
      title={`${segment.label}: ${segment.days} day${segment.days === 1 ? "" : "s"}`}
    />
  );
}

/** The contract period as a bar (contract start → TPC), with each EOT appended and a red
 * line for today, or for the actual completion date once it's recorded. */
export function ContractProgressBar({ dates }: { dates: ProjectDates }) {
  const progress = contractProgress(dates);

  if (!progress) {
    return (
      <div className="ov-row ov-row-stack contract-progress">
        <span className="ov-label">Contract Progress</span>
        <span className="ov-calc-note">
          Set the Actual Contract Start and Target Practical Completion to see progress through the contract period.
        </span>
      </div>
    );
  }

  const percent = Math.round(progress.percent);
  const eotDays = progress.eots.reduce((sum, e) => sum + e.days, 0);
  let summary: React.ReactNode;
  if (progress.notStarted) {
    summary = <>Contract starts {formatDateDMY(dates.contractStart)}</>;
  } else if (progress.completed) {
    summary = (
      <>
        Completed at <strong>{percent}%</strong> of the contract period · month {months(progress.monthsElapsed)} of{" "}
        {months(progress.monthsTotal)}
      </>
    );
  } else {
    summary = (
      <>
        <strong>{percent}%</strong> of the contract period elapsed · month {months(progress.monthsElapsed)} of{" "}
        {months(progress.monthsTotal)}
      </>
    );
  }

  return (
    <div className="ov-row ov-row-stack contract-progress">
      <span className="ov-label">Contract Progress</span>
      <div className={`cp-summary${progress.overrun ? " over" : ""}`}>{summary}</div>
      <div
        className="cp-bar"
        role="img"
        aria-label={`Contract progress: ${percent}% of the contract period${eotDays ? " including EOTs" : ""}`}
      >
        <Segment segment={progress.contract} className="cp-contract" />
        {progress.eots.map((e, i) => (
          <Segment key={i} segment={e} className="cp-eot" />
        ))}
        {progress.overrun && <Segment segment={progress.overrun} className="cp-overrun" />}
        <div
          className="cp-marker"
          style={{ left: pct(progress.marker) }}
          title={progress.completed ? `Actual completion ${formatDateDMY(dates.actualCompletion)}` : "Today"}
        />
      </div>
      <div className="cp-legend">
        <span>
          <i className="cp-swatch cp-contract" />
          Contract {formatDateDMY(dates.contractStart)} → {formatDateDMY(dates.practicalCompletion)}
        </span>
        {eotDays > 0 && (
          <span>
            <i className="cp-swatch cp-eot" />
            EOTs +{eotDays} day{eotDays === 1 ? "" : "s"}
          </span>
        )}
        {progress.overrun && (
          <span>
            <i className="cp-swatch cp-overrun" />
            Overrun {progress.overrun.days} day{progress.overrun.days === 1 ? "" : "s"}
          </span>
        )}
        <span>
          <i className="cp-swatch cp-marker-swatch" />
          {progress.completed ? "Actual completion" : "Today"}
        </span>
      </div>
    </div>
  );
}
