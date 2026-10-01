"use client";

import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { PcSumsWidget } from "./PcSumsWidget";

// The PC sum schedule gets its own tab: the table is too wide and busy to sit inside its
// checklist step (admin__PCSUMS), which now just shows the roll-up and links here.
export function PcSumsTab({ projectId, data }: { projectId: string; data: ProjectChecklistData }) {
  return (
    <div className="overview-app">
      <div className="ov-section">
        <div className="ov-section-head">
          <h3>PC Sum Schedule &amp; Client Selections</h3>
        </div>
        <p className="ov-blurb">
          Run through every possible PC (Prime Cost) sum item with the client: whether it&apos;s the client&apos;s own
          choice, our recommendation, or specified in the contract (priced within the contract sum, so no allowance),
          the supplier or brand agreed, and the allowance carried into the tender. Mark items not in this project N/A.
        </p>
        <PcSumsWidget projectId={projectId} pcSums={data.pcSums} locked={data.project.assignments_locked} />
      </div>
    </div>
  );
}
