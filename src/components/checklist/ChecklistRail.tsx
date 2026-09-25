"use client";

import type { ProjectChecklistData } from "@/hooks/useProjectData";
import type { StageGroup } from "@/lib/checklist/grouping";
import { stageState, stepProgress } from "@/lib/checklist/railStatus";
import { Highlight } from "./Highlight";

/** The left-hand navigation rail — a persistent, at-a-glance outline of every stage and
 * step (with its number and clear/applicable count), so you don't have to scroll the whole
 * checklist to see what's coming up or jump to a specific step. Mirrors the prototype's own
 * rail; omits its scroll-position tracking (a nice-to-have, not load-bearing). Steps that are
 * N/A throughout read as "N/A" rather than an unstarted 0/0, and a stage whose steps are all
 * cleared or N/A is badged complete. */
export function ChecklistRail({
  groups,
  data,
  stepNoById,
  stageOrdinalById,
  onJump,
  query,
}: {
  groups: StageGroup[];
  data: ProjectChecklistData;
  stepNoById: Record<string, number>;
  stageOrdinalById: Record<string, number>;
  onJump: (stepId: string) => void;
  query: string;
}) {
  return (
    <nav className="rail">
      {groups.map((group) => {
        const steps = group.steps.map((step) => ({
          step,
          progress: stepProgress(step.items.map((it) => data.itemsByKey[it.id])),
        }));
        const stage = stageState(steps.map((s) => s.progress));
        return (
          <div className={`rail-stage-group stage-${stage}`} key={group.stage.id}>
            <div className="rail-stage-label">
              <span className="rail-stage-no">Stage {stageOrdinalById[group.stage.id]}</span>
              <span className="rail-stage-name">{group.stage.name}</span>
              {stage === "complete" && <span className="rail-stage-done">✓ Complete</span>}
            </div>
            {steps.map(({ step, progress: { applicable, cleared, pct, state } }) => (
              <button
                type="button"
                className={`rail-item step-${state}`}
                key={step.id}
                onClick={() => onJump(step.id)}
              >
                <div className="rail-top">
                  <span className="rail-code">
                    {stepNoById[step.id] ?? step.stepNo}. <Highlight text={step.code} query={query} />
                  </span>
                  <span className="rail-count">
                    {state === "na" ? "N/A" : state === "done" ? `✓ ${cleared}/${applicable}` : `${cleared}/${applicable}`}
                  </span>
                </div>
                <span className="rail-name">
                  <Highlight text={step.name} query={query} />
                </span>
                <div className="rail-bar">
                  <span style={{ width: `${state === "na" ? 100 : pct}%` }} />
                </div>
              </button>
            ))}
          </div>
        );
      })}
    </nav>
  );
}
