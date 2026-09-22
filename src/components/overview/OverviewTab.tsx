"use client";

import { OV_SECTION_DEFS } from "@/template";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { ProjectDatesCard } from "./ProjectDatesCard";
import { ProjectInfoBar } from "./ProjectInfoBar";
import { OverviewSection } from "./OverviewSection";

export function OverviewTab({ projectId, data }: { projectId: string; data: ProjectChecklistData }) {
  return (
    <div className="overview-app">
      <ProjectInfoBar data={data} />
      <ProjectDatesCard data={data} />
      {OV_SECTION_DEFS.map((section) => (
        <OverviewSection key={section.id} projectId={projectId} section={section} data={data} />
      ))}
    </div>
  );
}
