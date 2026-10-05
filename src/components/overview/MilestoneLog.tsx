"use client";

import { useState } from "react";
import { MS_TYPE_PRESETS } from "@/template";
import type { LogCheckpoint } from "@/template";
import type { MilestoneEntry } from "@/hooks/useProjectData";
import {
  useAddMilestone,
  useDeleteMilestone,
  useMoveMilestone,
  useUpdateListPresets,
  useUpdateMilestone,
} from "@/hooks/useOverviewMutations";

export function MilestoneLog({
  projectId,
  stepKey,
  label,
  blurb,
  entries,
  presets,
  checkpoints = [],
}: {
  projectId: string;
  stepKey: string;
  label: string;
  blurb?: string;
  entries: MilestoneEntry[];
  presets: string[];
  /** Fixed rows (e.g. "PP Granted", "WP Granted"): movable like any round, but never deleted. */
  checkpoints?: LogCheckpoint[];
}) {
  const checkpointByType = new Map(checkpoints.map((c) => [c.type, c]));
  // Checkpoints nobody has filled in yet. They show after the logged rows, in template
  // order, until a date, a note or a move gives them a row of their own in the list.
  const unplaced = checkpoints.filter((c) => !entries.some((e) => e.type === c.type));

  /** Gives an unplaced checkpoint its row: after everything logged so far, or just above
   * the last logged row when it's being moved up. */
  function placeCheckpoint(
    checkpoint: LogCheckpoint,
    fields: { date?: string | null; note?: string; aboveLast?: boolean }
  ) {
    addMilestone.mutate({
      stepKey,
      type: checkpoint.type,
      date: fields.date ?? null,
      note: fields.note ?? "",
      aboveLast: fields.aboveLast,
    });
  }

  const addMilestone = useAddMilestone(projectId);
  const updateMilestone = useUpdateMilestone(projectId);
  const deleteMilestone = useDeleteMilestone(projectId);
  const moveMilestone = useMoveMilestone(projectId);
  const updateListPresets = useUpdateListPresets(projectId);

  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [newPreset, setNewPreset] = useState("");

  const datalistId = `presets-${stepKey}`;
  const suggestions = presets.length > 0 ? presets : MS_TYPE_PRESETS;

  return (
    <div className="ov-row-stack" style={{ marginBottom: "10px" }}>
      <span className="ov-label">
        {label}{" "}
        <button
          type="button"
          className="ov-jump"
          onClick={() => setOptionsOpen((v) => !v)}
          style={{ marginLeft: "4px" }}
        >
          ⚙ Options
        </button>
      </span>
      {blurb && <p className="ov-blurb">{blurb}</p>}

      {optionsOpen && (
        <div className="sl-list" style={{ marginBottom: "8px" }}>
          {presets.map((p, i) => (
            <div className="ov-ext-row" key={i}>
              <span className="ov-ext-ord">{i + 1}.</span>
              <input
                className="eot-title-input"
                value={p}
                onChange={(e) => {
                  const next = [...presets];
                  next[i] = e.target.value;
                  updateListPresets.mutate({ stepKey, presets: next });
                }}
              />
              <button
                type="button"
                className="ov-del"
                onClick={() => updateListPresets.mutate({ stepKey, presets: presets.filter((_, j) => j !== i) })}
              >
                ×
              </button>
            </div>
          ))}
          <div className="ov-ext-row">
            <input
              className="eot-title-input"
              placeholder="New preset label"
              value={newPreset}
              onChange={(e) => setNewPreset(e.target.value)}
            />
            <button
              type="button"
              className="file-mini-btn"
              onClick={() => {
                if (!newPreset.trim()) return;
                updateListPresets.mutate({ stepKey, presets: [...presets, newPreset.trim()] });
                setNewPreset("");
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div className="sl-list">
        {entries.map((entry, i) => {
          const checkpoint = checkpointByType.get(entry.type);
          const rowLabel = checkpoint?.label ?? entry.type;
          return (
            <div
              className={`sl-row${checkpoint ? ` ms-checkpoint${entry.date ? " is-reached" : ""}` : ""}`}
              key={entry.id}
              data-checkpoint={checkpoint?.type}
            >
              <div className="row-move-group">
                <button
                  type="button"
                  className="row-move-btn"
                  aria-label={`Move ${rowLabel} up`}
                  disabled={i === 0}
                  onClick={() => moveMilestone.mutate({ stepKey, id: entry.id, direction: -1 })}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="row-move-btn"
                  aria-label={`Move ${rowLabel} down`}
                  disabled={i === entries.length - 1}
                  onClick={() => moveMilestone.mutate({ stepKey, id: entry.id, direction: 1 })}
                >
                  ▼
                </button>
              </div>
              {checkpoint && (
                <span className="ms-checkpoint-mark" aria-hidden="true">
                  {entry.date ? "✓" : "◆"}
                </span>
              )}
              <span className="sl-label">{rowLabel}</span>
              <input
                type="date"
                className="ov-amend-date-input"
                aria-label={`${rowLabel} date`}
                value={entry.date ?? ""}
                onChange={(e) => updateMilestone.mutate({ id: entry.id, date: e.target.value || null })}
              />
              <input
                className="ov-amend-note-input"
                placeholder="Note"
                aria-label={`${rowLabel} note`}
                value={entry.note}
                onChange={(e) => updateMilestone.mutate({ id: entry.id, note: e.target.value })}
              />
              {/* A checkpoint stays in the log for good; clear its date instead. */}
              {!checkpoint && (
                <button type="button" className="ms-del" onClick={() => deleteMilestone.mutate({ id: entry.id })}>
                  ×
                </button>
              )}
            </div>
          );
        })}
        {entries.length === 0 && unplaced.length === 0 && <span className="ov-empty">No entries yet.</span>}
        {unplaced.map((checkpoint) => (
          <div className="sl-row ms-checkpoint" key={checkpoint.type} data-checkpoint={checkpoint.type}>
            <div className="row-move-group">
              <button
                type="button"
                className="row-move-btn"
                aria-label={`Move ${checkpoint.label} up`}
                disabled={entries.length === 0}
                onClick={() => placeCheckpoint(checkpoint, { aboveLast: true })}
              >
                ▲
              </button>
              <button type="button" className="row-move-btn" aria-label={`Move ${checkpoint.label} down`} disabled>
                ▼
              </button>
            </div>
            <span className="ms-checkpoint-mark" aria-hidden="true">
              ◆
            </span>
            <span className="sl-label">{checkpoint.label}</span>
            <input
              type="date"
              className="ov-amend-date-input"
              aria-label={`${checkpoint.label} date`}
              value=""
              onChange={(e) => e.target.value && placeCheckpoint(checkpoint, { date: e.target.value })}
            />
            <input
              className="ov-amend-note-input"
              placeholder="Note"
              aria-label={`${checkpoint.label} note`}
              defaultValue=""
              onBlur={(e) => e.target.value && placeCheckpoint(checkpoint, { note: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="milestone-form">
        <input
          list={datalistId}
          data-field="type"
          placeholder="Type…"
          value={type}
          onChange={(e) => setType(e.target.value)}
        />
        <datalist id={datalistId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <input data-field="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input data-field="note" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button
          type="button"
          className="ms-add"
          onClick={() => {
            if (!type.trim()) return;
            addMilestone.mutate({ stepKey, type: type.trim(), date: date || null, note });
            setType("");
            setDate("");
            setNote("");
          }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}
