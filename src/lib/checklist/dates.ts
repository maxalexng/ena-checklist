// Small date-math helpers, most ported from the prototype's own computed-suggestion
// functions (loaSuggestedStart, tpcSuggestedDate, eotTotalDays, adjustedCompletionDate).
// ppWpExpiryInfo is new — the prototype only had a manually-entered validity-months field.
// Deliberately dependency-free (no date-fns/dayjs) — the calculations are simple enough
// that a library would add weight without adding clarity.
import type { ProjectDates } from "@/lib/supabase/database.types";

// These are civil/calendar dates (contract dates, EOT days), not timestamps — all
// arithmetic below is done in UTC throughout (parse, mutate, and format) so the result
// never shifts by a day depending on the browser's local timezone offset from UTC.
function addMonths(dateStr: string, months: number): Date {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function todayUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Display formatting only — every date stays stored/computed as plain "YYYY-MM-DD" (and
 * every <input type="date"> keeps that value, which is an HTML requirement); this just
 * reformats a date for read-only text display. Pure string slicing, no Date object, so it
 * can't be off by a day for any timezone reason. */
export function formatDateDMY(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d} ${mo} ${y}`;
}

/** Suggested contract start date, derived from the LOA basis — never auto-applied, only
 * offered with a "Use this date" action. Returns null when there's nothing to suggest. */
export function loaSuggestedStart(dates: ProjectDates): { date: string | null; note: string } {
  if (dates.loaBasisType === "approval") {
    return { date: null, note: "Tied to BCA ST/ERSS approval timing — no computed date." };
  }
  const months = Number(dates.loaBasisMonths || "0");
  if (!dates.loaSigned || !months) return { date: null, note: "" };
  return { date: toIsoDate(addMonths(dates.loaSigned, months)), note: `LOA signed + ${months} month(s)` };
}

/** Suggested target practical completion = actual contract start + the contract period
 * (months) from the project info bar. */
export function tpcSuggestedDate(contractStart: string, contractPeriodMonths: number | null): string | null {
  if (!contractStart || !contractPeriodMonths) return null;
  return toIsoDate(addMonths(contractStart, contractPeriodMonths));
}

export function eotTotalDays(dates: ProjectDates): number {
  return (dates.eot || []).reduce((sum, e) => sum + (e.days || 0), 0);
}

/** practicalCompletion + the running EOT total — kept separate from practicalCompletion
 * itself so the "as originally contracted" date is never silently overwritten. */
export function adjustedCompletionDate(dates: ProjectDates): string | null {
  if (!dates.practicalCompletion) return null;
  const total = eotTotalDays(dates);
  if (total === 0) return dates.practicalCompletion;
  return toIsoDate(addDays(dates.practicalCompletion, total));
}

// "urgent" covers both "in the final red window before expiry" and "actually past expiry"
// — same red treatment for both, per how this is meant to read at a glance (see
// ppWpExpiryInfo's warningDate/urgentDate). Whether it's literally overdue is a separate
// check (daysRemaining < 0), used only for the accompanying "N days left" vs "expired" text.
export type PpExpiryStatus = "ok" | "soon" | "urgent";
export type PpWpKind = "pp" | "wp";

export interface PpWpExpiryInfo {
  /** Which permission the expiry is actually tracking — WP supersedes PP once granted. */
  kind: PpWpKind;
  /** The grant/clearance date the expiry was computed from. */
  basisDate: string;
  date: string;
  status: PpExpiryStatus;
  daysRemaining: number;
  /** Standard advice: apply for an extension this many months before expiry. */
  extensionDeadline: string;
}

// Standard Singapore URA validity periods — fixed, not a per-project setting: Provisional
// Permission (PP) is valid 6 months from the date it's granted; once superseded by Written
// Permission (WP), the 2-year clock runs from the WP grant date instead.
const PP_VALIDITY_MONTHS = 6;
const WP_VALIDITY_MONTHS = 24;
const EXTENSION_LEAD_MONTHS = 2;

// Traffic-light thresholds, expressed as "months remaining until expiry" — the point the
// indicator turns yellow, and the point it turns red (through expiry itself). PP: green
// until 4 months remain, yellow until 2 remain, red for the final 2 months and beyond. WP:
// green until 18 months remain, yellow until 3 remain, red for the final 3 and beyond.
const PP_WARNING_MONTHS_REMAINING = 4;
const PP_URGENT_MONTHS_REMAINING = 2;
const WP_WARNING_MONTHS_REMAINING = 18;
const WP_URGENT_MONTHS_REMAINING = 3;

/** A milestone-log entry's free-text `type` only counts toward the expiry clock if it
 * actually reads as a grant/clearance (not a submission, query, or rejection) — validity
 * runs from the date permission was granted, not the date it was applied for. */
function classifyGrant(type: string): PpWpKind | null {
  const t = type.toLowerCase();
  if (!/grant|approv|clear|issu/.test(t)) return null;
  if (/\bwp\b|written permission/.test(t)) return "wp";
  if (/\bpp\b|provisional permission/.test(t)) return "pp";
  return null;
}

/** PP/WP Expiry: 6 months from the latest PP grant, or 2 years from the latest WP grant if
 * one exists — WP is the more definitive permission, so it supersedes PP's own clock
 * entirely once granted, regardless of which has the later date. */
export function ppWpExpiryInfo(entries: { type: string; date: string | null }[]): PpWpExpiryInfo | null {
  const classified = entries
    .filter((e): e is { type: string; date: string } => !!e.date)
    .map((e) => ({ date: e.date, kind: classifyGrant(e.type) }))
    .filter((e): e is { date: string; kind: PpWpKind } => e.kind !== null);
  if (classified.length === 0) return null;

  const wpEntries = classified.filter((e) => e.kind === "wp");
  const pool = wpEntries.length > 0 ? wpEntries : classified;
  const latest = pool.reduce((a, b) => (a.date > b.date ? a : b));

  const months = latest.kind === "wp" ? WP_VALIDITY_MONTHS : PP_VALIDITY_MONTHS;
  const warningMonthsRemaining = latest.kind === "wp" ? WP_WARNING_MONTHS_REMAINING : PP_WARNING_MONTHS_REMAINING;
  const urgentMonthsRemaining = latest.kind === "wp" ? WP_URGENT_MONTHS_REMAINING : PP_URGENT_MONTHS_REMAINING;

  const expiry = addMonths(latest.date, months);
  const extensionDeadline = addMonths(latest.date, months - EXTENSION_LEAD_MONTHS);
  const warningDate = addMonths(latest.date, months - warningMonthsRemaining);
  const urgentDate = addMonths(latest.date, months - urgentMonthsRemaining);

  const today = todayUtcMidnight();
  const daysRemaining = Math.round((expiry.getTime() - today.getTime()) / 86400000);
  const status: PpExpiryStatus = today >= urgentDate ? "urgent" : today >= warningDate ? "soon" : "ok";
  return {
    kind: latest.kind,
    basisDate: latest.date,
    date: toIsoDate(expiry),
    status,
    daysRemaining,
    extensionDeadline: toIsoDate(extensionDeadline),
  };
}
