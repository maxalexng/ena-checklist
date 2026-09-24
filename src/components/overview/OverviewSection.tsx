"use client";

import type { OverviewSectionDef } from "@/template";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { formatDateDMY, ppWpExpiryInfo } from "@/lib/checklist/dates";
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
  const isUra = section.id === "ura";
  const ppEntries = isUra ? data.milestonesByStep["ura__PP"] ?? [] : [];
  const expiry = isUra ? ppWpExpiryInfo(ppEntries) : null;

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
        <div className="ov-row">
          {expiry ? (
            <>
              <span className={`ms-expiry ms-expiry-wide ${expiry.status}`}>
                {expiry.kind === "wp" ? "WP Expiry" : "PP Expiry"} — {formatDateDMY(expiry.date)}{" "}
                ({expiry.daysRemaining >= 0 ? `${expiry.daysRemaining} days left` : "expired"})
              </span>
              <span className="ov-hint" style={{ flexBasis: "100%" }}>
                Standard validity: 6 months from PP grant, or 2 years from WP grant (WP supersedes PP once
                granted) — not editable per project. Apply for an extension by{" "}
                <strong>{formatDateDMY(expiry.extensionDeadline)}</strong>, 2 months before expiry.
              </span>
            </>
          ) : (
            <>
              <span className="ov-label">PP / WP Expiry</span>
              <span className="ov-empty">Not enough data to calculate.</span>
              <span className="ov-hint" style={{ flexBasis: "100%" }}>
                Standard validity: 6 months from PP grant, or 2 years from WP grant. Log a &quot;PP Cleared /
                Granted&quot; or &quot;WP Granted&quot; row above (with a date) once one comes through.
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
