"use client";

import { useState } from "react";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { useUpdateProjectDates } from "@/hooks/useOverviewMutations";
import {
  adjustedCompletionDate,
  completionDelay,
  eotTotalDays,
  formatDateDMY,
  loaSuggestedStart,
  tpcSuggestedDate,
  type CompletionDelay,
} from "@/lib/checklist/dates";
import { KEY_DATES } from "@/template";
import { ContractProgressBar } from "./ContractProgressBar";

function days(n: number): string {
  return `${n} day${n === 1 ? "" : "s"}`;
}

function delayText({ completed, daysLate }: CompletionDelay): string {
  if (completed) {
    if (daysLate > 0) return `Completed ${days(daysLate)} late`;
    return daysLate === 0 ? "Completed on time" : `Completed ${days(-daysLate)} early`;
  }
  if (daysLate > 0) return `${days(daysLate)} late — not yet complete`;
  return daysLate === 0 ? "Due today" : `${days(-daysLate)} to go`;
}

export function ProjectDatesCard({ data }: { data: ProjectChecklistData }) {
  const updateDates = useUpdateProjectDates(data.project.id);
  const dates = data.project.projectDates;
  const [newEotTitle, setNewEotTitle] = useState("");
  const [newEotDays, setNewEotDays] = useState("");

  const loaSuggestion = loaSuggestedStart(dates);
  const tpcSuggestion = tpcSuggestedDate(dates.contractStart, data.project.contractPeriodMonths);
  const adjusted = adjustedCompletionDate(dates);
  const totalEotDays = eotTotalDays(dates);
  const eots = dates.eot || [];
  const delay = completionDelay(dates);

  return (
    <div className="project-dates-bar" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div className="pi-row">
        <label className="pd-field">
          <span className="mono" style={{ fontSize: "11px", color: "var(--ink-soft)" }}>
            Contract Signed
          </span>
          <input
            type="date"
            value={dates.contractSigned}
            onChange={(e) => updateDates.mutate({ contractSigned: e.target.value })}
          />
        </label>
        <label className="pd-field">
          <span className="mono" style={{ fontSize: "11px", color: "var(--ink-soft)" }}>
            LOA Signed
          </span>
          <input
            type="date"
            value={dates.loaSigned}
            onChange={(e) => updateDates.mutate({ loaSigned: e.target.value })}
          />
        </label>
      </div>

      <div className="ov-row">
        <span className="ov-label">Actual Contract Start</span>
        <input
          type="date"
          className="ov-amend-date-input"
          value={dates.contractStart}
          onChange={(e) => updateDates.mutate({ contractStart: e.target.value })}
        />
        {loaSuggestion.date && dates.contractStart !== loaSuggestion.date && (
          <>
            <span className="ov-calc-note">
              Suggested: {formatDateDMY(loaSuggestion.date)} ({loaSuggestion.note})
            </span>
            <button
              type="button"
              className="ov-jump"
              onClick={() => updateDates.mutate({ contractStart: loaSuggestion.date! })}
            >
              Use this date →
            </button>
          </>
        )}
        {loaSuggestion.note && !loaSuggestion.date && <span className="ov-calc-note">{loaSuggestion.note}</span>}
        <label className="ov-sub-row">
          <span className="ov-sub-label">AI Reference (regularising start)</span>
          <input
            className="ov-amend-note-input"
            value={dates.startAiRef}
            onChange={(e) => updateDates.mutate({ startAiRef: e.target.value })}
            placeholder="AI reference"
          />
        </label>
      </div>

      <div className="ov-row">
        <span className="ov-label">Target Practical Completion</span>
        <input
          type="date"
          className="ov-amend-date-input"
          value={dates.practicalCompletion}
          onChange={(e) => updateDates.mutate({ practicalCompletion: e.target.value })}
        />
        {tpcSuggestion && dates.practicalCompletion !== tpcSuggestion && (
          <>
            <span className="ov-calc-note">
              Suggested: {formatDateDMY(tpcSuggestion)} (contract start + contract period)
            </span>
            <button type="button" className="ov-jump" onClick={() => updateDates.mutate({ practicalCompletion: tpcSuggestion })}>
              Use this date →
            </button>
          </>
        )}
      </div>
      <div className="ov-row">
        <span className="ov-label">Completion note</span>
        <input
          className="ov-amend-note-input"
          value={dates.practicalCompletionNote}
          onChange={(e) => updateDates.mutate({ practicalCompletionNote: e.target.value })}
        />
      </div>
      <div className="ov-row">
        <span className="ov-label">{KEY_DATES.spTesting.label}</span>
        <input
          type="date"
          aria-label={KEY_DATES.spTesting.label}
          className="ov-amend-date-input"
          value={dates.spTestingDate ?? ""}
          onChange={(e) => updateDates.mutate({ spTestingDate: e.target.value })}
        />
        <span className="ov-calc-note">Holds up the turn-on and TOP — also on the Checklist step.</span>
      </div>

      <div className="ov-row-stack">
        <span className="ov-label">Extensions of Time</span>
        <div className="ov-ext-list">
          {eots.map((e, i) => (
            <div className="ov-ext-row" key={i}>
              <span className="ov-ext-ord">{i + 1}.</span>
              <input
                className="eot-title-input"
                value={e.title}
                onChange={(ev) => {
                  const next = [...dates.eot];
                  next[i] = { ...next[i], title: ev.target.value };
                  updateDates.mutate({ eot: next });
                }}
              />
              <div className="eot-days-field">
                <input
                  type="number"
                  className="eot-days-input"
                  value={e.days}
                  onChange={(ev) => {
                    const next = [...dates.eot];
                    next[i] = { ...next[i], days: Number(ev.target.value) || 0 };
                    updateDates.mutate({ eot: next });
                  }}
                />
                days
              </div>
              <button
                type="button"
                className="ov-del"
                onClick={() => updateDates.mutate({ eot: dates.eot.filter((_, j) => j !== i) })}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {eots.length > 0 && (
          <div className="ov-ext-total">
            <span>
              Total: <strong>{eots.length}</strong> EOT{eots.length === 1 ? "" : "s"} issued ·{" "}
              <strong>{totalEotDays}</strong> day{totalEotDays === 1 ? "" : "s"} awarded
            </span>
            {adjusted ? (
              <span>
                Extended Completion: <strong className="mono">{formatDateDMY(adjusted)}</strong>{" "}
                <span className="ov-calc-note">
                  (Target Practical Completion {formatDateDMY(dates.practicalCompletion)} + {totalEotDays} day
                  {totalEotDays === 1 ? "" : "s"})
                </span>
              </span>
            ) : (
              <span className="ov-calc-note">Set a Target Practical Completion to see the extended date.</span>
            )}
          </div>
        )}
        <div className="ov-ext-row">
          <input
            id="eot-add-title"
            placeholder="EOT title"
            value={newEotTitle}
            onChange={(e) => setNewEotTitle(e.target.value)}
          />
          <input
            id="eot-add-days"
            type="number"
            placeholder="Days"
            value={newEotDays}
            onChange={(e) => setNewEotDays(e.target.value)}
          />
          <button
            type="button"
            className="file-mini-btn"
            onClick={() => {
              if (!newEotTitle.trim()) return;
              updateDates.mutate({
                eot: [...(dates.eot || []), { title: newEotTitle.trim(), days: Number(newEotDays) || 0 }],
              });
              setNewEotTitle("");
              setNewEotDays("");
            }}
          >
            + Add EOT
          </button>
        </div>
      </div>

      <div className="ov-row">
        <span className="ov-label">Actual Completion</span>
        <input
          type="date"
          className="ov-amend-date-input"
          value={dates.actualCompletion ?? ""}
          onChange={(e) => updateDates.mutate({ actualCompletion: e.target.value })}
        />
        {delay ? (
          <>
            <span className={`ms-expiry completion-delay ${delay.status}`}>{delayText(delay)}</span>
            <span className="ov-calc-note">vs Extended Completion {formatDateDMY(delay.extendedDate)}</span>
          </>
        ) : (
          <span className="ov-calc-note">Set a Target Practical Completion to track days late.</span>
        )}
      </div>

      <ContractProgressBar dates={dates} />
    </div>
  );
}
