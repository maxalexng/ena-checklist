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
          Run through every possible PC (Prime Cost) sum item with the client, phase by phase in the order they have
          to be decided on site: whether it&apos;s the client&apos;s own choice, our recommendation, or specified in the
          contract (priced within the contract sum, so no allowance), and the allowance carried into the tender. Expand
          an item to record the 2–3 supplier quotes put to the client, star our recommendation, and pick who it was
          awarded to; the Awarded and Variance columns then show whether it came in within the allowance. Mark items
          not in this project N/A.
        </p>
        <PcSumsWidget projectId={projectId} pcSums={data.pcSums} locked={data.project.assignments_locked} />
      </div>
    </div>
  );
}
