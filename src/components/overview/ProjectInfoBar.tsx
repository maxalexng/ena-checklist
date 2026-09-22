"use client";

import { useState } from "react";
import { STAGES } from "@/template";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { useUpdateProjectInfo } from "@/hooks/useProjectInfoMutations";

export function ProjectInfoBar({ data }: { data: ProjectChecklistData }) {
  const updateInfo = useUpdateProjectInfo(data.project.id);
  const locked = data.project.assignments_locked;

  const [reference, setReference] = useState(data.project.reference);
  const [title, setTitle] = useState(data.project.title);
  const [address, setAddress] = useState(data.project.address);
  const [initialism, setInitialism] = useState(data.project.initialism);
  const [bcaRef, setBcaRef] = useState(data.project.bcaRef);
  const [contractSum, setContractSum] = useState(data.project.contractSum);
  const [contractPeriod, setContractPeriod] = useState(
    data.project.contractPeriodMonths != null ? String(data.project.contractPeriodMonths) : ""
  );

  return (
    <div className="project-info-bar">
      <div className="pi-row">
        <label className="pi-field">
          <span>Reference</span>
          <input
            value={reference}
            disabled={locked}
            onChange={(e) => setReference(e.target.value)}
            onBlur={() => reference !== data.project.reference && updateInfo.mutate({ reference })}
          />
        </label>
        <label className="pi-field">
          <span>Initialism</span>
          <input
            value={initialism}
            disabled={locked}
            onChange={(e) => setInitialism(e.target.value)}
            onBlur={() => initialism !== data.project.initialism && updateInfo.mutate({ initialism })}
          />
        </label>
        <label className="pi-field">
          <span>BCA Reference</span>
          <input
            value={bcaRef}
            disabled={locked}
            onChange={(e) => setBcaRef(e.target.value)}
            onBlur={() => bcaRef !== data.project.bcaRef && updateInfo.mutate({ bcaRef })}
          />
        </label>
        <label className="pi-field">
          <span>Current Stage</span>
          <select
            value={data.project.currentStage}
            disabled={locked}
            onChange={(e) => updateInfo.mutate({ currentStage: e.target.value })}
          >
            {STAGES.map((s, i) => (
              <option key={s.id} value={s.id}>
                Stage {i + 1} — {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="pi-row">
        <label className="pi-field pi-field-wide">
          <span>Title</span>
          <input
            value={title}
            disabled={locked}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== data.project.title && updateInfo.mutate({ title })}
          />
        </label>
      </div>

      <div className="pi-row">
        <label className="pi-field pi-field-wide">
          <span>Address</span>
          <input
            value={address}
            disabled={locked}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={() => address !== data.project.address && updateInfo.mutate({ address })}
          />
        </label>
      </div>

      <div className="pi-row">
        <label className="pi-field">
          <span>Contract Period</span>
          <input
            id="pi-contract-period"
            type="number"
            min={0}
            disabled={locked}
            value={contractPeriod}
            onChange={(e) => setContractPeriod(e.target.value)}
            onBlur={() => {
              const n = contractPeriod ? Number(contractPeriod) : null;
              if (n !== data.project.contractPeriodMonths) updateInfo.mutate({ contractPeriodMonths: n });
            }}
          />
          <span className="mono" style={{ fontSize: "11px", color: "var(--ink-faint)" }}>
            months
          </span>
        </label>
        <label className="pi-field">
          <span>Contract Sum</span>
          <input
            value={contractSum}
            disabled={locked}
            placeholder="S$0.00"
            onChange={(e) => setContractSum(e.target.value)}
            onBlur={() => contractSum !== data.project.contractSum && updateInfo.mutate({ contractSum })}
          />
        </label>
      </div>
    </div>
  );
}
