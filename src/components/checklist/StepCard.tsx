"use client";

import Image from "next/image";
import type { TemplateStep } from "@/template";
import { DESIGN_LOGS, agencyColorFor, agencyLogoSrc } from "@/template";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { effectiveItemOrder, moveItemInOrder, orderedStepItems } from "@/lib/checklist/itemOrder";
import { useToggleStepNa, useUpdateItemOrder } from "@/hooks/useChecklistMutations";
import { ItemRow } from "./ItemRow";
import { Highlight } from "./Highlight";
import { ConsultantsWidget } from "@/components/consultants/ConsultantsWidget";
import { DesignReviewLog } from "./DesignReviewLog";
import { PcSumsWidget } from "@/components/pcSums/PcSumsWidget";

export function StepCard({
  projectId,
  step,
  stepNo,
  stageName,
  data,
  collapsed,
  onToggleCollapsed,
  canMoveUp,
  canMoveDown,
  onMove,
  query,
}: {
  projectId: string;
  step: TemplateStep;
  stepNo: number;
  stageName: string;
  data: ProjectChecklistData;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: -1 | 1) => void;
  /** The live checklist search text; matches are highlighted in the card. */
  query: string;
}) {
  const toggleStepNa = useToggleStepNa(projectId);
  const updateItemOrder = useUpdateItemOrder(projectId);
  const logoSrc = agencyLogoSrc(step.realId);
  const locked = data.project.assignments_locked;

  const itemOrder = effectiveItemOrder(data.project.item_order);
  const items = orderedStepItems(step, itemOrder);
  const records = items.map((it) => data.itemsByKey[it.id]);
  const applicable = records.filter((r) => r && !r.na).length;
  const cleared = records.filter((r) => r && !r.na && r.status === "cleared").length;
  const stepIsNa = records.length > 0 && records.every((r) => r?.na);
  const pct = applicable > 0 ? Math.round((cleared / applicable) * 100) : stepIsNa ? 100 : 0;
  const isOpen = !collapsed;

  const searchBlob = [
    step.code,
    step.name,
    step.blurb,
    step.submission.when || "",
    ...items.map((it) => it.text),
  ]
    .join(" ")
    .toLowerCase();

  function moveItem(itemId: string, direction: -1 | 1) {
    const next = moveItemInOrder(itemOrder, items, itemId, direction);
    if (next) updateItemOrder.mutate(next);
  }

  return (
    <div
      id={`step-${step.id}`}
      className={`agency${isOpen ? "" : " collapsed"}${stepIsNa ? " step-na" : ""}`}
      data-search={searchBlob}
    >
      <div className="agency-head" onClick={onToggleCollapsed}>
        {!locked && (
          <div className="step-order-controls" onClick={(e) => e.stopPropagation()}>
            <div className="step-move-group">
              <button
                type="button"
                className="step-move-btn"
                disabled={!canMoveUp}
                title="Move up — crosses into the previous stage at the top of this one"
                onClick={() => onMove(-1)}
              >
                ▲
              </button>
              <button
                type="button"
                className="step-move-btn"
                disabled={!canMoveDown}
                title="Move down — crosses into the next stage at the bottom of this one"
                onClick={() => onMove(1)}
              >
                ▼
              </button>
            </div>
          </div>
        )}
        {logoSrc ? (
          <div className="agency-logo-wrap" style={{ position: "relative" }}>
            <Image src={logoSrc} alt={step.code} fill sizes="132px" style={{ objectFit: "contain" }} className="agency-logo" />
          </div>
        ) : (
          <span className="agency-code" style={{ background: `var(--role-${agencyColorFor(step.code)})` }}>
            <Highlight text={step.code} query={query} />
          </span>
        )}
        <div className="agency-head-main">
          <div className="agency-head-top">
            <span className="agency-tag step-tag">Step {stepNo}</span>
            <span className="agency-tag stage-tag">{stageName}</span>
            <h3>
              <Highlight text={step.name} query={query} />
            </h3>
            {step.conditional && <span className="agency-tag">If applicable</span>}
            {stepIsNa && <span className="agency-tag step-na-badge">N/A</span>}
          </div>
          <div className="agency-full">
            <Highlight text={step.full} query={query} />
          </div>
          <p className="agency-blurb">
            <Highlight text={step.blurb} query={query} />
          </p>
        </div>
        <div className="agency-meta">
          {items.length > 0 && (
            <>
              <span className="agency-progress-label">
                {cleared}/{applicable}
              </span>
              <div className="agency-bar">
                <span style={{ width: `${pct}%` }} />
              </div>
              <button
                type="button"
                className={`step-na-toggle${stepIsNa ? " active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStepNa.mutate({ stepKey: step.id, na: !stepIsNa });
                }}
              >
                {stepIsNa ? "Not required" : "Mark N/A"}
              </button>
            </>
          )}
        </div>
        <span className="chevron">▾</span>
      </div>

      <div className="submissions">
        {items.length > 0 && (
          <div className="submission">
            <div className="submission-head">
              <span className="code-badge">{step.submission.code}</span>
              <h4>
                <Highlight text={step.submission.name} query={query} />
              </h4>
              {step.submission.conditional && <span className="agency-tag">If applicable</span>}
            </div>
            {step.submission.when && (
              <p className="when">
                <Highlight text={step.submission.when} query={query} />
              </p>
            )}
            <div className="items">
              {items.map((item, i) => (
                <ItemRow
                  key={item.id}
                  projectId={projectId}
                  item={item}
                  record={data.itemsByKey[item.id]}
                  index={i}
                  stepNo={stepNo}
                  stepCode={step.code}
                  roles={data.roles}
                  responsible={data.responsibleByItem[data.itemsByKey[item.id]?.dbId] ?? []}
                  subchecks={data.subchecksByItem[data.itemsByKey[item.id]?.dbId] ?? {}}
                  itemFile={data.itemFilesByItem[data.itemsByKey[item.id]?.dbId]}
                  locked={locked}
                  isFirst={i === 0}
                  isLast={i === items.length - 1}
                  onMove={(direction) => moveItem(item.id, direction)}
                  query={query}
                />
              ))}
            </div>
          </div>
        )}
        {step.isConsultantList && (
          <ConsultantsWidget
            projectId={projectId}
            consultants={data.consultants}
            roles={data.roles}
            locked={locked}
          />
        )}
        {step.designLog && (
          <DesignReviewLog
            projectId={projectId}
            stepKey={step.id}
            config={DESIGN_LOGS[step.designLog]}
            entries={data.milestonesByStep[step.id] ?? []}
            locked={locked}
          />
        )}
        {step.isPcSumSchedule && <PcSumsWidget projectId={projectId} pcSums={data.pcSums} locked={locked} />}
      </div>
    </div>
  );
}
