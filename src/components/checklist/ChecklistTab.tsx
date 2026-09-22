"use client";

import { useMemo, useState } from "react";
import { orderedStageGroups } from "@/lib/checklist/grouping";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { StepCard } from "./StepCard";

export function ChecklistTab({ projectId, data }: { projectId: string; data: ProjectChecklistData }) {
  const [search, setSearch] = useState("");
  const [collapsedSteps, setCollapsedSteps] = useState<Record<string, boolean>>({});
  const [jumpMessage, setJumpMessage] = useState<string | null>(null);

  const groups = useMemo(
    () => orderedStageGroups(data.project.step_order, data.project.step_stage),
    [data.project.step_order, data.project.step_stage]
  );

  const query = search.trim().toLowerCase();

  function stepMatches(step: (typeof groups)[number]["steps"][number]) {
    if (!query) return true;
    const blob = [step.code, step.name, step.blurb, step.submission.when || "", ...step.items.map((it) => it.text)]
      .join(" ")
      .toLowerCase();
    return blob.includes(query);
  }

  function toggleCollapsed(stepId: string) {
    setCollapsedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  }

  function setAllCollapsed(collapsed: boolean) {
    const next: Record<string, boolean> = {};
    groups.forEach((g) => g.steps.forEach((s) => (next[s.id] = collapsed)));
    setCollapsedSteps(next);
  }

  function jumpToNextTodo() {
    for (const group of groups) {
      for (const step of group.steps) {
        for (const item of step.items) {
          const record = data.itemsByKey[item.id];
          if (record && !record.na && record.status === "pending") {
            setCollapsedSteps((prev) => ({ ...prev, [step.id]: false }));
            setJumpMessage(null);
            requestAnimationFrame(() => {
              const el = document.getElementById(`step-${step.id}`);
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
              el?.classList.add("jump-flash");
              setTimeout(() => el?.classList.remove("jump-flash"), 1400);
            });
            return;
          }
        }
      }
    }
    setJumpMessage("✓ All caught up");
    setTimeout(() => setJumpMessage(null), 1600);
  }

  return (
    <div>
      <div className="summary">
        <div className="summary-btn-group" style={{ flex: "1 1 auto" }}>
          <div className="summary-btn-row">
            <div className="summary-btn-row-left">
              <button type="button" className="summary-btn" onClick={jumpToNextTodo}>
                {jumpMessage ?? "⏭ Next to-do"}
              </button>
            </div>
            <div className="search-wrap" style={{ marginLeft: 0, flex: "1 1 240px" }}>
              <input
                className="search-input"
                placeholder="Search checklist…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="summary-btn-row-right">
              <div className="seg-toggle">
                <button type="button" className="seg-btn" onClick={() => setAllCollapsed(false)}>
                  Expand all
                </button>
                <button type="button" className="seg-btn" onClick={() => setAllCollapsed(true)}>
                  Collapse all
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {groups.map((group) => {
        const visibleSteps = group.steps.filter(stepMatches);
        if (visibleSteps.length === 0) return null;
        return (
          <div className="stage" key={group.stage.id}>
            <div className="stage-head">
              <span className="stage-label">{group.stage.id.toUpperCase()}</span>
              <h2>{group.stage.name}</h2>
            </div>
            <div className="stage-steps">
              {visibleSteps.map((step) => (
                <StepCard
                  key={step.id}
                  projectId={projectId}
                  step={step}
                  data={data}
                  collapsed={!!collapsedSteps[step.id]}
                  onToggleCollapsed={() => toggleCollapsed(step.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {groups.every((g) => g.steps.filter(stepMatches).length === 0) && (
        <div className="empty-state">No agencies, submissions, or items match &quot;{search}&quot;.</div>
      )}
    </div>
  );
}
