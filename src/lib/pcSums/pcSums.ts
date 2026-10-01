// Pure helpers for the PC sum schedule: phase grouping and ordering, the roll-up lines,
// award variance, and money parsing/format.
import { PC_SUM_PHASES, type PcSumPhase, type PcSumPhaseInfo, type PcSumSelection } from "@/template/pcSums";

export interface PcSumLike {
  selection: PcSumSelection;
  /** The PC sum allowance. */
  amount: number | null;
  clientConfirmed: boolean;
  na: boolean;
  awardedAmount?: number | null;
}

export interface PcSumSummary {
  /** Rows still part of this project (not N/A). */
  applicable: number;
  /** Applicable rows with a selection made (anything but "To discuss"). */
  decided: number;
  confirmed: number;
  /** Applicable rows specified in the contract instead of carried as a PC sum. */
  inContract: number;
  /** Applicable rows carried as a PC sum (not specified in the contract). */
  allowanceItems: number;
  /** Sum of the PC sum allowances; rows with no amount count as zero. */
  total: number;
  /** PC sum rows that don't have an allowance yet. */
  unpriced: number;
  /** PC sum rows with an awarded amount. */
  awarded: number;
  /** Sum of the awarded amounts. */
  awardedTotal: number;
  /** Awarded total minus those same rows' allowances: positive is over budget. */
  variance: number;
}

/** Awarded minus allowance for one row; null until it's awarded. A missing allowance
 * counts as zero, as it does in the allowance total. */
export function pcSumVariance(row: Pick<PcSumLike, "amount" | "awardedAmount">): number | null {
  if (row.awardedAmount === null || row.awardedAmount === undefined) return null;
  return roundCents(row.awardedAmount - (row.amount ?? 0));
}

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

export function summarizePcSums(rows: PcSumLike[]): PcSumSummary {
  const live = rows.filter((r) => !r.na);
  // A row specified in the contract keeps any amounts it had (so switching back restores
  // them), but it isn't a PC sum, so it stays out of the allowance and award figures.
  const pcSums = live.filter((r) => r.selection !== "contract");
  const awarded = pcSums.filter((r) => pcSumVariance(r) !== null);
  return {
    applicable: live.length,
    decided: live.filter((r) => r.selection !== "tbc").length,
    confirmed: live.filter((r) => r.clientConfirmed).length,
    inContract: live.length - pcSums.length,
    allowanceItems: pcSums.length,
    total: roundCents(pcSums.reduce((sum, r) => sum + (r.amount ?? 0), 0)),
    unpriced: pcSums.filter((r) => r.amount === null).length,
    awarded: awarded.length,
    awardedTotal: roundCents(awarded.reduce((sum, r) => sum + (r.awardedAmount ?? 0), 0)),
    variance: roundCents(awarded.reduce((sum, r) => sum + (pcSumVariance(r) ?? 0), 0)),
  };
}

/** The roll-up line under the schedule, also shown on the checklist step. */
export function pcSumSummaryLine(s: PcSumSummary): string {
  return [
    `${s.decided} of ${s.applicable} decided`,
    `${s.confirmed} confirmed by client`,
    ...(s.inContract > 0 ? [`${s.inContract} specified in contract`] : []),
    `Total allowances ${formatSgd(s.total)}${s.unpriced > 0 ? ` (${s.unpriced} not priced yet)` : ""}`,
  ].join(" · ");
}

/** The awards line: how much has been awarded, and where that leaves the budget. */
export function pcSumAwardLine(s: PcSumSummary): string {
  if (s.awarded === 0) return "Nothing awarded yet";
  return `Awarded ${formatSgd(s.awardedTotal)} on ${s.awarded} of ${s.allowanceItems} items · ${budgetPosition(s.variance)}`;
}

function budgetPosition(variance: number): string {
  if (variance === 0) return "On budget";
  return `${formatSgd(Math.abs(variance))} ${variance > 0 ? "over" : "under"} the allowances`;
}

/** A row's variance cell: "+S$1,200" (over), "−S$800" (under), "S$0". */
export function formatVariance(variance: number): string {
  if (variance === 0) return "S$0";
  return `${variance > 0 ? "+" : "−"}${formatSgd(Math.abs(variance))}`;
}

// ── Phases ──────────────────────────────────────────────────────────────────

export interface PcSumGroup<T> {
  /** Null for rows not sorted into a phase yet. */
  phase: PcSumPhaseInfo | null;
  rows: T[];
}

/** Rows grouped by phase in site order, keeping their order within each phase. Every phase
 * gets a group, even an empty one, so items can be added to it; unsorted rows come first,
 * and only when there are any, so they get noticed and sorted. */
export function groupPcSumsByPhase<T extends { phase: PcSumPhase | null }>(rows: T[]): PcSumGroup<T>[] {
  const unsorted = rows.filter((r) => !r.phase || !PC_SUM_PHASES.some((p) => p.id === r.phase));
  return [
    ...(unsorted.length > 0 ? [{ phase: null, rows: unsorted }] : []),
    ...PC_SUM_PHASES.map((phase) => ({ phase, rows: rows.filter((r) => r.phase === phase.id) })),
  ];
}

/** The row an up/down move swaps places with: its neighbour within the same phase, or
 * null at either end of the phase. `rows` is the whole list in sort order. */
export function pcSumSwapTarget<T extends { id: string; phase: PcSumPhase | null }>(
  rows: T[],
  id: string,
  direction: -1 | 1
): T | null {
  const row = rows.find((r) => r.id === id);
  if (!row) return null;
  const group = groupPcSumsByPhase(rows).find((g) => g.rows.includes(row));
  if (!group) return null;
  const idx = group.rows.indexOf(row);
  return group.rows[idx + direction] ?? null;
}

// ── Money ───────────────────────────────────────────────────────────────────

/** "12,500" / "12,500.50": thousands separators, cents only when there are any. */
function formatAmount(amount: number): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return amount.toLocaleString("en-SG", { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 });
}

/** "S$12,500" / "S$12,500.50". */
export function formatSgd(amount: number): string {
  return `S$${formatAmount(amount)}`;
}

/** Parses what someone types into the amount box ("12,500", "S$ 8000", "") into a stored
 * value: null for blank, undefined for something that isn't a usable amount. */
export function parseSgdInput(text: string): number | null | undefined {
  const cleaned = text.replace(/s\$|\$|,|\s/gi, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return undefined;
  return Number(cleaned);
}

/** The amount box's display text: "18,500" / "1,234.50", blank if unset. */
export function formatAmountInput(amount: number | null): string {
  return amount === null ? "" : formatAmount(amount);
}
