import type { StageId } from "./types";

// Office project stages: how the practice actually phases the work, independent of which
// governing body issues each individual clearance. A stage groups several steps; a step
// can still be dragged into a different stage on a per-project basis (see project_step_stage
// overrides) without changing this list.
export const STAGES: { id: StageId; name: string }[] = [
  { id: "pre-design", name: "Pre-Design" },
  { id: "concept", name: "Concept Design" },
  { id: "dev", name: "Design Development" },
  { id: "detailed", name: "Detailed Design" },
  { id: "tender", name: "Tendering" },
  { id: "construction", name: "Construction" },
  { id: "top", name: "TOP Preparation & Post-Construction" },
  { id: "csc", name: "CSC" },
];

export const STAGE_BY_ID: Record<StageId, { id: StageId; name: string }> = Object.fromEntries(
  STAGES.map((s) => [s.id, s])
) as Record<StageId, { id: StageId; name: string }>;

// Typical stage durations (in weeks) for a landed/GCB project — a starting point the office
// can standardize; every project can still override via the Timeline tab's own "Stage
// durations" editor. Sums to 208 weeks (~4 years), construction being the long pole.
export const DEFAULT_STAGE_DURATION_WEEKS: Record<StageId, number> = {
  "pre-design": 6,
  concept: 10,
  dev: 10,
  detailed: 14,
  tender: 8,
  construction: 138,
  top: 12,
  csc: 10,
};

export function defaultStageDurationWeeks(): Record<StageId, number> {
  return { ...DEFAULT_STAGE_DURATION_WEEKS };
}
