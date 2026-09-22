"use client";

import { useState } from "react";
import type { RoleRecord } from "@/hooks/useProjectData";
import { useAddRole, useCycleRoleColor, useMoveRole, useRenameRole } from "@/hooks/useRoleMutations";

// Local state seeded once from props — see the same-shaped comment in ConsultantsWidget's
// ConsultantRow for why: a sibling row's mutation (color cycle, move) refetches all project
// data, and a plain `defaultValue` on an inline input can lose an in-progress edit when that
// happens before the user blurs the field.
function RoleRow({
  projectId,
  role,
  isFirst,
  isLast,
}: {
  projectId: string;
  role: RoleRecord;
  isFirst: boolean;
  isLast: boolean;
}) {
  const renameRole = useRenameRole(projectId);
  const cycleColor = useCycleRoleColor(projectId);
  const moveRole = useMoveRole(projectId);
  const [name, setName] = useState(role.name);

  return (
    <div className="role-row">
      <div className="row-move-group">
        <button
          type="button"
          className="row-move-btn"
          disabled={isFirst}
          onClick={() => moveRole.mutate({ roleId: role.id, direction: -1 })}
        >
          ▲
        </button>
        <button
          type="button"
          className="row-move-btn"
          disabled={isLast}
          onClick={() => moveRole.mutate({ roleId: role.id, direction: 1 })}
        >
          ▼
        </button>
      </div>
      <button
        type="button"
        className="role-swatch"
        style={{ background: `var(--role-${role.color})` }}
        title="Click to change color"
        onClick={() => cycleColor.mutate({ roleId: role.id, currentColor: role.color })}
      />
      <input
        className="role-name-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() && name !== role.name) renameRole.mutate({ roleId: role.id, name: name.trim() });
        }}
      />
    </div>
  );
}

export function RolesPanel({
  projectId,
  roles,
  onClose,
}: {
  projectId: string;
  roles: RoleRecord[];
  onClose: () => void;
}) {
  const addRole = useAddRole(projectId);
  const [newName, setNewName] = useState("");

  const sorted = [...roles].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="roles-panel">
      <div className="roles-panel-head">
        <h3>Roles</h3>
        <button type="button" className="roles-panel-close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="roles-list">
        {sorted.map((role, i) => (
          <RoleRow key={role.id} projectId={projectId} role={role} isFirst={i === 0} isLast={i === sorted.length - 1} />
        ))}
      </div>
      <div className="roles-add-row">
        <input
          placeholder="New role name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newName.trim()) {
              addRole.mutate({ name: newName.trim() });
              setNewName("");
            }
          }}
        />
        <button
          type="button"
          className="roles-add-btn"
          onClick={() => {
            if (!newName.trim()) return;
            addRole.mutate({ name: newName.trim() });
            setNewName("");
          }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}
