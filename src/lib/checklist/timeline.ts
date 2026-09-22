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

export function projectSpan(
  contractStart: string,
  stageDurationWeeks: Record<string, number>
): ProjectSpan | null {
  if (!contractStart) return null;
  const totalWeeks = STAGES.reduce((sum, s) => sum + (stageDurationWeeks[s.id] || 0), 0);
  if (totalWeeks <= 0) return null;
  return {
    startDate: new Date(contractStart + "T00:00:00"),
    totalWeeks,
    trackWidthPx: Math.max(TL_MIN_TRACK_WIDTH, totalWeeks * TL_PX_PER_WEEK),
  };
}

export function pxForDate(dateStr: string | null | undefined, span: ProjectSpan): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const weeks = (d.getTime() - span.startDate.getTime()) / (7 * 86400000);
  return weeks * TL_PX_PER_WEEK;
}

export function todayPx(span: ProjectSpan): number {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
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
