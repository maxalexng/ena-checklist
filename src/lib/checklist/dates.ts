// Small date-math helpers ported from the prototype's own computed-suggestion functions
// (loaSuggestedStart, tpcSuggestedDate, eotTotalDays, adjustedCompletionDate, ppExpiryInfo).
// Deliberately dependency-free (no date-fns/dayjs) — the calculations are simple enough
// that a library would add weight without adding clarity.
import type { ProjectDates } from "@/lib/supabase/database.types";

function addMonths(dateStr: string, months: number): Date {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d;
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
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

export type PpExpiryStatus = "ok" | "soon" | "expired";

export interface PpExpiryInfo {
  date: string;
  status: PpExpiryStatus;
  daysRemaining: number;
}

/** PP Expiry: validity months from whichever PP/WP log entry has the latest date. */
export function ppExpiryInfo(
  entries: { type: string; date: string | null }[],
  validityMonths: string
): PpExpiryInfo | null {
  const months = Number(validityMonths || "0");
  if (!months) return null;
  const dated = entries.filter((e) => e.date);
  if (dated.length === 0) return null;
  const latest = dated.reduce((a, b) => ((a.date as string) > (b.date as string) ? a : b));
  const expiry = addMonths(latest.date as string, months);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysRemaining = Math.round((expiry.getTime() - today.getTime()) / 86400000);
  const status: PpExpiryStatus = daysRemaining < 0 ? "expired" : daysRemaining <= 90 ? "soon" : "ok";
  return { date: toIsoDate(expiry), status, daysRemaining };
}
