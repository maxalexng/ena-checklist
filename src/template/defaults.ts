import { ROLE_PALETTE } from "./keys";
import type { ItemStatus } from "./types";

// The 4-value status cycle a click-to-cycle chip advances through; "na" is a separate,
// orthogonal flag (see item_key/checklist_items.na) rather than a 5th cycle value.
export const STATUSES: ItemStatus[] = ["pending", "progress", "submitted", "cleared"];

export const STATUS_LABEL: Record<ItemStatus | "na", string> = {
  pending: "Not started",
  progress: "In progress",
  submitted: "Submitted",
  cleared: "Cleared",
  na: "N/A",
};

export function nextStatus(current: ItemStatus): ItemStatus {
  const idx = STATUSES.indexOf(current);
  return STATUSES[(idx + 1) % STATUSES.length];
}

// Generic suggestions offered on any freshly-created milestone-log entry before a
// step-specific preset list (see defaultListPresets below) has anything more specific.
export const MS_TYPE_PRESETS = [
  "Submitted",
  "Query / RFI received",
  "Resubmitted",
  "Provisional Permission",
  "Written Direction",
  "Written Permission",
  "Extension granted",
  "Cleared / approved",
  "Rejected",
  "Withdrawn",
  "Certificate issued",
];

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "role";
}

export function uniqueRoleId(name: string, existingIds: string[]): string {
  const base = slugify(name);
  const ids = new Set(existingIds);
  let id = base;
  let n = 2;
  while (ids.has(id)) {
    id = `${base}-${n}`;
    n++;
  }
  return id;
}

// The practice's default assignee roles, seeded on project creation — editable afterwards
// (renamed, recolored, reordered, or added to) via the Roles panel. Roles are never
// deleted once created, only reordered/renamed/recolored, to avoid silently orphaning an
// existing item_responsible assignment.
const DEFAULT_ROLE_NAMES = [
  "Architect",
  "C&S Engineer",
  "M&E Engineer",
  "Main Contractor",
  "Sub Contractor",
  "Plumber",
  "LEW",
  "Owner",
  "Quantity Surveyor",
  "Interior Designer",
  "Landscape Consultant",
];

export function defaultRoles(): { name: string; color: string; sortOrder: number }[] {
  return DEFAULT_ROLE_NAMES.map((name, i) => ({
    name,
    color: ROLE_PALETTE[i % ROLE_PALETTE.length],
    sortOrder: i,
  }));
}

// Seed suggestions for each flexible Overview submission log's label field — a starting
// point only. The user can add/rename/remove/reorder these per project (persisted to
// projects.list_presets), which then replaces this seed entirely for that project.
export function defaultListPresets(): Record<string, string[]> {
  return {
    ura__PP: [
      "PP Submitted",
      "PP Cleared / Granted",
      "No Commencement of Works (NCW)",
      "Written Direction (WD1)",
      "Rejected",
      "WP Submitted",
      "WP Granted",
    ],
    bca__BP: [
      "BP & HS Submitted",
      "BP & HS Cleared / Approved",
      "Received with Comments",
      "Received with Written Direction (WD)",
    ],
    bca__ST: [],
    nparks__TREE: ["DC (Development Control)", "BP (Building Plan)", "Self-Declaration (SD)"],
    lta__ACCESS: ["DC (Development Control)", "Lodgement"],
    pub__SW: ["DC (Development Control)", "DP (Detailed Plan)", "Deviation"],
    pub__SS: ["DC (Development Control)", "DP (Detailed Plan)", "Deviation"],
    scdf__FS: [
      "FSP Submitted",
      "FSP Cleared / Approved",
      "Received with Comments",
      "Received with Written Direction (WD)",
    ],
  };
}
