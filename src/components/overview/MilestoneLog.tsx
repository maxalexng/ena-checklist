"use client";

import { useState } from "react";
import { MS_TYPE_PRESETS } from "@/template";
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
}: {
  projectId: string;
  stepKey: string;
  label: string;
  blurb?: string;
  entries: MilestoneEntry[];
  presets: string[];
}) {
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
        {entries.map((entry, i) => (
          <div className="sl-row" key={entry.id}>
            <div className="row-move-group">
              <button
                type="button"
                className="row-move-btn"
                disabled={i === 0}
                onClick={() => moveMilestone.mutate({ stepKey, id: entry.id, direction: -1 })}
              >
                ▲
              </button>
              <button
                type="button"
                className="row-move-btn"
                disabled={i === entries.length - 1}
                onClick={() => moveMilestone.mutate({ stepKey, id: entry.id, direction: 1 })}
              >
                ▼
              </button>
            </div>
            <span className="sl-label">{entry.type}</span>
            <input
              type="date"
              className="ov-amend-date-input"
              value={entry.date ?? ""}
              onChange={(e) => updateMilestone.mutate({ id: entry.id, date: e.target.value || null })}
            />
            <input
              className="ov-amend-note-input"
              placeholder="Note"
              value={entry.note}
              onChange={(e) => updateMilestone.mutate({ id: entry.id, note: e.target.value })}
            />
            <button type="button" className="ms-del" onClick={() => deleteMilestone.mutate({ id: entry.id })}>
              ×
            </button>
          </div>
        ))}
        {entries.length === 0 && <span className="ov-empty">No entries yet.</span>}
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
