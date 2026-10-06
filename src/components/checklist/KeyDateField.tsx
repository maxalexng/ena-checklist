"use client";

import { KEY_DATES, type KeyDateId } from "@/template";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { useUpdateProjectDates } from "@/hooks/useOverviewMutations";

/** A step's key date (template/keyDates.ts), shown after its items. The Overview tab edits
 * the same project_dates field, so the date shows in both places. */
export function KeyDateField({
  projectId,
  keyDate,
  data,
  locked,
}: {
  projectId: string;
  keyDate: KeyDateId;
  data: ProjectChecklistData;
  locked: boolean;
}) {
  const updateDates = useUpdateProjectDates(projectId);
  const { field, label } = KEY_DATES[keyDate];
  const value = (data.project.projectDates[field] as string | undefined) ?? "";

  return (
    <div className="pc-step-link key-date-field">
      <label className="pd-field">
        <span className="ov-label">{label}</span>
        <input
          type="date"
          aria-label={label}
          className="ov-amend-date-input"
          value={value}
          disabled={locked}
          onChange={(e) => updateDates.mutate({ [field]: e.target.value })}
        />
      </label>
      <span className="ov-calc-note">Also shown on the Overview tab.</span>
    </div>
  );
}
