"use client";

import { useState } from "react";
import { NPARKS_CATEGORIES, PUB_PROJECT_TYPES } from "@/template";
import type { NParksCategoryId, PubProjectType } from "@/template";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { useUpdateFeeCalculatorInputs } from "@/hooks/useFeeCalculatorMutations";
import {
  computeFeeBreakdown,
  defaultFeeCalculatorInputs,
  feeBreakdownTotal,
  roundedSgfa,
  type FeeCalculatorInputs,
} from "@/lib/fees/feeCalculator";

function formatSgd(n: number): string {
  return `S$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Merges saved inputs (a possibly-partial JSONB blob — some or all fields may never have
 * been written yet) over the calculator's own defaults, so every field always has a
 * concrete value to show and compute from. */
function resolvedInputs(saved: ProjectChecklistData["project"]["feeCalculatorInputs"]): FeeCalculatorInputs {
  return { ...defaultFeeCalculatorInputs(), ...saved } as FeeCalculatorInputs;
}

export function FeesTab({ projectId, data }: { projectId: string; data: ProjectChecklistData }) {
  const updateInputs = useUpdateFeeCalculatorInputs(projectId);
  const locked = data.project.assignments_locked;
  const saved = resolvedInputs(data.project.feeCalculatorInputs);

  // Local text state for the free-typing number fields (seeded once from props, same
  // pattern as ProjectInfoBar/ProjectDatesCard) — committed on blur via the merge RPC, one
  // field at a time, so two fields being edited close together can't race each other.
  const [sgfaInput, setSgfaInput] = useState(String(saved.sgfa));
  const [unitsInput, setUnitsInput] = useState(String(saved.units));
  const [resubInput, setResubInput] = useState(String(saved.uraResubmissions));
  const [ltaInput, setLtaInput] = useState(String(saved.ltaSubmissionsFrom4th));
  const [bcaStoreysInput, setBcaStoreysInput] = useState(String(saved.bcaBpAmendmentStoreys));
  const [scdfStoreysInput, setScdfStoreysInput] = useState(String(saved.scdfFswAmendmentStoreys));
  const [ppExtInput, setPpExtInput] = useState(String(saved.uraPpExtensionFee));
  const [wpExtInput, setWpExtInput] = useState(String(saved.uraWpExtensionFee));

  function commitNumber(field: keyof FeeCalculatorInputs, raw: string, previous: number) {
    const n = Number(raw) || 0;
    if (n !== previous) updateInputs.mutate({ [field]: n });
  }

  const lines = computeFeeBreakdown(saved);
  const total = feeBreakdownTotal(lines);

  return (
    <div className="overview-app">
      <div className="ov-section">
        <div className="ov-section-head">
          <h3>Step 1 — Project Inputs</h3>
        </div>
        <p className="ov-blurb">
          Fill in the fields below — every fee in the breakdown recalculates automatically. Leave a field at 0 if
          it doesn&apos;t apply.
        </p>

        <div className="pi-row">
          <label className="pi-field">
            <span>Total SGFA (m²)</span>
            <input
              type="number"
              min={0}
              disabled={locked}
              value={sgfaInput}
              onChange={(e) => setSgfaInput(e.target.value)}
              onBlur={() => commitNumber("sgfa", sgfaInput, saved.sgfa)}
            />
          </label>
          <label className="pi-field">
            <span>In Good Class Bungalow Area (GCBA)?</span>
            <select
              value={saved.gcba ? "yes" : "no"}
              disabled={locked}
              onChange={(e) => updateInputs.mutate({ gcba: e.target.value === "yes" })}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
          <label className="pi-field">
            <span>No. of houses / dwelling units</span>
            <input
              type="number"
              min={0}
              disabled={locked}
              value={unitsInput}
              onChange={(e) => setUnitsInput(e.target.value)}
              onBlur={() => commitNumber("units", unitsInput, saved.units)}
            />
          </label>
        </div>

        <div className="pi-row">
          <label className="pi-field">
            <span>No. of URA resubmissions expected</span>
            <input
              type="number"
              min={0}
              disabled={locked}
              value={resubInput}
              onChange={(e) => setResubInput(e.target.value)}
              onBlur={() => commitNumber("uraResubmissions", resubInput, saved.uraResubmissions)}
            />
          </label>
          <label className="pi-field">
            <span>PUB project type</span>
            <select
              value={saved.pubProjectType}
              disabled={locked}
              onChange={(e) => updateInputs.mutate({ pubProjectType: e.target.value as PubProjectType })}
            >
              {PUB_PROJECT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="pi-field">
            <span>NPARKS category</span>
            <select
              value={saved.nparksCategory}
              disabled={locked}
              onChange={(e) => updateInputs.mutate({ nparksCategory: e.target.value as NParksCategoryId })}
            >
              {NPARKS_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="pi-row">
          <label className="pi-field">
            <span>No. of LTA submissions from 4th onwards</span>
            <input
              type="number"
              min={0}
              disabled={locked}
              value={ltaInput}
              onChange={(e) => setLtaInput(e.target.value)}
              onBlur={() => commitNumber("ltaSubmissionsFrom4th", ltaInput, saved.ltaSubmissionsFrom4th)}
            />
          </label>
          <label className="pi-field">
            <span>No. of storeys — BCA BP amendment</span>
            <input
              type="number"
              min={0}
              disabled={locked}
              value={bcaStoreysInput}
              onChange={(e) => setBcaStoreysInput(e.target.value)}
              onBlur={() => commitNumber("bcaBpAmendmentStoreys", bcaStoreysInput, saved.bcaBpAmendmentStoreys)}
            />
          </label>
          <label className="pi-field">
            <span>No. of storeys — SCDF FSW amendment</span>
            <input
              type="number"
              min={0}
              disabled={locked}
              value={scdfStoreysInput}
              onChange={(e) => setScdfStoreysInput(e.target.value)}
              onBlur={() => commitNumber("scdfFswAmendmentStoreys", scdfStoreysInput, saved.scdfFswAmendmentStoreys)}
            />
          </label>
        </div>

        <div className="pi-row">
          <label className="pi-field">
            <span>URA PP extension fee (enter $ manually)</span>
            <input
              type="number"
              min={0}
              disabled={locked}
              value={ppExtInput}
              onChange={(e) => setPpExtInput(e.target.value)}
              onBlur={() => commitNumber("uraPpExtensionFee", ppExtInput, saved.uraPpExtensionFee)}
            />
          </label>
          <label className="pi-field">
            <span>URA WP extension fee (enter $ manually)</span>
            <input
              type="number"
              min={0}
              disabled={locked}
              value={wpExtInput}
              onChange={(e) => setWpExtInput(e.target.value)}
              onBlur={() => commitNumber("uraWpExtensionFee", wpExtInput, saved.uraWpExtensionFee)}
            />
          </label>
          <label className="pi-field">
            <span>SGFA rounded up to next 100 m² (auto)</span>
            <input type="number" value={roundedSgfa(saved.sgfa)} disabled readOnly />
          </label>
        </div>
        <p className="ov-hint">
          1st &amp; 2nd extension $500 each; 3rd onwards +$1,000 incrementally, for both Provisional Permission (PP,
          lapses 6 months from grant) and Written Permission (WP, lapses 2 years from grant).
        </p>
      </div>

      <div className="ov-section">
        <div className="ov-section-head">
          <h3>Step 2 — Calculated Submission Fees</h3>
        </div>
        <table className="fee-table">
          <thead>
            <tr>
              <th>Agency</th>
              <th>Description</th>
              <th>Rate / basis</th>
              <th>Input used</th>
              <th style={{ textAlign: "right" }}>Fee (S$)</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}>
                <td>
                  <span className="code-badge">{line.agency}</span>
                </td>
                <td>{line.description}</td>
                <td className="fee-basis">{line.basis}</td>
                <td className="mono">{line.inputUsed}</td>
                <td className="mono fee-amount">{formatSgd(line.fee)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="fee-total-row">
              <td colSpan={4}>TOTAL AUTHORITY SUBMISSION FEES FOR DEVELOPMENT</td>
              <td className="mono fee-amount">{formatSgd(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="ov-section">
        <div className="ov-section-head">
          <h3>Notes</h3>
        </div>
        <ol className="fee-notes">
          <li>This summary excludes any waiver fees, CSC/TOP-stage fees, and professional fees.</li>
          <li>A fee row with a 0 input contributes S$0 and can be ignored — no need to change it.</li>
          <li>
            Rates were cross-checked against each agency&apos;s own published fee schedule as of Sep 2026 (URA, BCA,
            PUB, NParks, and LTA) — SCDF and NEA&apos;s rates couldn&apos;t be independently re-confirmed online and
            are carried over from the office&apos;s own reference sheet. Verify against the current CORENET X fee
            schedule before quoting a client.
          </li>
          <li>PP/WP extension fees follow an incremental scale and are entered manually in Step 1.</li>
        </ol>
      </div>
    </div>
  );
}
