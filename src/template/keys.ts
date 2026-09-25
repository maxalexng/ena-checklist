import { AGENCIES } from "./agencies";
import { STEP_ORDER } from "./stepOrder";
import type { Agency, StepOrderTriple, Submission, TemplateItem, TemplateStep } from "./types";

/** Same sanitizer the prototype used: strips anything but letters/digits from a code. */
function sanitizeCode(code: string): string {
  return code.replace(/[^a-z0-9]/gi, "");
}

export function stepKey(agencyId: string, code: string): string {
  return `${agencyId}__${sanitizeCode(code)}`;
}

interface SubEntry {
  agency: Agency;
  submission: Submission;
}

const KEY_TO_SUB: Record<string, SubEntry> = {};
const ITEM_BY_ID: Record<string, TemplateItem> = {};

function buildItems(agency: Agency, submission: Submission, key: string): TemplateItem[] {
  return submission.items.map((entry, i) => {
    const text = typeof entry === "string" ? entry : entry.text;
    const agencyCode =
      typeof entry === "object" && "agencyCode" in entry && entry.agencyCode
        ? entry.agencyCode
        : submission.stepCode || agency.code;
    const checklist =
      typeof entry === "object" && "checklist" in entry && Array.isArray(entry.checklist)
        ? entry.checklist
        : null;
    const item: TemplateItem = { id: `${key}__${i}`, text, agencyCode, checklist };
    ITEM_BY_ID[item.id] = item;
    return item;
  });
}

AGENCIES.forEach((agency) => {
  agency.submissions.forEach((submission) => {
    const key = stepKey(agency.id, submission.code);
    KEY_TO_SUB[key] = { agency, submission };
    // itemObjs are built once here and reused by STEPS below (mirrors the prototype's
    // eager "assign stable ids/keys" pass over AGENCIES).
    buildItems(agency, submission, key);
  });
});

/** Flattened, render-ready steps — one per STEP_ORDER entry, in canonical order. */
export const STEPS: TemplateStep[] = STEP_ORDER.map((triple: StepOrderTriple, idx) => {
  const [stageId, agencyId, code] = triple;
  const key = stepKey(agencyId, code);
  const entry = KEY_TO_SUB[key];
  if (!entry) {
    throw new Error(`STEP_ORDER references unknown submission: ${key}`);
  }
  const { agency, submission } = entry;
  return {
    id: key,
    realId: agency.id,
    code: submission.stepCode || agency.code,
    name: submission.stepName || agency.name,
    full: agency.full,
    blurb: submission.stepBlurb || agency.blurb,
    conditional: agency.conditional,
    stepNo: idx + 1,
    defaultStage: stageId,
    isConsultantList: submission.isConsultantList,
    isDesignReviewLog: submission.isDesignReviewLog,
    submission,
    items: buildItems(agency, submission, key),
  };
});

export const STEP_BY_ID: Record<string, TemplateStep> = Object.fromEntries(
  STEPS.map((s) => [s.id, s])
);

export function itemById(id: string): TemplateItem | undefined {
  return ITEM_BY_ID[id];
}

/** Parses `${agencyId}__${code}__${index}` back into its parts — used by the migration
 * script to derive step_key/agency_id from a legacy item id without re-deriving the whole
 * template build. */
export function parseItemId(itemId: string): { stepKey: string; index: number } | null {
  const m = /^(.+)__(\d+)$/.exec(itemId);
  if (!m) return null;
  return { stepKey: m[1], index: Number(m[2]) };
}

export function agencyIdForStepKey(key: string): string | undefined {
  return KEY_TO_SUB[key]?.agency.id;
}

// Palette of distinct chip colors so different assignee roles are visually distinguishable
// at a glance; cycled by position as roles are created.
export const ROLE_PALETTE = [
  "blue",
  "violet",
  "teal",
  "amber",
  "orange",
  "cyan",
  "rose",
  "green",
  "slate",
  "brass",
] as const;

// Same idea applied to the governing bodies themselves: every agency code badge gets its
// own stable color everywhere its code appears. A few agencies get a fixed,
// semantically-obvious color instead of an auto-cycled one; everyone else cycles through
// what's left. Keyed by the displayed CODE (not agency id) since an item's agencyCode can
// point at a different agency than its own step.
const AGENCY_COLOR_OVERRIDES: Record<string, string> = { BCA: "red", NParks: "green", PUB: "blue" };
const AGENCY_COLOR_CYCLE = ["violet", "teal", "amber", "orange", "cyan", "rose", "slate", "brass"];

export const AGENCY_COLOR_BY_CODE: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  let cycleIdx = 0;
  AGENCIES.forEach((a) => {
    if (AGENCY_COLOR_OVERRIDES[a.code]) {
      out[a.code] = AGENCY_COLOR_OVERRIDES[a.code];
    } else {
      out[a.code] = AGENCY_COLOR_CYCLE[cycleIdx % AGENCY_COLOR_CYCLE.length];
      cycleIdx++;
    }
  });
  return out;
})();

export function agencyColorFor(code: string): string {
  return AGENCY_COLOR_BY_CODE[code] || "slate";
}

// Official agency logos, extracted from the prototype's inline base64 blob into real files
// at public/logos/<agencyId>.png (kept out of app code — see public/logos/README.md).
// Agencies with no real-world logo (admin, site) fall back to the plain colored code badge.
const AGENCIES_WITH_LOGO = new Set([
  "bca",
  "corenet",
  "imda",
  "iras",
  "lta",
  "mom",
  "nea",
  "nparks",
  "pub",
  "scdf",
  "sla",
  "tfcc",
  "tp",
  "ura",
  "utilities",
]);

export function agencyLogoSrc(agencyId: string): string | null {
  return AGENCIES_WITH_LOGO.has(agencyId) ? `/logos/${agencyId}.png` : null;
}

/** Keep only ids from `saved` that still exist in `validIds` (in that order), then append
 * any valid id not already present — so stale entries drop out and new template content
 * lands at the end instead of vanishing. Used for step_order/overview_section_order. */
export function reconcileOrder(saved: string[] | null | undefined, validIds: string[]): string[] {
  const validSet = new Set(validIds);
  const seen = new Set<string>();
  const out: string[] = [];
  (saved || []).forEach((id) => {
    if (validSet.has(id) && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  });
  validIds.forEach((id) => {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  });
  return out;
}

export function defaultStepOrder(): string[] {
  return STEPS.map((s) => s.id);
}
