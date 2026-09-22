"use client";

import { useState } from "react";
import { STATUS_LABEL, nextStatus } from "@/template";
import type { ItemStatus, TemplateItem } from "@/template";
import type { ItemRecord, ResponsibleEntry, RoleRecord } from "@/hooks/useProjectData";
import {
  useAssignRole,
  useRemoveAssign,
  useToggleItemNa,
  useToggleSubcheck,
  useUpdateItemStatus,
} from "@/hooks/useChecklistMutations";

function statusClass(status: ItemStatus, na: boolean) {
  if (na) return "status-chip status-na";
  return `status-chip status-${status}`;
}

export function ItemRow({
  projectId,
  item,
  record,
  index,
  stepCode,
  roles,
  responsible,
  subchecks,
  locked,
}: {
  projectId: string;
  item: TemplateItem;
  record: ItemRecord | undefined;
  index: number;
  stepCode: string;
  roles: RoleRecord[];
  responsible: ResponsibleEntry[];
  subchecks: Record<number, boolean>;
  locked: boolean;
}) {
  const updateStatus = useUpdateItemStatus(projectId);
  const toggleNa = useToggleItemNa(projectId);
  const toggleSubcheck = useToggleSubcheck(projectId);
  const assignRole = useAssignRole(projectId);
  const removeAssign = useRemoveAssign(projectId);

  const [assigning, setAssigning] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [note, setNote] = useState("");

  if (!record) return null;
  const { dbId, status, na } = record;

  const showAgencyTag = item.agencyCode !== stepCode;
  const checkedCount = item.checklist ? item.checklist.filter((_, i) => subchecks[i]).length : 0;

  return (
    <div className={`item${na ? " is-na" : ""}`} data-search={item.text.toLowerCase()}>
      <button
        type="button"
        className={statusClass(status, na)}
        onClick={() => updateStatus.mutate({ itemDbId: dbId, status: nextStatus(na ? "pending" : status) })}
        title="Click to cycle status"
      >
        {na ? STATUS_LABEL.na : STATUS_LABEL[status]}
      </button>

      <span className="item-label">{index + 1}.</span>
      {showAgencyTag && <span className="item-agency-tag">{item.agencyCode}</span>}
      <span className="item-text">{item.text}</span>

      <button
        type="button"
        className={`na-toggle${na ? " active" : ""}`}
        onClick={() => toggleNa.mutate({ itemDbId: dbId, na: !na })}
      >
        N/A
      </button>

      <div className={`item-assign${locked ? " is-locked" : ""}`}>
        <div className="assign-chips">
          {responsible.map((r) => {
            const role = roles.find((ro) => ro.id === r.roleId);
            return (
              <span
                key={r.id}
                className="assign-chip"
                style={{
                  background: `var(--role-${role?.color ?? "slate"}-soft)`,
                  color: `var(--role-${role?.color ?? "slate"})`,
                }}
              >
                {role?.name ?? "?"}
                {r.note ? ` — ${r.note}` : ""}
                {!locked && (
                  <button
                    type="button"
                    className="assign-remove"
                    onClick={() => removeAssign.mutate({ responsibleId: r.id })}
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}
          {!locked && !assigning && (
            <button type="button" className="assign-add-btn" onClick={() => setAssigning(true)}>
              + Assign
            </button>
          )}
        </div>
        {!locked && assigning && (
          <div className="assign-form">
            <select
              className="assign-role-select"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <input
              className="assign-note-input"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button
              type="button"
              className="assign-confirm"
              onClick={() => {
                if (!roleId) return;
                assignRole.mutate({ itemDbId: dbId, roleId, note, sortOrder: responsible.length });
                setAssigning(false);
                setNote("");
              }}
            >
              Add
            </button>
            <button type="button" className="assign-cancel" onClick={() => setAssigning(false)}>
              ×
            </button>
          </div>
        )}
      </div>

      {item.checklist && item.checklist.length > 0 && (
        <div className="item-subchecklist">
          <button type="button" className="subchecklist-toggle" onClick={() => setSubOpen((v) => !v)}>
            {checkedCount}/{item.checklist.length} items {subOpen ? "▾" : "▸"}
          </button>
          {subOpen && (
            <div className="subcheck-list">
              {item.checklist.map((text, i) => (
                <label key={i} className={`subcheck-row${subchecks[i] ? " done" : ""}`}>
                  <input
                    type="checkbox"
                    checked={!!subchecks[i]}
                    onChange={(e) =>
                      toggleSubcheck.mutate({ itemDbId: dbId, checklistIdx: i, checked: e.target.checked })
                    }
                  />
                  <span>{text}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
