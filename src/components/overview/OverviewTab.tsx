"use client";

import { OV_SECTION_DEFS } from "@/template";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { ProjectDatesCard } from "./ProjectDatesCard";
import { ProjectInfoBar } from "./ProjectInfoBar";
import { OverviewSection } from "./OverviewSection";
import { SubmissionMap } from "./SubmissionMap";

export function OverviewTab({
  projectId,
  data,
  onOpenStep,
}: {
  projectId: string;
  data: ProjectChecklistData;
  onOpenStep?: (stepKey: string) => void;
}) {
  return (
    <div className="overview-app">
      <ProjectInfoBar data={data} />
      <SubmissionMap projectId={projectId} data={data} onOpenStep={onOpenStep} />
      <ProjectDatesCard data={data} />
      {OV_SECTION_DEFS.map((section) => (
        <OverviewSection key={section.id} projectId={projectId} section={section} data={data} />
      ))}
    </div>
  );
}
