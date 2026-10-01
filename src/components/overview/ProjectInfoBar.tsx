"use client";

import { useState } from "react";
import { STAGES } from "@/template";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { useUpdateProjectInfo } from "@/hooks/useProjectInfoMutations";
import { useUpdateProjectDates } from "@/hooks/useOverviewMutations";
import { certifiedProgress, formatMoney, formatPercent } from "@/lib/payments/interimCertificate";
import { FolderIcon } from "@/components/checklist/FileIcons";

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

  // Interim Certificates live in project_dates (merged atomically, see useUpdateProjectDates).
  const updateDates = useUpdateProjectDates(data.project.id);
  const dates = data.project.projectDates;
  const [icFolderOpen, setIcFolderOpen] = useState(false);
  const [icLink, setIcLink] = useState(dates.icLink ?? "");
  const [icNumber, setIcNumber] = useState(dates.icNumber ?? "");
  const [icValueOfWorks, setIcValueOfWorks] = useState(dates.icValueOfWorks ?? "");
  const progress = certifiedProgress(icValueOfWorks, contractSum);

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

      <div className="pi-row ic-row">
        {/* Same folder toggle as a checklist item's drawing location: hollow when empty,
            filled once a link is saved; the panel drops onto its own line in the row. */}
        <button
          type="button"
          className={`file-toggle-btn ic-folder-btn${dates.icLink ? " has-file" : ""}${icFolderOpen ? " active" : ""}`}
          title={dates.icLink ? "Interim Certificates folder — saved" : "Interim Certificates folder — empty"}
          aria-label={dates.icLink ? "Interim Certificates folder (saved)" : "Interim Certificates folder (empty)"}
          onClick={() => {
            setIcFolderOpen((v) => !v);
            setIcLink(dates.icLink ?? "");
          }}
        >
          <FolderIcon filled={!!dates.icLink} />
        </button>
        <label className="pi-field">
          <span>Latest IC No.</span>
          <input
            id="pi-ic-number"
            value={icNumber}
            disabled={locked}
            placeholder="e.g. 12"
            onChange={(e) => setIcNumber(e.target.value)}
            onBlur={() => icNumber !== (dates.icNumber ?? "") && updateDates.mutate({ icNumber })}
          />
        </label>
        <label className="pi-field">
          <span>Value of Works Done</span>
          <input
            value={icValueOfWorks}
            disabled={locked}
            placeholder="S$0.00"
            onChange={(e) => setIcValueOfWorks(e.target.value)}
            onBlur={() =>
              icValueOfWorks !== (dates.icValueOfWorks ?? "") && updateDates.mutate({ icValueOfWorks })
            }
          />
        </label>
        <div className="pi-field ic-progress">
          {progress ? (
            <>
              <span className={`ms-expiry completion-delay ${progress.overContract ? "soon" : "ok"}`}>
                {formatPercent(progress.percent)} of Contract Sum
              </span>
              <span className="ov-calc-note">
                {formatMoney(progress.valueOfWorks)} / {formatMoney(progress.contractSum)}
                {progress.overContract && " — over the Contract Sum (variations)"}
              </span>
            </>
          ) : (
            <span className="ov-calc-note">Enter the value of works and the Contract Sum to see % of contract.</span>
          )}
        </div>
        {icFolderOpen && (
          <div className="file-panel">
            <span className="file-panel-title">Interim Certificates folder</span>
            <button type="button" className="file-panel-close" onClick={() => setIcFolderOpen(false)}>
              ×
            </button>
            <div className="file-panel-row">
              <input
                className="file-link-input"
                aria-label="Interim Certificates folder link"
                placeholder="Where the Interim Certificates are kept (path or URL)"
                value={icLink}
                disabled={locked}
                onChange={(e) => setIcLink(e.target.value)}
                onBlur={() => icLink !== (dates.icLink ?? "") && updateDates.mutate({ icLink })}
              />
              {/^https?:\/\//i.test(icLink) && (
                <a className="file-mini-btn" href={icLink} target="_blank" rel="noopener noreferrer">
                  Open ↗
                </a>
              )}
              <button
                type="button"
                className="file-mini-btn"
                disabled={!icLink}
                onClick={() => navigator.clipboard.writeText(icLink).catch(() => {})}
              >
                Copy
              </button>
            </div>
          </div>
        )}
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
