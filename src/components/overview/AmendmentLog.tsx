"use client";

import { useState } from "react";
import { AMENDMENT_REQUIRED_TYPE } from "@/template";
import type { MilestoneEntry } from "@/hooks/useProjectData";
import { useAddMilestone, useDeleteMilestone, useUpdateMilestone } from "@/hooks/useOverviewMutations";
import { localTodayIso } from "@/lib/checklist/dates";
import { DateInput } from "@/components/DateInput";

/** The note on what needs changing. Kept in the field while typing and saved on leaving it,
 * so a refetch can't drop keys mid-sentence. */
function NoteInput({ entry, label, onSave }: { entry: MilestoneEntry; label: string; onSave: (note: string) => void }) {
  const [note, setNote] = useState(entry.note);
  return (
    <input
      className="ov-amend-note-input"
      placeholder="What needs amending?"
      aria-label={label}
      value={note}
      onChange={(e) => setNote(e.target.value)}
      onBlur={() => note !== entry.note && onSave(note)}
    />
  );
}

/** "Amendment required" notes for one agency, at the bottom of its Overview section: a heads
 * up to the submissions team the moment the project team knows an amendment is coming, with
 * when it was logged and what changes. Each one also marks the agency's Amendment stage on
 * the Submission Map under way. */
export function AmendmentLog({
  projectId,
  agencyLabel,
  logKey,
  entries,
}: {
  projectId: string;
  agencyLabel: string;
  logKey: string;
  entries: MilestoneEntry[];
}) {
  const addMilestone = useAddMilestone(projectId);
  const updateMilestone = useUpdateMilestone(projectId);
  const deleteMilestone = useDeleteMilestone(projectId);

  return (
    <div className="amend-log" data-testid={`amendments-${logKey}`}>
      <div className="amend-log-head">
        <span className="ov-amend-label">Amendments</span>
        <button
          type="button"
          className="amend-required-btn"
          disabled={addMilestone.isPending}
          onClick={() =>
            addMilestone.mutate({ stepKey: logKey, type: AMENDMENT_REQUIRED_TYPE, date: localTodayIso(), note: "" })
          }
        >
          + Amendment required
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="ov-hint">
          None logged. Click the button as soon as you know {agencyLabel} needs an amendment, so the submissions
          team can follow it up.
        </p>
      ) : (
        <div className="amend-list">
          {entries.map((entry, i) => {
            const name = `Amendment ${i + 1}`;
            return (
              <div key={entry.id} className="sl-row amend-row">
                <span className="amend-flag" aria-hidden>
                  ⚠
                </span>
                <span className="amend-name">{name}</span>
                <label className="amend-logged">
                  Logged
                  <DateInput
                    className="ov-amend-date-input"
                    aria-label={`${name} logged on`}
                    value={entry.date ?? ""}
                    onCommit={(date) => updateMilestone.mutate({ id: entry.id, date: date || null })}
                  />
                </label>
                <NoteInput
                  entry={entry}
                  label={`${name} note`}
                  onSave={(note) => updateMilestone.mutate({ id: entry.id, note })}
                />
                <button
                  type="button"
                  className="ov-del"
                  aria-label={`Remove ${name.toLowerCase()}`}
                  onClick={() => deleteMilestone.mutate({ id: entry.id })}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
