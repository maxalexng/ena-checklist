"use client";

import { useState } from "react";
import type { PcSumEntry, PcSumQuote } from "@/hooks/useProjectData";
import {
  useAddPcSum,
  useAddPcSumQuote,
  useDeletePcSum,
  useDeletePcSumQuote,
  useLoadStandardPcSums,
  useMovePcSum,
  useRecommendPcSumQuote,
  useUpdatePcSum,
  useUpdatePcSumQuote,
} from "@/hooks/usePcSumMutations";
import { PC_SUM_PHASES, PC_SUM_SELECTION_LABELS, type PcSumPhase, type PcSumSelection } from "@/template/pcSums";
import {
  formatAmountInput,
  formatSgd,
  formatVariance,
  groupPcSumsByPhase,
  parseSgdInput,
  pcSumAwardLine,
  pcSumSummaryLine,
  pcSumVariance,
  summarizePcSums,
} from "@/lib/pcSums/pcSums";

// The PC sum schedule, grouped by the phase on site each item has to be decided by. One row
// per PC sum item, run through with the client — who the selection comes from, the
// allowance, what it was finally awarded for, and whether the client has confirmed it.
// Each row expands to the 2–3 supplier quotes put to the client, one of them starred as our
// recommendation, and who the item was awarded to. Text fields keep local state and save on
// blur, like ConsultantsWidget, so an in-progress edit survives the refetch a sibling row's
// change triggers.

const COLUMNS = 10;

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

/** An S$ box that saves on blur: blank clears it, anything unparseable is flagged and not
 * saved. Re-syncs when the saved value changes from elsewhere (e.g. picking an award). */
function MoneyInput({
  value,
  label,
  placeholder = "S$",
  disabled,
  onSave,
}: {
  value: number | null;
  label: string;
  placeholder?: string;
  disabled: boolean;
  onSave: (amount: number | null) => void;
}) {
  const [text, setText] = useInstantValue(formatAmountInput(value));
  const [invalid, setInvalid] = useState(false);
  return (
    <input
      className={`pc-input pc-amount${invalid ? " pc-invalid" : ""}`}
      aria-label={label}
      aria-invalid={invalid}
      inputMode="decimal"
      placeholder={placeholder}
      value={text}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const parsed = parseSgdInput(text);
        setInvalid(parsed === undefined);
        if (parsed === undefined) return;
        setText(formatAmountInput(parsed));
        if (parsed !== value) onSave(parsed);
      }}
    />
  );
}

/** A text box that saves on blur. */
function TextInput({
  value,
  label,
  placeholder,
  className = "pc-input",
  disabled,
  onSave,
}: {
  value: string;
  label: string;
  placeholder: string;
  className?: string;
  disabled: boolean;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(value);
  return (
    <input
      className={className}
      aria-label={label}
      placeholder={placeholder}
      title={text}
      value={text}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text !== value) onSave(text);
      }}
    />
  );
}

function quoteName(q: PcSumQuote, i: number): string {
  return q.supplier.trim() || `Quote ${i + 1}`;
}

/** "3 quotes · recommended: VolumeFive · awarded: Carera" under the item name. */
function quotesSubline(row: PcSumEntry): string {
  const n = row.quotes.length;
  const parts = [n === 0 ? "No quotes yet" : `${n} quote${n === 1 ? "" : "s"}`];
  const recIdx = row.quotes.findIndex((q) => q.recommended);
  if (recIdx >= 0) parts.push(`recommended: ${quoteName(row.quotes[recIdx], recIdx)}`);
  const awardIdx = row.quotes.findIndex((q) => q.id === row.awardedQuoteId);
  if (awardIdx >= 0) parts.push(`awarded: ${quoteName(row.quotes[awardIdx], awardIdx)}`);
  return parts.join(" · ");
}

function varianceClass(variance: number | null): string {
  if (variance === null || variance === 0) return "";
  return variance > 0 ? " pc-var-over" : " pc-var-under";
}

function QuoteRow({
  projectId,
  pcSumId,
  quote,
  index,
  itemLabel,
  locked,
}: {
  projectId: string;
  pcSumId: string;
  quote: PcSumQuote;
  index: number;
  itemLabel: string;
  locked: boolean;
}) {
  const updateQuote = useUpdatePcSumQuote(projectId);
  const deleteQuote = useDeletePcSumQuote(projectId);
  const recommend = useRecommendPcSumQuote(projectId);
  const [recommended, setRecommended] = useInstantValue(quote.recommended);
  const label = `${itemLabel} quote ${index + 1}`;
  const update = (patch: Parameters<typeof updateQuote.mutate>[0]) => updateQuote.mutate(patch);

  return (
    <tr className="pc-quote-row">
      <td>
        <TextInput
          value={quote.supplier}
          label={`${label} supplier`}
          placeholder="Supplier"
          disabled={locked}
          onSave={(supplier) => update({ id: quote.id, pcSumId, supplier })}
        />
      </td>
      <td>
        <TextInput
          value={quote.brand}
          label={`${label} brand`}
          placeholder="Brand / model"
          disabled={locked}
          onSave={(brand) => update({ id: quote.id, pcSumId, brand })}
        />
      </td>
      <td>
        <MoneyInput
          value={quote.amount}
          label={`${label} amount`}
          disabled={locked}
          onSave={(amount) => update({ id: quote.id, pcSumId, amount })}
        />
      </td>
      <td>
        <TextInput
          value={quote.note}
          label={`${label} note`}
          placeholder="Note"
          disabled={locked}
          onSave={(note) => update({ id: quote.id, pcSumId, note })}
        />
      </td>
      <td className="pc-cell-center">
        <button
          type="button"
          className={`pc-star${recommended ? " on" : ""}`}
          aria-label={`${label} recommended`}
          aria-pressed={recommended}
          title={recommended ? "Our recommendation" : "Mark as our recommendation"}
          disabled={locked}
          onClick={() => {
            setRecommended(!recommended);
            recommend.mutate({ pcSumId, id: recommended ? null : quote.id });
          }}
        >
          {recommended ? "★" : "☆"}
        </button>
      </td>
      <td className="pc-cell-center">
        {!locked && (
          <button
            type="button"
            className="ov-del"
            aria-label={`Remove ${label}`}
            onClick={() => deleteQuote.mutate({ id: quote.id, pcSumId })}
          >
            ×
          </button>
        )}
      </td>
    </tr>
  );
}

function PcSumDetail({
  projectId,
  row,
  label,
  locked,
}: {
  projectId: string;
  row: PcSumEntry;
  label: string;
  locked: boolean;
}) {
  const updatePcSum = useUpdatePcSum(projectId);
  const addQuote = useAddPcSumQuote(projectId);
  const [phase, setPhase] = useInstantValue(row.phase);
  const [awardedTo, setAwardedTo] = useInstantValue(row.awardedQuoteId);

  return (
    <div className="pc-detail">
      <div className="pc-detail-head">
        <label className="pc-detail-field">
          <span>Phase</span>
          <select
            className="pc-input"
            aria-label={`${label} phase`}
            value={phase ?? ""}
            disabled={locked}
            onChange={(e) => {
              const next = (e.target.value || null) as PcSumPhase | null;
              setPhase(next);
              updatePcSum.mutate({ id: row.id, phase: next });
            }}
          >
            <option value="">Unsorted</option>
            {PC_SUM_PHASES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="pc-detail-field">
          <span>Awarded to</span>
          <select
            className="pc-input"
            aria-label={`${label} awarded to`}
            value={awardedTo ?? ""}
            disabled={locked || row.quotes.length === 0}
            onChange={(e) => {
              const id = e.target.value || null;
              setAwardedTo(id);
              const quote = row.quotes.find((q) => q.id === id);
              // Picking the award fills in the awarded amount from the quote, unless one
              // has already been entered (a negotiated figure shouldn't be overwritten).
              const fillAmount = quote && quote.amount !== null && row.awardedAmount === null;
              updatePcSum.mutate({
                id: row.id,
                awardedQuoteId: id,
                ...(fillAmount ? { awardedAmount: quote.amount } : {}),
              });
            }}
          >
            <option value="">{row.quotes.length === 0 ? "Add a quote first" : "Not awarded yet"}</option>
            {row.quotes.map((q, i) => (
              <option key={q.id} value={q.id}>
                {quoteName(q, i)}
                {q.amount !== null ? ` — ${formatSgd(q.amount)}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {row.quotes.length > 0 && (
        <table className="pc-quotes">
          <colgroup>
            <col style={{ width: "24%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: 110 }} />
            <col />
            <col style={{ width: 92 }} />
            <col style={{ width: 30 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Brand / model</th>
              <th>Quote</th>
              <th>Note</th>
              <th>Recommended</th>
              <th aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {row.quotes.map((q, i) => (
              <QuoteRow
                key={q.id}
                projectId={projectId}
                pcSumId={row.id}
                quote={q}
                index={i}
                itemLabel={label}
                locked={locked}
              />
            ))}
          </tbody>
        </table>
      )}
      {!locked && (
        <button
          type="button"
          className="roles-add-btn pc-add"
          disabled={addQuote.isPending}
          onClick={() => addQuote.mutate({ pcSumId: row.id })}
        >
          + Add quote
        </button>
      )}
    </div>
  );
}

function PcSumRow({
  projectId,
  row,
  isFirst,
  isLast,
  locked,
  expanded,
  onToggle,
}: {
  projectId: string;
  row: PcSumEntry;
  isFirst: boolean;
  isLast: boolean;
  locked: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const updatePcSum = useUpdatePcSum(projectId);
  const deletePcSum = useDeletePcSum(projectId);
  const movePcSum = useMovePcSum(projectId);

  const [item, setItem] = useState(row.item);
  const [selection, setSelection] = useInstantValue(row.selection);
  const [confirmed, setConfirmed] = useInstantValue(row.clientConfirmed);
  const [na, setNa] = useInstantValue(row.na);

  const label = row.item || "PC sum";
  const update = (patch: Parameters<typeof updatePcSum.mutate>[0]) => updatePcSum.mutate(patch);
  const inContract = selection === "contract";
  const variance = inContract ? null : pcSumVariance(row);

  return (
    <>
      <tr className={`pc-row${na ? " pc-row-na" : ""}${expanded ? " pc-row-open" : ""}`}>
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
          <div className="pc-item-cell">
            <button
              type="button"
              className="pc-expand"
              aria-label={`${expanded ? "Hide" : "Show"} quotes for ${label}`}
              aria-expanded={expanded}
              onClick={onToggle}
            >
              {expanded ? "▾" : "▸"}
            </button>
            <div className="pc-item-text">
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
              <button type="button" className="pc-subline" tabIndex={-1} title={quotesSubline(row)} onClick={onToggle}>
                {quotesSubline(row)}
              </button>
            </div>
          </div>
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
          {inContract ? (
            // Priced within the contract sum, so there's no allowance or award to track.
            // Any amounts already saved are kept, and come back if switched back.
            <span className="pc-in-contract" aria-label={`${label} amount`}>
              In contract
            </span>
          ) : (
            <MoneyInput
              value={row.amount}
              label={`${label} amount`}
              disabled={locked || na}
              onSave={(amount) => update({ id: row.id, amount })}
            />
          )}
        </td>
        <td>
          {inContract ? (
            <span className="pc-in-contract" aria-label={`${label} awarded amount`}>
              —
            </span>
          ) : (
            <MoneyInput
              value={row.awardedAmount}
              label={`${label} awarded amount`}
              placeholder="—"
              disabled={locked || na}
              onSave={(awardedAmount) => update({ id: row.id, awardedAmount })}
            />
          )}
        </td>
        <td className={`pc-variance${varianceClass(variance)}`} aria-label={`${label} variance`}>
          {variance === null ? "" : formatVariance(variance)}
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
          <TextInput
            value={row.note}
            label={`${label} note`}
            placeholder="Note"
            disabled={locked}
            onSave={(note) => update({ id: row.id, note })}
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
      {expanded && (
        <tr className="pc-detail-row">
          <td />
          <td colSpan={COLUMNS - 1}>
            <PcSumDetail projectId={projectId} row={row} label={label} locked={locked} />
          </td>
        </tr>
      )}
    </>
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const s = summarizePcSums(pcSums);
  const groups = groupPcSumsByPhase(pcSums);

  return (
    <div className="pc-sums">
      {pcSums.length === 0 ? (
        <div className="pc-empty">
          <span className="ov-empty">
            No PC sums on this project yet.
            {locked && " Unlock the project to load the standard PC sum list."}
          </span>
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
        <div className="pc-summary-block">
          <p className="pc-summary">{pcSumSummaryLine(s)}</p>
          <p className={`pc-summary pc-award-summary${varianceClass(s.awarded > 0 ? s.variance : null)}`}>
            {pcSumAwardLine(s)}
          </p>
        </div>
      )}
      <div className="pc-table-wrap">
        <table className="pc-table">
          <colgroup>
            <col style={{ width: 30 }} />
            <col style={{ width: "26%" }} />
            <col style={{ width: 160 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 92 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 40 }} />
            <col />
            <col style={{ width: 30 }} />
          </colgroup>
          <thead>
            <tr>
              <th aria-label="Order" />
              <th>PC sum item</th>
              <th>Selection</th>
              <th>Allowance</th>
              <th>Awarded</th>
              <th>Variance</th>
              <th>Client confirmed</th>
              <th>N/A</th>
              <th>Note</th>
              <th aria-label="Remove" />
            </tr>
          </thead>
          {groups.map((group) => {
            const phase = group.phase;
            const name = phase?.name ?? "Unsorted";
            return (
                <tbody key={phase?.id ?? "unsorted"} className="pc-phase" data-phase={phase?.id ?? "unsorted"}>
                  <tr className="pc-phase-row">
                    <th colSpan={COLUMNS} scope="rowgroup">
                      <div className="pc-phase-head">
                        <span className="pc-phase-name">{name}</span>
                        <span className="pc-phase-when">
                          {phase
                            ? `Decide ${phase.decideBy.charAt(0).toLowerCase()}${phase.decideBy.slice(1)}`
                            : "Expand each of these to pick its phase"}
                        </span>
                        {!locked && phase && (
                          <button
                            type="button"
                            className="pc-phase-add"
                            aria-label={`Add PC sum to ${name}`}
                            disabled={addPcSum.isPending}
                            onClick={() => addPcSum.mutate({ phase: phase.id })}
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </th>
                  </tr>
                  {group.rows.length === 0 && (
                    <tr className="pc-phase-empty">
                      <td />
                      <td colSpan={COLUMNS - 1}>Nothing in this phase.</td>
                    </tr>
                  )}
                  {group.rows.map((row, i) => (
                    <PcSumRow
                      key={row.id}
                      projectId={projectId}
                      row={row}
                      isFirst={i === 0}
                      isLast={i === group.rows.length - 1}
                      locked={locked}
                      expanded={!!expanded[row.id]}
                      onToggle={() => setExpanded((e) => ({ ...e, [row.id]: !e[row.id] }))}
                    />
                  ))}
                </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}
