"use client";

import { STAGES } from "@/template";
import type { TemplateStep } from "@/template";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import type { StageGroup } from "@/lib/checklist/grouping";

/** The left-hand navigation rail — a persistent, at-a-glance outline of every stage and
 * step (with its number and clear/applicable count), so you don't have to scroll the whole
 * checklist to see what's coming up or jump to a specific step. Mirrors the prototype's own
 * rail; omits its scroll-position tracking (a nice-to-have, not load-bearing). */
export function ChecklistRail({
  groups,
  data,
  onJump,
}: {
  groups: StageGroup[];
  data: ProjectChecklistData;
  onJump: (stepId: string) => void;
}) {
  function progress(step: TemplateStep) {
    const records = step.items.map((it) => data.itemsByKey[it.id]);
    const applicable = records.filter((r) => r && !r.na).length;
    const cleared = records.filter((r) => r && !r.na && r.status === "cleared").length;
    return { applicable, cleared, pct: applicable > 0 ? Math.round((cleared / applicable) * 100) : 0 };
  }

  return (
    <nav className="rail">
      {groups.map((group) => (
        <div className="rail-stage-group" key={group.stage.id}>
          <div className="rail-stage-label">
            <span className="rail-stage-no">Stage {STAGES.findIndex((s) => s.id === group.stage.id) + 1}</span>
            <span className="rail-stage-name">{group.stage.name}</span>
          </div>
          {group.steps.map((step) => {
            const { applicable, cleared, pct } = progress(step);
            return (
              <button type="button" className="rail-item" key={step.id} onClick={() => onJump(step.id)}>
                <div className="rail-top">
                  <span className="rail-code">
                    {step.stepNo}. {step.code}
                  </span>
                  <span className="rail-count">
                    {cleared}/{applicable}
                  </span>
                </div>
                <span className="rail-name">{step.name}</span>
                <div className="rail-bar">
                  <span style={{ width: `${pct}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
