"use client";

import { useState } from "react";
import type { ConsultantEntry, RoleRecord } from "@/hooks/useProjectData";
import {
  useAddConsultant,
  useDeleteConsultant,
  useMoveConsultant,
  useUpdateConsultant,
} from "@/hooks/useConsultantMutations";

// Each row owns its own local text state (seeded once from props) rather than a plain
// defaultValue on an inline input — a sibling row's mutation (role/date change, add/remove)
// triggers a full project-data refetch, and this component tree stays mounted (same key)
// across that refetch, so local state here survives it. A bare `defaultValue` on a mapped
// input can still lose an in-progress, not-yet-blurred edit if the row re-renders for any
// reason before the user tabs away.
function ConsultantRow({
  projectId,
  consultant,
  roles,
  isFirst,
  isLast,
}: {
  projectId: string;
  consultant: ConsultantEntry;
  roles: RoleRecord[];
  isFirst: boolean;
  isLast: boolean;
}) {
  const updateConsultant = useUpdateConsultant(projectId);
  const deleteConsultant = useDeleteConsultant(projectId);
  const moveConsultant = useMoveConsultant(projectId);

  const [company, setCompany] = useState(consultant.company);
  const [note, setNote] = useState(consultant.note);

  return (
    <div className="item" style={{ flexWrap: "wrap" }}>
      <div className="row-move-group">
        <button
          type="button"
          className="row-move-btn"
          disabled={isFirst}
          onClick={() => moveConsultant.mutate({ id: consultant.id, direction: -1 })}
        >
          ▲
        </button>
        <button
          type="button"
          className="row-move-btn"
          disabled={isLast}
          onClick={() => moveConsultant.mutate({ id: consultant.id, direction: 1 })}
        >
          ▼
        </button>
      </div>
      <input
        className="eot-title-input"
        placeholder="Company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        onBlur={() => {
          if (company !== consultant.company) updateConsultant.mutate({ id: consultant.id, company });
        }}
      />
      <select
        className="consultant-role-select"
        value={consultant.roleId ?? ""}
        onChange={(e) => updateConsultant.mutate({ id: consultant.id, roleId: e.target.value || null })}
      >
        <option value="">(no role)</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <input
        type="date"
        className="ov-amend-date-input"
        value={consultant.dateSigned ?? ""}
        onChange={(e) => updateConsultant.mutate({ id: consultant.id, dateSigned: e.target.value || null })}
      />
      <button type="button" className="ov-del" onClick={() => deleteConsultant.mutate({ id: consultant.id })}>
        ×
      </button>
      <input
        className="consultant-note-input"
        placeholder="Note (engineer replaced, appointed under main contractor, etc.)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => {
          if (note !== consultant.note) updateConsultant.mutate({ id: consultant.id, note });
        }}
      />
    </div>
  );
}

export function ConsultantsWidget({
  projectId,
  consultants,
  roles,
}: {
  projectId: string;
  consultants: ConsultantEntry[];
  roles: RoleRecord[];
}) {
  const addConsultant = useAddConsultant(projectId);
  const sorted = [...consultants].sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedRoles = [...roles].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="items">
      {sorted.map((c, i) => (
        <ConsultantRow
          key={c.id}
          projectId={projectId}
          consultant={c}
          roles={sortedRoles}
          isFirst={i === 0}
          isLast={i === sorted.length - 1}
        />
      ))}
      {sorted.length === 0 && <span className="ov-empty">No consultants appointed yet.</span>}
      <button
        type="button"
        className="roles-add-btn"
        style={{ alignSelf: "flex-start", marginTop: "8px" }}
        onClick={() => addConsultant.mutate()}
      >
        + Add consultant
      </button>
    </div>
  );
}
