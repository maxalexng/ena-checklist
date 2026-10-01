/** Reads a free-text money amount as typed into the Overview (Contract Sum, value of works
 * done): "S$10,000,000.00", "10000000", "10m", "9.5 mil", "850k". Returns null when there
 * is no number in it, so an empty field shows nothing rather than 0%. */
export function parseMoney(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = text.toLowerCase().replace(/s\$|\$|sgd|,|\s/g, "");
  const match = cleaned.match(/^(-?\d*\.?\d+)(k|m|mil|million)?$/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  const unit = match[2];
  if (unit === "k") return n * 1_000;
  if (unit) return n * 1_000_000;
  return n;
}

export function formatMoney(n: number): string {
  return `S$${n.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface CertifiedProgress {
  valueOfWorks: number;
  contractSum: number;
  /** Value of works as a percentage of the Contract Sum. Goes past 100 when variations
   * push the final cost over the original contract (e.g. 12m / 10m = 120). */
  percent: number;
  overContract: boolean;
}

/** Value of works done by the contractor (as certified on the latest IC) against the
 * Contract Sum. Null until both amounts can be read and the Contract Sum is above zero. */
export function certifiedProgress(
  valueOfWorksText: string | null | undefined,
  contractSumText: string | null | undefined
): CertifiedProgress | null {
  const valueOfWorks = parseMoney(valueOfWorksText);
  const contractSum = parseMoney(contractSumText);
  if (valueOfWorks == null || contractSum == null || contractSum <= 0) return null;
  const percent = (valueOfWorks / contractSum) * 100;
  return { valueOfWorks, contractSum, percent, overContract: percent > 100 };
}

/** One decimal place, dropping a trailing ".0": 90, 87.5, 120. */
export function formatPercent(percent: number): string {
  return `${Number(percent.toFixed(1))}%`;
}
