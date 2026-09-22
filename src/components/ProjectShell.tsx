"use client";

import { useState } from "react";
import Link from "next/link";
import { useProjectData } from "@/hooks/useProjectData";
import { SummaryStats } from "./SummaryStats";
import { ChecklistTab } from "./checklist/ChecklistTab";
import { OverviewTab } from "./overview/OverviewTab";
import { TimelineTab } from "./timeline/TimelineTab";

type Tab = "overview" | "checklist" | "timeline";

export function ProjectShell({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const { data, isLoading, error } = useProjectData(projectId);

  if (isLoading) {
    return (
      <div className="shell">
        <div className="empty-state">Loading…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="shell">
        <div className="empty-state">Failed to load project: {String(error)}</div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="masthead">
        <div className="title-block">
          <span className="eyebrow">{data.project.reference}</span>
          <h1>{data.project.title || "(untitled)"}</h1>
          <p className="subtitle">{data.project.address}</p>
        </div>
        <Link href="/" className="summary-btn">
          ← All projects
        </Link>
      </div>

      <SummaryStats data={data} />

      <div className="seg-toggle" style={{ marginBottom: "18px" }}>
        <button type="button" className={`seg-btn${tab === "overview" ? " active" : ""}`} onClick={() => setTab("overview")}>
          Overview
        </button>
        <button type="button" className={`seg-btn${tab === "checklist" ? " active" : ""}`} onClick={() => setTab("checklist")}>
          Checklist
        </button>
        <button type="button" className={`seg-btn${tab === "timeline" ? " active" : ""}`} onClick={() => setTab("timeline")}>
          Timeline
        </button>
      </div>

      {tab === "checklist" && <ChecklistTab projectId={projectId} data={data} />}
      {tab === "overview" && <OverviewTab projectId={projectId} data={data} />}
      {tab === "timeline" && <TimelineTab projectId={projectId} data={data} />}
    </div>
  );
}
