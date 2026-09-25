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
  /** Applicable rows with a selection made (client's choice or our recommendation). */
  decided: number;
  confirmed: number;
  /** Sum of the applicable rows' allowances; rows with no amount count as zero. */
  total: number;
  /** Applicable rows with no amount set yet. */
  unpriced: number;
}

export function summarizePcSums(rows: PcSumLike[]): PcSumSummary {
  const live = rows.filter((r) => !r.na);
  return {
    applicable: live.length,
    decided: live.filter((r) => r.selection !== "tbc").length,
    confirmed: live.filter((r) => r.clientConfirmed).length,
    total: live.reduce((sum, r) => sum + (r.amount ?? 0), 0),
    unpriced: live.filter((r) => r.amount === null).length,
  };
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
