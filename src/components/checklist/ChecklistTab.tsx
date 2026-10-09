"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { flattenSteps, orderedStageGroups } from "@/lib/checklist/grouping";
import { effectiveItemOrder, orderedStepItems } from "@/lib/checklist/itemOrder";
import { nextTodoKey } from "@/lib/checklist/nextTodo";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { STAGES } from "@/template";
import { useMoveSharedStep } from "@/hooks/useChecklistMutations";
import { StepCard } from "./StepCard";
import { ChecklistRail } from "./ChecklistRail";

/** Scrolls an element (a step card or an item row) into view and flashes it. */
function scrollToElement(id: string, block: ScrollLogicalPosition) {
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block });
    el?.classList.add("jump-flash");
    setTimeout(() => el?.classList.remove("jump-flash"), 1400);
  });
}

/** Scrolls a step card into view and flashes it. */
function scrollToStep(stepId: string) {
  scrollToElement(`step-${stepId}`, "start");
}

export function ChecklistTab({
  projectId,
  data,
  onOpenPcSums,
  focusStepId,
}: {
  projectId: string;
  data: ProjectChecklistData;
  onOpenPcSums?: () => void;
  /** Step to scroll to on opening, e.g. from the Overview tab's submission map. Every step
   * starts expanded, so scrolling is all it takes. */
  focusStepId?: string | null;
}) {
  const [search, setSearch] = useState("");
  const [collapsedSteps, setCollapsedSteps] = useState<Record<string, boolean>>({});
  // While searching, every matching step opens so the highlighted items are visible. The
  // user can still collapse steps mid-search; those choices are tracked separately, reset
  // whenever the query changes, and the normal collapsed state returns once it's cleared.
  const [searchCollapsed, setSearchCollapsed] = useState<{ query: string; steps: Record<string, boolean> }>({
    query: "",
    steps: {},
  });
  const [jumpMessage, setJumpMessage] = useState<string | null>(null);
  const lastTodoKey = useRef<string | null>(null);
  const moveSharedStep = useMoveSharedStep(projectId);

  const groups = useMemo(
    () => orderedStageGroups(data.project.step_order, data.project.step_stage),
    [data.project.step_order, data.project.step_stage]
  );

  const query = search.trim().toLowerCase();
  const searchCollapsedSteps = searchCollapsed.query === query ? searchCollapsed.steps : {};

  function isCollapsed(stepId: string) {
    return query ? !!searchCollapsedSteps[stepId] : !!collapsedSteps[stepId];
  }

  function updateCollapsed(update: (prev: Record<string, boolean>) => Record<string, boolean>) {
    if (query) setSearchCollapsed({ query, steps: update(searchCollapsedSteps) });
    else setCollapsedSteps(update);
  }

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

  // "Step N" is a live position in the project's own current order, not the template's
  // fixed default — a step dragged to a different stage renumbers along with everything
  // around it, so the sequence always reads 1, 2, 3, ... with no gaps. Derived from the
  // unfiltered groups so a search filter never renumbers what's on screen.
  const flatSteps = useMemo(() => flattenSteps(groups), [groups]);
  const stepNoById = useMemo(() => {
    const map: Record<string, number> = {};
    flatSteps.forEach((s, i) => {
      map[s.id] = i + 1;
    });
    return map;
  }, [flatSteps]);

  // A step can now move into an adjacent stage once it hits the top/bottom of its own — so
  // the only real "can't move further" case left is the very first step overall (nothing
  // before Stage 1) or the very last (nothing after the last stage). Reflects the true
  // (unfiltered) order, not the search-narrowed list, so a search filter can't make the
  // ▲/▼ buttons wrongly enabled/disabled.
  const isGlobalFirst = flatSteps[0]?.id;
  const isGlobalLast = flatSteps[flatSteps.length - 1]?.id;

  const stageOrdinalById = useMemo(
    () => Object.fromEntries(STAGES.map((s, i) => [s.id, i + 1])),
    []
  );

  function expandAndScrollTo(stepId: string) {
    updateCollapsed((prev) => ({ ...prev, [stepId]: false }));
    scrollToStep(stepId);
  }

  useEffect(() => {
    if (focusStepId) scrollToStep(focusStepId);
  }, [focusStepId]);

  function toggleCollapsed(stepId: string) {
    updateCollapsed((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  }

  function setAllCollapsed(collapsed: boolean) {
    const next: Record<string, boolean> = {};
    groups.forEach((g) => g.steps.forEach((s) => (next[s.id] = collapsed)));
    updateCollapsed(() => next);
  }

  // The step order is shared by every project, so this moves the step everywhere.
  function moveStep(stepId: string, direction: -1 | 1) {
    moveSharedStep.mutate({ stepId, direction });
  }

  // Every item on screen, in on-screen order (stage, step, then the project's item order),
  // mapped to the step it sits in so a collapsed step can be opened before jumping into it.
  const itemOrder = effectiveItemOrder(data.project.item_order);
  const visibleItems = visibleGroups.flatMap((g) =>
    g.steps.flatMap((step) => orderedStepItems(step, itemOrder).map((item) => ({ key: item.id, stepId: step.id })))
  );

  function isTodo(key: string) {
    const record = data.itemsByKey[key];
    return !!record && !record.na && record.status === "pending";
  }

  // Each click carries on from the item the previous click landed on, so repeated clicks
  // walk through every to-do in turn. After the last one, the next click starts over.
  function jumpToNextTodo() {
    const keys = visibleItems.map((it) => it.key);
    const next = nextTodoKey(keys, isTodo, lastTodoKey.current);
    if (next) {
      lastTodoKey.current = next;
      setJumpMessage(null);
      const stepId = visibleItems.find((it) => it.key === next)!.stepId;
      updateCollapsed((prev) => ({ ...prev, [stepId]: false }));
      scrollToElement(`item-${next}`, "center");
      return;
    }
    setJumpMessage(lastTodoKey.current ? "✓ No more to-dos" : "✓ All caught up");
    lastTodoKey.current = null;
    setTimeout(() => setJumpMessage(null), 1600);
  }

  return (
    <div>
      <div className="checklist-fabs">
        <button type="button" className="fab" onClick={jumpToNextTodo}>
          {jumpMessage ?? "⏭ Next to-do"}
        </button>
      </div>

      <div className="summary">
        <div className="summary-btn-group" style={{ flex: "1 1 auto" }}>
          <div className="summary-btn-row">
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
          query={query}
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
                    collapsed={isCollapsed(step.id)}
                    onToggleCollapsed={() => toggleCollapsed(step.id)}
                    canMoveUp={step.id !== isGlobalFirst}
                    canMoveDown={step.id !== isGlobalLast}
                    onMove={(direction) => moveStep(step.id, direction)}
                    query={query}
                    onOpenPcSums={onOpenPcSums}
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
