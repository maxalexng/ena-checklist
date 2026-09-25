// A step's dated design log: a fixed first row, any number of rounds (client
// presentations, review meetings, coordination rounds), and a fixed last row. The labels
// and stored types come from the step's DesignLogConfig (template/designLogs.ts). Rows are
// ordinary milestone rows under the step's key, told apart by `type`, so no schema of
// their own is needed. Rounds are numbered from their order, not stored, so deleting one
// renumbers the rest.
import type { DesignLogConfig } from "@/template/designLogs";

export type DesignReviewKind = "initial" | "round" | "confirm";

export interface DesignReviewEntry {
  id: string;
  type: string;
  date: string | null;
  note: string;
  sortOrder: number;
}

export interface DesignReviewRow {
  kind: DesignReviewKind;
  label: string;
  /** null for a fixed row (initial/confirm) that hasn't been filled in yet. */
  entry: DesignReviewEntry | null;
  /** Days since the nearest earlier row that has a date, or null if either is undated. */
  daysSincePrevious: number | null;
}

export interface DesignReviewSummary {
  rows: DesignReviewRow[];
  roundCount: number;
  /** Days from the first dated row to the confirm row, or to the latest dated row so far
   * if not confirmed yet. null until two rows have dates. */
  totalDays: number | null;
  confirmed: boolean;
}

const ORDINAL_WORDS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];

export function ordinalWord(n: number): string {
  if (n >= 1 && n <= ORDINAL_WORDS.length) return ORDINAL_WORDS[n - 1];
  const mod100 = n % 100;
  const suffix = mod100 >= 11 && mod100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
}

export function roundLabel(n: number, noun: string): string {
  return `${ordinalWord(n)} ${noun}`;
}

/** "Presentation" → "presentations"; the summary line's count noun. `plural` overrides the
 * default "s" for irregular nouns. */
export function roundCountLabel(count: number, noun: string, plural?: string): string {
  if (count !== 1 && plural) return `${count} ${plural}`;
  return `${count} ${noun.toLowerCase()}${count === 1 ? "" : "s"}`;
}

/** Whole days between two "YYYY-MM-DD" dates, computed in UTC so it can't shift by a day. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(from + "T00:00:00Z");
  const b = Date.parse(to + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

/** "3 days", "2 wks", "2 wks 3 days" — for the gap chips between rows. */
export function formatDayGap(days: number): string {
  const sign = days < 0 ? "−" : "";
  const abs = Math.abs(days);
  const weeks = Math.floor(abs / 7);
  const rest = abs % 7;
  const dayPart = `${rest} day${rest === 1 ? "" : "s"}`;
  if (weeks === 0) return `${sign}${dayPart}`;
  const weekPart = `${weeks} wk${weeks === 1 ? "" : "s"}`;
  return rest === 0 ? `${sign}${weekPart}` : `${sign}${weekPart} ${dayPart}`;
}

export function summarizeDesignReviews(entries: DesignReviewEntry[], config: DesignLogConfig): DesignReviewSummary {
  const sorted = [...entries].sort((a, b) => a.sortOrder - b.sortOrder);
  const initial = sorted.find((e) => e.type === config.types.initial) ?? null;
  const confirm = sorted.find((e) => e.type === config.types.confirm) ?? null;
  const rounds = sorted.filter((e) => e.type === config.types.round);

  const rows: DesignReviewRow[] = [
    { kind: "initial", label: config.initialLabel, entry: initial, daysSincePrevious: null },
    ...rounds.map(
      (entry, i): DesignReviewRow => ({
        kind: "round",
        label: roundLabel(i + 1, config.roundNoun),
        entry,
        daysSincePrevious: null,
      })
    ),
    { kind: "confirm", label: config.confirmLabel, entry: confirm, daysSincePrevious: null },
  ];

  let lastDate: string | null = null;
  for (const row of rows) {
    const date = row.entry?.date ?? null;
    if (!date) continue;
    if (lastDate) row.daysSincePrevious = daysBetween(lastDate, date);
    lastDate = date;
  }

  const dated = rows.map((r) => r.entry?.date).filter((d): d is string => !!d);
  const totalDays = dated.length >= 2 ? daysBetween(dated[0], dated[dated.length - 1]) : null;

  return {
    rows,
    roundCount: rounds.length,
    totalDays,
    confirmed: !!confirm?.date,
  };
}
