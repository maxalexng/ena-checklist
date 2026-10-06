// Project-level dates that a checklist step owns: the step shows a date field after its
// items, and the Overview tab shows the same date. Each is stored as a field of the
// project's project_dates JSONB (patched via merge_project_dates, like the contract dates).
import type { ProjectDates } from "../lib/supabase/database.types";

export type KeyDateId = "spTesting";

export interface KeyDateConfig {
  /** The project_dates field the date is stored under. Never change it once shipped. */
  field: keyof ProjectDates & string;
  label: string;
}

export const KEY_DATES: Record<KeyDateId, KeyDateConfig> = {
  spTesting: { field: "spTestingDate", label: "SP Testing & Commissioning date" },
};
