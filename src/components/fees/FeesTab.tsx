"use client";

import { useState } from "react";
import { MAX_URA_EXTENSIONS, NPARKS_CATEGORIES, PUB_PROJECT_TYPES } from "@/template";
import type { NParksCategoryId, PubProjectType } from "@/template";
import type { ProjectChecklistData } from "@/hooks/useProjectData";
import { useUpdateFeeCalculatorInputs } from "@/hooks/useFeeCalculatorMutations";
import {
  computeFeeBreakdown,
  defaultFeeCalculatorInputs,
  feeBreakdownTotal,
  roundedSgfa,
  uraExtensionFees,
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

/** 0–MAX_URA_EXTENSIONS dropdown, each option showing the running total it adds up to. */
function ExtensionSelect({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (n: number) => void;
}) {
  const options = Array.from({ length: MAX_URA_EXTENSIONS + 1 }, (_, n) => ({
    n,
    total: uraExtensionFees(n).reduce((sum, f) => sum + f, 0),
  }));
  return (
    <select value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))}>
      {options.map(({ n, total }) => (
        <option key={n} value={n}>
          {n === 0 ? "0 — none" : `${n} — ${formatSgd(total)}`}
        </option>
      ))}
    </select>
  );
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
  const [stStoreysInput, setStStoreysInput] = useState(String(saved.bcaStAmendmentStoreys));
  const [bcaWaiversInput, setBcaWaiversInput] = useState(String(saved.bcaWaivers));
  const [scdfWaiversInput, setScdfWaiversInput] = useState(String(saved.scdfWaivers));

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
            <span>No. of storeys — BCA ST amendment (engineer)</span>
            <input
              type="number"
              min={0}
              disabled={locked}
              value={stStoreysInput}
              onChange={(e) => setStStoreysInput(e.target.value)}
              onBlur={() => commitNumber("bcaStAmendmentStoreys", stStoreysInput, saved.bcaStAmendmentStoreys)}
            />
          </label>
          <label className="pi-field">
            <span>No. of BCA waivers</span>
            <input
              type="number"
              min={0}
              disabled={locked}
              value={bcaWaiversInput}
              onChange={(e) => setBcaWaiversInput(e.target.value)}
              onBlur={() => commitNumber("bcaWaivers", bcaWaiversInput, saved.bcaWaivers)}
            />
          </label>
          <label className="pi-field">
            <span>No. of SCDF waivers</span>
            <input
              type="number"
              min={0}
              disabled={locked}
              value={scdfWaiversInput}
              onChange={(e) => setScdfWaiversInput(e.target.value)}
              onBlur={() => commitNumber("scdfWaivers", scdfWaiversInput, saved.scdfWaivers)}
            />
          </label>
        </div>

        <div className="pi-row">
          <label className="pi-field">
            <span>No. of URA PP extensions</span>
            <ExtensionSelect
              value={saved.uraPpExtensions}
              disabled={locked}
              onChange={(n) => updateInputs.mutate({ uraPpExtensions: n })}
            />
          </label>
          <label className="pi-field">
            <span>No. of URA WP extensions</span>
            <ExtensionSelect
              value={saved.uraWpExtensions}
              disabled={locked}
              onChange={(n) => updateInputs.mutate({ uraWpExtensions: n })}
            />
          </label>
          <label className="pi-field">
            <span>SGFA rounded up to next 100 m² (auto)</span>
            <input type="number" value={roundedSgfa(saved.sgfa)} disabled readOnly />
          </label>
        </div>
        <p className="ov-hint">
          PP/WP extensions: 1st &amp; 2nd are $500 each, the 3rd is $1,000, and each one after adds another
          $1,000 (4th $2,000, 5th $3,000, …). PP lapses 6 months from grant, WP 2 years. Waivers: BCA $100 and SCDF $160 per
          waiver item.
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
          <li>
            This summary excludes CSC/TOP-stage fees and professional fees (including the engineer&apos;s own fee).
            Waivers other than BCA and SCDF aren&apos;t included.
          </li>
          <li>
            The engineer&apos;s (PE&apos;s) first structural plan submission has no separate BCA fee — BCA charges one
            plan fee per project for both building and structural plans, already counted in the BCA SGFA lines. Each
            structural plan amendment is charged separately at $200 per storey.
          </li>
          <li>A fee row with a 0 input contributes S$0 and can be ignored — no need to change it.</li>
          <li>
            Rates were cross-checked against each agency&apos;s own published fee schedule as of Sep 2026 (URA, BCA,
            PUB, NParks, and LTA) — SCDF and NEA&apos;s rates couldn&apos;t be independently re-confirmed online and
            are carried over from the office&apos;s own reference sheet. Verify against the current CORENET X fee
            schedule before quoting a client.
          </li>
        </ol>
      </div>
    </div>
  );
}
