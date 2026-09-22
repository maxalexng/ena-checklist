"use client";

import { useState } from "react";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { useUpdateProjectDates } from "@/hooks/useOverviewMutations";
import { adjustedCompletionDate, eotTotalDays, loaSuggestedStart, tpcSuggestedDate } from "@/lib/checklist/dates";

export function ProjectDatesCard({ data }: { data: ProjectChecklistData }) {
  const updateDates = useUpdateProjectDates(data.project.id);
  const dates = data.project.projectDates;
  const [newEotTitle, setNewEotTitle] = useState("");
  const [newEotDays, setNewEotDays] = useState("");

  const loaSuggestion = loaSuggestedStart(dates);
  const tpcSuggestion = tpcSuggestedDate(dates.contractStart, data.project.contractPeriodMonths);
  const adjusted = adjustedCompletionDate(dates);
  const totalEotDays = eotTotalDays(dates);

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
              Suggested: {loaSuggestion.date} ({loaSuggestion.note})
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
      </div>

      <div className="ov-row">
        <span className="ov-label">AI Reference (regularising start)</span>
        <input
          className="ov-amend-note-input"
          value={dates.startAiRef}
          onChange={(e) => updateDates.mutate({ startAiRef: e.target.value })}
          placeholder="AI reference"
        />
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
            <span className="ov-calc-note">Suggested: {tpcSuggestion} (contract start + contract period)</span>
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

      {adjusted && totalEotDays > 0 && (
        <div className="ov-row">
          <span className="ov-label">Adjusted Completion</span>
          <span className="ov-date">
            {adjusted} (+{totalEotDays} day{totalEotDays === 1 ? "" : "s"} EOT)
          </span>
        </div>
      )}

      <div className="ov-row-stack">
        <span className="ov-label">Extensions of Time</span>
        <div className="ov-ext-list">
          {(dates.eot || []).map((e, i) => (
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
    </div>
  );
}
