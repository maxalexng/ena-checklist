"use client";

import { useState } from "react";
import type { PcSumEntry } from "@/hooks/useProjectData";
import {
  useAddPcSum,
  useDeletePcSum,
  useLoadStandardPcSums,
  useMovePcSum,
  useUpdatePcSum,
} from "@/hooks/usePcSumMutations";
import { PC_SUM_SELECTION_LABELS, type PcSumSelection } from "@/template/pcSums";
import { formatAmountInput, formatSgd, parseSgdInput, summarizePcSums } from "@/lib/pcSums/pcSums";

// The PC sum schedule: one row per PC sum item, run through with the client — who the
// selection comes from, the supplier/brand agreed, the allowance, and whether the client
// has confirmed it. Text fields keep local state and save on blur, like ConsultantsWidget,
// so an in-progress edit survives the refetch a sibling row's change triggers.

// Local copy of a server value that flips the moment it's clicked. The optimistic cache
// update lands a tick later (after an await), and a controlled checkbox or select would
// snap back in between. Re-syncs whenever the server value changes, including a rollback.
function useInstantValue<T>(value: T): [T, (next: T) => void] {
  const [local, setLocal] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setLocal(value);
  }
  return [local, setLocal];
}
function PcSumRow({
  projectId,
  row,
  isFirst,
  isLast,
  locked,
}: {
  projectId: string;
  row: PcSumEntry;
  isFirst: boolean;
  isLast: boolean;
  locked: boolean;
}) {
  const updatePcSum = useUpdatePcSum(projectId);
  const deletePcSum = useDeletePcSum(projectId);
  const movePcSum = useMovePcSum(projectId);

  const [item, setItem] = useState(row.item);
  const [supplier, setSupplier] = useState(row.supplier);
  const [amount, setAmount] = useState(formatAmountInput(row.amount));
  const [amountInvalid, setAmountInvalid] = useState(false);
  const [note, setNote] = useState(row.note);
  const [selection, setSelection] = useInstantValue(row.selection);
  const [confirmed, setConfirmed] = useInstantValue(row.clientConfirmed);
  const [na, setNa] = useInstantValue(row.na);

  const label = row.item || "PC sum";
  const update = (patch: Parameters<typeof updatePcSum.mutate>[0]) => updatePcSum.mutate(patch);

  return (
    <tr className={`pc-row${na ? " pc-row-na" : ""}`}>
      <td className="pc-cell-move">
        {!locked && (
          <div className="row-move-group">
            <button
              type="button"
              className="row-move-btn"
              aria-label={`Move ${label} up`}
              disabled={isFirst}
              onClick={() => movePcSum.mutate({ id: row.id, direction: -1 })}
            >
              ▲
            </button>
            <button
              type="button"
              className="row-move-btn"
              aria-label={`Move ${label} down`}
              disabled={isLast}
              onClick={() => movePcSum.mutate({ id: row.id, direction: 1 })}
            >
              ▼
            </button>
          </div>
        )}
      </td>
      <td>
        <input
          className="pc-input pc-item-input"
          aria-label="PC sum item"
          placeholder="PC sum item"
          title={item}
          value={item}
          disabled={locked}
          onChange={(e) => setItem(e.target.value)}
          onBlur={() => {
            if (item !== row.item) update({ id: row.id, item });
          }}
        />
      </td>
      <td>
        <select
          className={`pc-input pc-selection pc-selection-${selection}`}
          aria-label={`${label} selection`}
          value={selection}
          disabled={locked || na}
          onChange={(e) => {
            const next = e.target.value as PcSumSelection;
            setSelection(next);
            update({ id: row.id, selection: next });
          }}
        >
          {(Object.keys(PC_SUM_SELECTION_LABELS) as PcSumSelection[]).map((s) => (
            <option key={s} value={s}>
              {PC_SUM_SELECTION_LABELS[s]}
            </option>
          ))}
        </select>
      </td>
      <td>
        <input
          className="pc-input"
          aria-label={`${label} supplier`}
          placeholder="Supplier / brand"
          value={supplier}
          disabled={locked || na}
          onChange={(e) => setSupplier(e.target.value)}
          onBlur={() => {
            if (supplier !== row.supplier) update({ id: row.id, supplier });
          }}
        />
      </td>
      <td>
        <input
          className={`pc-input pc-amount${amountInvalid ? " pc-invalid" : ""}`}
          aria-label={`${label} amount`}
          aria-invalid={amountInvalid}
          inputMode="decimal"
          placeholder="S$"
          value={amount}
          disabled={locked || na}
          onChange={(e) => setAmount(e.target.value)}
          onBlur={() => {
            const parsed = parseSgdInput(amount);
            setAmountInvalid(parsed === undefined);
            if (parsed === undefined) return;
            setAmount(formatAmountInput(parsed));
            if (parsed !== row.amount) update({ id: row.id, amount: parsed });
          }}
        />
      </td>
      <td className="pc-cell-center">
        <input
          type="checkbox"
          aria-label={`${label} confirmed by client`}
          checked={confirmed}
          disabled={locked || na}
          onChange={(e) => {
            setConfirmed(e.target.checked);
            update({ id: row.id, clientConfirmed: e.target.checked });
          }}
        />
      </td>
      <td className="pc-cell-center">
        <input
          type="checkbox"
          aria-label={`${label} not applicable`}
          checked={na}
          disabled={locked}
          onChange={(e) => {
            setNa(e.target.checked);
            update({ id: row.id, na: e.target.checked });
          }}
        />
      </td>
      <td>
        <input
          className="pc-input"
          aria-label={`${label} note`}
          placeholder="Note"
          value={note}
          disabled={locked}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => {
            if (note !== row.note) update({ id: row.id, note });
          }}
        />
      </td>
      <td className="pc-cell-center">
        {!locked && (
          <button
            type="button"
            className="ov-del"
            aria-label={`Remove ${label}`}
            onClick={() => deletePcSum.mutate({ id: row.id })}
          >
            ×
          </button>
        )}
      </td>
    </tr>
  );
}

export function PcSumsWidget({
  projectId,
  pcSums,
  locked,
}: {
  projectId: string;
  pcSums: PcSumEntry[];
  locked: boolean;
}) {
  const addPcSum = useAddPcSum(projectId);
  const loadStandard = useLoadStandardPcSums(projectId);
  const s = summarizePcSums(pcSums);

  return (
    <div className="pc-sums">
      {pcSums.length === 0 ? (
        <div className="pc-empty">
          <span className="ov-empty">No PC sums on this project yet.</span>
          {!locked && (
            <button
              type="button"
              className="roles-add-btn"
              disabled={loadStandard.isPending}
              onClick={() => loadStandard.mutate()}
            >
              Load the standard PC sum list
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="pc-table-wrap">
            <table className="pc-table">
              <colgroup>
                <col style={{ width: 30 }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: 165 }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: 96 }} />
                <col style={{ width: 76 }} />
                <col style={{ width: 44 }} />
                <col />
                <col style={{ width: 30 }} />
              </colgroup>
              <thead>
                <tr>
                  <th aria-label="Order" />
                  <th>PC sum item</th>
                  <th>Selection</th>
                  <th>Supplier / brand</th>
                  <th>Allowance</th>
                  <th>Client confirmed</th>
                  <th>N/A</th>
                  <th>Note</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {pcSums.map((row, i) => (
                  <PcSumRow
                    key={row.id}
                    projectId={projectId}
                    row={row}
                    isFirst={i === 0}
                    isLast={i === pcSums.length - 1}
                    locked={locked}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <p className="pc-summary">
            {s.decided} of {s.applicable} decided · {s.confirmed} confirmed by client · Total allowances{" "}
            <strong>{formatSgd(s.total)}</strong>
            {s.unpriced > 0 && ` (${s.unpriced} not priced yet)`}
          </p>
        </>
      )}
      {!locked && (
        <button
          type="button"
          className="roles-add-btn pc-add"
          disabled={addPcSum.isPending}
          onClick={() => addPcSum.mutate()}
        >
          + Add PC sum
        </button>
      )}
    </div>
  );
}
