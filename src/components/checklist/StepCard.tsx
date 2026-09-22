"use client";

import Image from "next/image";
import type { TemplateStep } from "@/template";
import { agencyColorFor, agencyLogoSrc } from "@/template";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { useToggleStepNa } from "@/hooks/useChecklistMutations";
import { ItemRow } from "./ItemRow";

export function StepCard({
  projectId,
  step,
  data,
  collapsed,
  onToggleCollapsed,
}: {
  projectId: string;
  step: TemplateStep;
  data: ProjectChecklistData;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const toggleStepNa = useToggleStepNa(projectId);
  const logoSrc = agencyLogoSrc(step.realId);

  const items = step.items;
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

  return (
    <div
      id={`step-${step.id}`}
      className={`agency${isOpen ? "" : " collapsed"}${stepIsNa ? " step-na" : ""}`}
      data-search={searchBlob}
    >
      <div className="agency-head" onClick={onToggleCollapsed}>
        {logoSrc ? (
          <div className="agency-logo-wrap" style={{ position: "relative" }}>
            <Image src={logoSrc} alt={step.code} fill sizes="132px" style={{ objectFit: "contain" }} className="agency-logo" />
          </div>
        ) : (
          <span className="agency-code" style={{ background: `var(--role-${agencyColorFor(step.code)})` }}>
            {step.code}
          </span>
        )}
        <div className="agency-head-main">
          <div className="agency-head-top">
            <h3>{step.name}</h3>
            {step.conditional && <span className="agency-tag">If applicable</span>}
            {stepIsNa && <span className="agency-tag step-na-badge">N/A</span>}
          </div>
          <div className="agency-full">{step.full}</div>
          <p className="agency-blurb">{step.blurb}</p>
        </div>
        <div className="agency-meta">
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
        </div>
        <span className="chevron">▾</span>
      </div>

      <div className="submissions">
        <div className="submission">
          <div className="submission-head">
            <span className="code-badge">{step.submission.code}</span>
            <h4>{step.submission.name}</h4>
          </div>
          {step.submission.when && <p className="when">{step.submission.when}</p>}
          <div className="items">
            {items.map((item, i) => (
              <ItemRow
                key={item.id}
                projectId={projectId}
                item={item}
                record={data.itemsByKey[item.id]}
                index={i}
                stepCode={step.code}
                roles={data.roles}
                responsible={data.responsibleByItem[data.itemsByKey[item.id]?.dbId] ?? []}
                subchecks={data.subchecksByItem[data.itemsByKey[item.id]?.dbId] ?? {}}
                locked={data.project.assignments_locked}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
