// Shared types for the checklist template. The template itself (agencies.ts, stages.ts,
// stepOrder.ts) is pure data + pure functions — no React, no Supabase — so it can be
// imported by both the app and the one-off migration script (scripts/migrate-html-import.ts).
import type { DesignLogId } from "./designLogs";

export type ItemStatus = "pending" | "progress" | "submitted" | "cleared";

export type StageId =
  | "pre-design"
  | "concept"
  | "dev"
  | "detailed"
  | "tender"
  | "construction"
  | "top"
  | "csc";

/** A plain checklist item, inheriting its step's own agency code. */
export interface PlainItem {
  text: string;
}

/** A checklist item that belongs to a different agency than its own step (rare, tagged). */
export interface CrossAgencyItem {
  text: string;
  agencyCode: string;
}

/** A checklist item with its own nested reference checklist (checkboxes). */
export interface ChecklistItem {
  text: string;
  checklist: string[];
}

export type SubmissionItemInput = string | PlainItem | CrossAgencyItem | ChecklistItem;

/** A normalized item, after template build — one per submission item entry. */
export interface TemplateItem {
  /** `${stepKey}__${index}` — stable, derived, matches the legacy prototype's id scheme. */
  id: string;
  text: string;
  /** Displayed agency code tag for this item (usually the step's own code). */
  agencyCode: string;
  checklist: string[] | null;
}

export interface Submission {
  code: string;
  name: string;
  when?: string;
  conditional?: boolean;
  items: SubmissionItemInput[];
  /** Overrides the parent agency's own code/name/blurb for this step's header only. */
  stepCode?: string;
  stepName?: string;
  stepBlurb?: string;
  /** Renders the dedicated Consultants widget instead of a normal item list. */
  isConsultantList?: boolean;
  /** Renders a dated design log (template/designLogs.ts) after the item list. */
  designLog?: DesignLogId;
  /** Renders the PC sum schedule table after the item list. */
  isPcSumSchedule?: boolean;
}

export interface Agency {
  id: string;
  code: string;
  name: string;
  full: string;
  blurb: string;
  conditional?: boolean;
  submissions: Submission[];
}

/** [stageId, agencyId, submissionCode] — the canonical/default step sequence. */
export type StepOrderTriple = readonly [StageId, string, string];

/** A flattened, ready-to-render step — one per STEP_ORDER entry. */
export interface TemplateStep {
  /** `${agencyId}__${sanitizedCode}` — stable step key, also used as the milestones/timeline key. */
  id: string;
  /** The owning agency's id (for logo lookup, color, "by agency" rollups). */
  realId: string;
  code: string;
  name: string;
  full: string;
  blurb: string;
  conditional?: boolean;
  stepNo: number;
  defaultStage: StageId;
  isConsultantList?: boolean;
  designLog?: DesignLogId;
  isPcSumSchedule?: boolean;
  submission: Submission;
  items: TemplateItem[];
}
