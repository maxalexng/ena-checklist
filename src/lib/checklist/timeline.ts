import { STAGES } from "@/template";
import type { StageId } from "@/template";

// Fixed px-per-week horizontal-scrolling track — deliberately not squeeze-to-fit, so a
// short stage (e.g. 6 weeks) stays legible next to a 138-week Construction band, matching
// the prototype's own TL_PX_PER_WEEK/min-width approach.
export const TL_PX_PER_WEEK = 20;
export const TL_MIN_TRACK_WIDTH = 700;

export interface ProjectSpan {
  startDate: Date;
  totalWeeks: number;
  trackWidthPx: number;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface TimelineStart {
  date: string;
  /** "project": the project start date. "contract": worked back from the actual contract
   * start, so Construction begins on the day the building contract does. */
  basis: "project" | "contract";
}

/** Where the timeline's first stage begins. The actual contract start is the building
 * contract's, so on its own it anchors the Construction stage, with the stages before it
 * counted back from there. */
export function timelineStart(
  dates: { projectStart?: string; contractStart?: string },
  stageDurationWeeks: Record<string, number>
): TimelineStart | null {
  if (dates.projectStart) return { date: dates.projectStart, basis: "project" };
  if (!dates.contractStart) return null;
  const constructionIdx = STAGES.findIndex((s) => s.id === "construction");
  const weeksBefore = STAGES.slice(0, constructionIdx).reduce((sum, s) => sum + (stageDurationWeeks[s.id] || 0), 0);
  return { date: addDaysIso(dates.contractStart, -weeksBefore * 7), basis: "contract" };
}

/** Each office stage's start and end date, laid end to end from the timeline start. */
export function stageWindows(
  startIso: string,
  stageDurationWeeks: Record<string, number>
): Record<StageId, { start: string; end: string }> {
  let cursor = startIso;
  return Object.fromEntries(
    STAGES.map((s) => {
      const start = cursor;
      cursor = addDaysIso(cursor, (stageDurationWeeks[s.id] || 0) * 7);
      return [s.id, { start, end: cursor }];
    })
  ) as Record<StageId, { start: string; end: string }>;
}

export function projectSpan(
  startDate: string,
  stageDurationWeeks: Record<string, number>
): ProjectSpan | null {
  if (!startDate) return null;
  const totalWeeks = STAGES.reduce((sum, s) => sum + (stageDurationWeeks[s.id] || 0), 0);
  if (totalWeeks <= 0) return null;
  return {
    // Civil/calendar date, not a timestamp — anchored to UTC midnight (not local midnight)
    // so week-offset math below never shifts by a day depending on the browser's timezone.
    startDate: new Date(startDate + "T00:00:00Z"),
    totalWeeks,
    trackWidthPx: Math.max(TL_MIN_TRACK_WIDTH, totalWeeks * TL_PX_PER_WEEK),
  };
}

export function pxForDate(dateStr: string | null | undefined, span: ProjectSpan): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00Z");
  const weeks = (d.getTime() - span.startDate.getTime()) / (7 * 86400000);
  return weeks * TL_PX_PER_WEEK;
}

export function todayPx(span: ProjectSpan): number {
  const iso = new Date().toISOString().slice(0, 10);
  return pxForDate(iso, span) ?? 0;
}

export interface StageBand {
  stage: (typeof STAGES)[number];
  leftPx: number;
  widthPx: number;
  first: boolean;
  last: boolean;
}

export function stageBands(span: ProjectSpan, stageDurationWeeks: Record<string, number>): StageBand[] {
  let cursorWeeks = 0;
  const bands: StageBand[] = STAGES.map((stage, i) => {
    const weeks = stageDurationWeeks[stage.id] || 0;
    const leftPx = cursorWeeks * TL_PX_PER_WEEK;
    const widthPx = weeks * TL_PX_PER_WEEK;
    cursorWeeks += weeks;
    return { stage, leftPx, widthPx, first: i === 0, last: i === STAGES.length - 1 };
  });
  return bands.filter((b) => b.widthPx > 0);
}

export type TimelineBarStatus = "pending" | "progress" | "cleared";

export function aggregateStatus(statuses: { status: string; na: boolean }[]): TimelineBarStatus {
  const applicable = statuses.filter((s) => !s.na);
  if (applicable.length === 0) return "pending";
  if (applicable.every((s) => s.status === "cleared")) return "cleared";
  if (applicable.some((s) => s.status === "progress" || s.status === "submitted" || s.status === "cleared")) {
    return "progress";
  }
  return "pending";
}

export function stageIndex(stageId: string): number {
  return STAGES.findIndex((s) => s.id === (stageId as StageId));
}
