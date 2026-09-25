// The Concept Design step's presentation log: a fixed first row (initial concept design),
// any number of client presentations, and a fixed last row (revise and confirm design).
// Stored as ordinary milestone rows under the step's key, told apart by `type`, so no
// schema of its own is needed. Presentations are numbered from their order, not stored,
// so deleting one renumbers the rest.

export const DESIGN_REVIEW_TYPES = {
  initial: "Initial Concept Design",
  presentation: "Presentation",
  confirm: "Revise and Confirm Design",
} as const;

export type DesignReviewKind = keyof typeof DESIGN_REVIEW_TYPES;

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
  presentationCount: number;
  /** Days from the initial concept design to confirmation, or to the latest dated row so
   * far if the design isn't confirmed yet. null until two rows have dates. */
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

export function presentationLabel(n: number): string {
  return `${ordinalWord(n)} Presentation`;
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

export function summarizeDesignReviews(entries: DesignReviewEntry[]): DesignReviewSummary {
  const sorted = [...entries].sort((a, b) => a.sortOrder - b.sortOrder);
  const initial = sorted.find((e) => e.type === DESIGN_REVIEW_TYPES.initial) ?? null;
  const confirm = sorted.find((e) => e.type === DESIGN_REVIEW_TYPES.confirm) ?? null;
  const presentations = sorted.filter((e) => e.type === DESIGN_REVIEW_TYPES.presentation);

  const rows: DesignReviewRow[] = [
    { kind: "initial", label: "Produce Initial Concept Design", entry: initial, daysSincePrevious: null },
    ...presentations.map(
      (entry, i): DesignReviewRow => ({
        kind: "presentation",
        label: presentationLabel(i + 1),
        entry,
        daysSincePrevious: null,
      })
    ),
    { kind: "confirm", label: "Revise and Confirm Design", entry: confirm, daysSincePrevious: null },
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
    presentationCount: presentations.length,
    totalDays,
    confirmed: !!confirm?.date,
  };
}
