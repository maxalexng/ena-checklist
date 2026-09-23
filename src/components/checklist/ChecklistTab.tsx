"use client";

import { useMemo, useState } from "react";
import { effectiveStepOrder, flattenSteps, moveStepInOrder, orderedStageGroups } from "@/lib/checklist/grouping";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { STAGES } from "@/template";
import { useUpdateStepOrder } from "@/hooks/useChecklistMutations";
import { StepCard } from "./StepCard";
import { ChecklistRail } from "./ChecklistRail";

export function ChecklistTab({ projectId, data }: { projectId: string; data: ProjectChecklistData }) {
  const [search, setSearch] = useState("");
  const [collapsedSteps, setCollapsedSteps] = useState<Record<string, boolean>>({});
  const [jumpMessage, setJumpMessage] = useState<string | null>(null);
  const updateStepOrder = useUpdateStepOrder(projectId);

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

  const visibleGroups = useMemo(
    () => groups.map((g) => ({ ...g, steps: g.steps.filter(stepMatches) })).filter((g) => g.steps.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, query]
  );

  // First/last-in-stage must reflect the true (unfiltered) group boundaries, not the
  // search-narrowed list — otherwise the ▲/▼ buttons could be wrongly enabled/disabled
  // while a search filter happens to hide a step's real neighbor.
  const stagePosition = useMemo(() => {
    const map: Record<string, { isFirst: boolean; isLast: boolean }> = {};
    groups.forEach((g) => {
      g.steps.forEach((s, i) => {
        map[s.id] = { isFirst: i === 0, isLast: i === g.steps.length - 1 };
      });
    });
    return map;
  }, [groups]);

  // "Step N" is a live position in the project's own current order, not the template's
  // fixed default — a step dragged to a different stage renumbers along with everything
  // around it, so the sequence always reads 1, 2, 3, ... with no gaps. Derived from the
  // unfiltered groups so a search filter never renumbers what's on screen.
  const stepNoById = useMemo(() => {
    const map: Record<string, number> = {};
    flattenSteps(groups).forEach((s, i) => {
      map[s.id] = i + 1;
    });
    return map;
  }, [groups]);

  const stageOrdinalById = useMemo(
    () => Object.fromEntries(STAGES.map((s, i) => [s.id, i + 1])),
    []
  );

  function expandAndScrollTo(stepId: string) {
    setCollapsedSteps((prev) => ({ ...prev, [stepId]: false }));
    requestAnimationFrame(() => {
      const el = document.getElementById(`step-${stepId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.classList.add("jump-flash");
      setTimeout(() => el?.classList.remove("jump-flash"), 1400);
    });
  }

  function toggleCollapsed(stepId: string) {
    setCollapsedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  }

  function setAllCollapsed(collapsed: boolean) {
    const next: Record<string, boolean> = {};
    groups.forEach((g) => g.steps.forEach((s) => (next[s.id] = collapsed)));
    setCollapsedSteps(next);
  }

  function moveStep(stepId: string, direction: -1 | 1) {
    const order = effectiveStepOrder(data.project.step_order);
    const next = moveStepInOrder(order, groups, stepId, direction);
    if (next) updateStepOrder.mutate(next);
  }

  function jumpToNextTodo() {
    for (const group of groups) {
      for (const step of group.steps) {
        for (const item of step.items) {
          const record = data.itemsByKey[item.id];
          if (record && !record.na && record.status === "pending") {
            setJumpMessage(null);
            expandAndScrollTo(step.id);
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

      <div className="shell-grid">
        <ChecklistRail
          groups={visibleGroups}
          data={data}
          stepNoById={stepNoById}
          stageOrdinalById={stageOrdinalById}
          onJump={expandAndScrollTo}
        />

        <main className="content">
          {visibleGroups.map((group) => (
            <div className="stage" key={group.stage.id}>
              <div className="stage-head">
                <span className="stage-label">Stage {stageOrdinalById[group.stage.id]}</span>
                <h2>{group.stage.name}</h2>
              </div>
              <div className="stage-steps">
                {group.steps.map((step) => (
                  <StepCard
                    key={step.id}
                    projectId={projectId}
                    step={step}
                    stepNo={stepNoById[step.id] ?? step.stepNo}
                    stageName={group.stage.name}
                    data={data}
                    collapsed={!!collapsedSteps[step.id]}
                    onToggleCollapsed={() => toggleCollapsed(step.id)}
                    isFirstInStage={stagePosition[step.id]?.isFirst ?? true}
                    isLastInStage={stagePosition[step.id]?.isLast ?? true}
                    onMove={(direction) => moveStep(step.id, direction)}
                  />
                ))}
              </div>
            </div>
          ))}

          {visibleGroups.length === 0 && (
            <div className="empty-state">No agencies, submissions, or items match &quot;{search}&quot;.</div>
          )}
        </main>
      </div>
    </div>
  );
}
