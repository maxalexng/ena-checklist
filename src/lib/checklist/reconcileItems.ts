import { STEPS } from "@/template";

export interface MissingItemRow {
  project_id: string;
  item_key: string;
  step_key: string;
  agency_id: string;
  status: "pending";
  na: false;
}

/** Every template item not yet present in `existingKeys`, as rows ready to insert into
 * checklist_items — the same shape createProject() seeds a brand-new project with. A
 * project created before a template change (a step gaining a new item) never gets that row
 * automatically, since checklist_items are normal DB rows, not derived from the template on
 * read; this is what backfills them in, lazily, the next time the project is opened. */
export function missingItemRows(projectId: string, existingKeys: Iterable<string>): MissingItemRow[] {
  const existing = new Set(existingKeys);
  const rows: MissingItemRow[] = [];
  STEPS.forEach((step) => {
    step.items.forEach((item) => {
      if (!existing.has(item.id)) {
        rows.push({
          project_id: projectId,
          item_key: item.id,
          step_key: step.id,
          agency_id: step.realId,
          status: "pending",
          na: false,
        });
      }
    });
  });
  return rows;
}
