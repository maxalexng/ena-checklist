// Pure helpers for the PC sum schedule widget: the roll-up line and money parsing/format.
import type { PcSumSelection } from "@/template/pcSums";

export interface PcSumLike {
  selection: PcSumSelection;
  amount: number | null;
  clientConfirmed: boolean;
  na: boolean;
}

export interface PcSumSummary {
  /** Rows still part of this project (not N/A). */
  applicable: number;
  /** Applicable rows with a selection made (anything but "To discuss"). */
  decided: number;
  confirmed: number;
  /** Applicable rows specified in the contract instead of carried as a PC sum. */
  inContract: number;
  /** Sum of the PC sum allowances (applicable rows not specified in the contract); rows
   * with no amount count as zero. */
  total: number;
  /** Applicable rows that need an allowance and don't have one yet. */
  unpriced: number;
}

export function summarizePcSums(rows: PcSumLike[]): PcSumSummary {
  const live = rows.filter((r) => !r.na);
  // A row specified in the contract keeps any amount it had (so switching back restores
  // it), but it isn't a PC sum allowance, so it stays out of the total.
  const allowances = live.filter((r) => r.selection !== "contract");
  return {
    applicable: live.length,
    decided: live.filter((r) => r.selection !== "tbc").length,
    confirmed: live.filter((r) => r.clientConfirmed).length,
    inContract: live.length - allowances.length,
    total: allowances.reduce((sum, r) => sum + (r.amount ?? 0), 0),
    unpriced: allowances.filter((r) => r.amount === null).length,
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
