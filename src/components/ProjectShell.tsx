"use client";

import { useState } from "react";
import Link from "next/link";
import { useProjectData } from "@/hooks/useProjectData";
import { SummaryStats } from "./SummaryStats";
import { ChecklistTab } from "./checklist/ChecklistTab";
import { OverviewTab } from "./overview/OverviewTab";
import { TimelineTab } from "./timeline/TimelineTab";
import { RolesPanel } from "./roles/RolesPanel";
import { LockFab } from "./LockFab";

type Tab = "overview" | "checklist" | "timeline";

export function ProjectShell({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [rolesOpen, setRolesOpen] = useState(false);
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
      <LockFab projectId={projectId} locked={data.project.assignments_locked} />
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

      <div className="summary-btn-row" style={{ marginBottom: "18px" }}>
        <div className="seg-toggle">
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
        <button type="button" className="summary-btn" style={{ marginLeft: "auto" }} onClick={() => setRolesOpen((v) => !v)}>
          Roles
        </button>
      </div>

      {rolesOpen && <RolesPanel projectId={projectId} roles={data.roles} onClose={() => setRolesOpen(false)} />}

      {tab === "checklist" && <ChecklistTab projectId={projectId} data={data} />}
      {tab === "overview" && <OverviewTab projectId={projectId} data={data} />}
      {tab === "timeline" && <TimelineTab projectId={projectId} data={data} />}
    </div>
  );
}
