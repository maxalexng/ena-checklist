"use client";

import { useState } from "react";
import type { OverviewSectionDef } from "@/template";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { useUpdatePpValidityMonths } from "@/hooks/useOverviewMutations";
import { ppExpiryInfo } from "@/lib/checklist/dates";
import { MilestoneLog } from "./MilestoneLog";

export function OverviewSection({
  projectId,
  section,
  data,
}: {
  projectId: string;
  section: OverviewSectionDef;
  data: ProjectChecklistData;
}) {
  const updatePpValidity = useUpdatePpValidityMonths(projectId);
  const [validityInput, setValidityInput] = useState(data.project.ppValidityMonths);

  const isUra = section.id === "ura";
  const ppEntries = isUra ? data.milestonesByStep["ura__PP"] ?? [] : [];
  const expiry = isUra ? ppExpiryInfo(ppEntries, data.project.ppValidityMonths) : null;

  return (
    <div className="ov-section">
      <div className="ov-section-head">
        <h3>{section.heading}</h3>
      </div>

      {section.logs.map((log) => (
        <MilestoneLog
          key={log.key}
          projectId={projectId}
          stepKey={log.key}
          label={log.label}
          blurb={log.blurb}
          entries={data.milestonesByStep[log.key] ?? []}
          presets={data.project.listPresets[log.key] ?? []}
        />
      ))}

      {isUra && (
        <>
          <div className="ov-row">
            <span className="ov-label">PP Expiry</span>
            {expiry ? (
              <span className={`ms-expiry ${expiry.status}`}>
                {expiry.date} ({expiry.daysRemaining >= 0 ? `${expiry.daysRemaining} days left` : "expired"})
              </span>
            ) : (
              <span className="ov-empty">Not enough data to calculate.</span>
            )}
          </div>
          <div className="ov-row">
            <span className="ov-label">PP validity (months)</span>
            <span className="ov-inputs">
              <input
                type="number"
                min={1}
                max={120}
                value={validityInput}
                onChange={(e) => setValidityInput(e.target.value)}
                onBlur={() => updatePpValidity.mutate({ months: validityInput })}
              />
            </span>
            <span className="ov-hint">
              Used to calculate PP Expiry from whichever row above looks like the latest grant or extension.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
