/** Rail progress for one step: how many of its items apply and how many are cleared. */
export interface StepProgress {
  applicable: number;
  cleared: number;
  pct: number;
  /** "na" — every item is N/A, so the step doesn't apply to this project.
   * "done" — every applicable item is cleared. "open" — anything else. */
  state: "na" | "done" | "open";
}

export function stepProgress(records: ({ na: boolean; status: string } | undefined)[]): StepProgress {
  const applicable = records.filter((r) => r && !r.na).length;
  const cleared = records.filter((r) => r && !r.na && r.status === "cleared").length;
  const pct = applicable > 0 ? Math.round((cleared / applicable) * 100) : 0;
  const state = applicable === 0 ? "na" : cleared === applicable ? "done" : "open";
  return { applicable, cleared, pct, state };
}

/** A stage is complete when every step is either done or N/A, and at least one step was
 * actually done — a stage that is N/A throughout is "not required", not "complete". */
export function stageState(steps: StepProgress[]): "complete" | "na" | "open" {
  if (steps.some((s) => s.state === "open")) return "open";
  return steps.some((s) => s.state === "done") ? "complete" : "na";
}
