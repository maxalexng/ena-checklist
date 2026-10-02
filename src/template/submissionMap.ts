// The Overview tab's submission map: the regulatory process laid out agency by agency, after
// CORENET's own process diagram (info.corenet.gov.sg, "About the new submission process").
// URA runs OPP → PP → WP; the other agencies each clear Development Control (DC) and their
// Building Plan (BP) stage, then give their own TOP and CSC clearances, which all feed BCA's
// overall TOP and CSC.
//
// A node takes its status from the checklist steps (or single items) it links to. A node
// with no link is tracked by hand from the Overview tab. Node ids are stored in
// projects.submission_map (migration 0012), so never rename or reuse one.

import type { StageId } from "./types";

/** Left-to-right positions on the map. Each agency only has nodes in some of them. */
export const MAP_COLUMNS = ["survey", "opp", "pp", "wp", "demo", "dc", "st", "bp", "permit", "top", "csc"] as const;
export type MapColumnId = (typeof MAP_COLUMNS)[number];

/** The bands across the top of the map, each spanning a run of columns. */
export const MAP_PHASES: { id: string; label: string; columns: MapColumnId[] }[] = [
  { id: "site", label: "Site", columns: ["survey"] },
  { id: "planning", label: "Planning permission", columns: ["opp", "pp", "wp"] },
  { id: "plans", label: "Plan approval", columns: ["demo", "dc", "st", "bp"] },
  { id: "construction", label: "Construction", columns: ["permit"] },
  { id: "completion", label: "Completion", columns: ["top", "csc"] },
];

/** The office stage whose end is a stage's typical target date on the Timeline tab, for
 * stages with no checklist step to follow. A linked stage follows its step's own stage
 * (including any stage moves on the Checklist tab). */
export const MAP_COLUMN_STAGE: Record<MapColumnId, StageId> = {
  survey: "pre-design",
  opp: "concept",
  pp: "detailed",
  wp: "detailed",
  demo: "construction",
  dc: "detailed",
  st: "tender",
  bp: "tender",
  permit: "construction",
  top: "top",
  csc: "csc",
};

export interface MapNodeLink {
  /** Step key, e.g. "ura__PP". */
  step: string;
  /** Only these items of the step (by template index), when the step covers more than this node. */
  items?: number[];
}

export interface MapNodeDef {
  /** Stored in projects.submission_map: stable, never renamed. */
  id: string;
  column: MapColumnId;
  /** Short label shown above the node. */
  label: string;
  /** Full name, shown on hover and in the node's panel. */
  name: string;
  /** How this stage is reached from the one before, when it isn't a full submission. */
  route?: "Lodgement" | "Self-declaration";
  /** Only some projects need it (URA's OPP, demolition). */
  optional?: boolean;
  /** The stage always happens, and its linked checklist items are only optional parts of
   * it (LTA's DC links to vehicular access and traffic impact, which many projects skip).
   * When every linked item is N/A, the stage is tracked by hand instead of going N/A. */
  required?: boolean;
  /** The office stage whose end is this stage's typical target, when that isn't its linked
   * step's stage (SLA's as-built lodgement reads an item of the pre-design survey step,
   * but happens at CSC). */
  stage?: StageId;
  /** Who makes the submission, when it isn't us. Consecutive stages with the same `by`
   * are bracketed together on the map. */
  by?: string;
  links: MapNodeLink[];
  /** Read the linked step's submission log too, for nodes that share one step: done once
   * a log entry matches `done` (and not `notDone`), under way once one matches `started`. */
  log?: { done: RegExp; started?: RegExp; notDone?: RegExp };
}

export interface MapRowDef {
  /** Agency id, for the logo and for jumping to the agency in the checklist. */
  agencyId: string;
  label: string;
  /** What the agency covers, under its name. */
  scope: string[];
  nodes: MapNodeDef[];
}

// Log entries that mean the permission was actually given, not just applied for.
const GRANTED = "(grant|approv|clear|issu|obtain|receiv)";
// URA outcomes that aren't the clearance we're after: an Advice, or a PP with No
// Commencement of Works. WP straight away is best and a plain PP is acceptable; these aren't.
const NOT_CLEARED = /\bncw\b|no commencement|advice/i;

export const SUBMISSION_MAP: MapRowDef[] = [
  {
    agencyId: "ura",
    label: "URA",
    scope: ["Planning"],
    nodes: [
      {
        id: "ura-opp",
        column: "opp",
        label: "Outline",
        name: "Outline Planning Permission",
        optional: true,
        links: [{ step: "ura__OP" }],
      },
      {
        id: "ura-pp",
        column: "pp",
        label: "PP",
        name: "Provisional Permission",
        links: [{ step: "ura__PP" }],
        // Written Permission supersedes PP, so a WP grant also means PP is behind us.
        log: {
          done: new RegExp(`provisional permission|written permission|\\b[pw]p\\b.*${GRANTED}|${GRANTED}.*\\b[pw]p\\b`, "i"),
          started: /./,
          notDone: NOT_CLEARED,
        },
      },
      {
        id: "ura-wp",
        column: "wp",
        label: "WP",
        name: "Written Permission",
        links: [{ step: "ura__PP" }],
        log: {
          done: new RegExp(`written permission|\\bwp\\b.*${GRANTED}|${GRANTED}.*\\bwp\\b`, "i"),
          started: /\bwp\b/i,
          notDone: NOT_CLEARED,
        },
      },
      { id: "ura-top", column: "top", label: "TOP", name: "URA clearance for TOP", links: [] },
      { id: "ura-csc", column: "csc", label: "CSC", name: "URA clearance for CSC", links: [] },
    ],
  },
  {
    agencyId: "bca",
    label: "BCA",
    scope: ["Building Control"],
    nodes: [
      {
        id: "bca-demo",
        column: "demo",
        label: "Demolition",
        name: "Demolition permit",
        optional: true,
        by: "C&S engineer",
        links: [{ step: "bca__DEMO" }],
      },
      {
        id: "bca-st-piling",
        column: "dc",
        label: "ST (piling)",
        name: "Structural plan — piling",
        by: "C&S engineer",
        links: [{ step: "bca__ST" }],
        log: { done: new RegExp(`pil.*${GRANTED}|${GRANTED}.*pil`, "i"), started: /pil/i },
      },
      {
        id: "bca-st",
        column: "st",
        label: "ST (other)",
        name: "Structural plan — other structural works",
        by: "C&S engineer",
        links: [{ step: "bca__ST" }],
      },
      { id: "bca-bp", column: "bp", label: "BP", name: "Building Plan approval", links: [{ step: "bca__BP" }] },
      {
        id: "bca-permit",
        column: "permit",
        label: "Permit",
        name: "Permit to Commence Building Works",
        links: [{ step: "bca__PERMIT" }],
      },
      { id: "bca-top", column: "top", label: "Overall TOP", name: "Temporary Occupation Permit", links: [{ step: "bca__TOP" }] },
      {
        id: "bca-csc",
        column: "csc",
        label: "Overall CSC",
        name: "Certificate of Statutory Completion",
        links: [{ step: "bca__CSC" }],
      },
    ],
  },
  {
    agencyId: "nea",
    label: "NEA",
    scope: ["Environment", "Pollution"],
    nodes: [
      { id: "nea-dc", column: "dc", label: "DC", name: "NEA development control", links: [{ step: "nea__ENV" }] },
      { id: "nea-bp", column: "bp", label: "BP", name: "NEA building plan clearance", links: [] },
      { id: "nea-top", column: "top", label: "TOP", name: "NEA clearance for TOP", links: [] },
      { id: "nea-csc", column: "csc", label: "CSC", name: "NEA clearance for CSC", route: "Lodgement", links: [] },
    ],
  },
  {
    agencyId: "lta",
    label: "LTA",
    scope: ["Traffic", "Rail", "Parking"],
    nodes: [
      {
        id: "lta-dc",
        column: "dc",
        label: "DC",
        name: "LTA development control",
        required: true,
        links: [{ step: "lta__ACCESS" }, { step: "lta__TIA" }],
      },
      { id: "lta-bp", column: "bp", label: "BP", name: "LTA building plan clearance", route: "Lodgement", links: [] },
      { id: "lta-csc", column: "csc", label: "CSC", name: "LTA clearance for CSC", links: [] },
    ],
  },
  {
    agencyId: "pub",
    label: "PUB",
    scope: ["Drainage", "Sewerage"],
    nodes: [
      {
        id: "pub-dc",
        column: "dc",
        label: "DC",
        name: "PUB development control (drainage and sewerage)",
        links: [{ step: "pub__SW" }, { step: "pub__SS" }],
      },
      { id: "pub-bp", column: "bp", label: "BP", name: "PUB building plan clearance", route: "Lodgement", links: [] },
      {
        id: "pub-top",
        column: "top",
        label: "TOP",
        name: "PUB clearance for TOP",
        links: [{ step: "pub__CLR" }, { step: "pub__WS" }],
      },
      { id: "pub-csc", column: "csc", label: "CSC", name: "PUB clearance for CSC", links: [] },
    ],
  },
  {
    agencyId: "nparks",
    label: "NParks",
    scope: ["Trees", "Greenery"],
    nodes: [
      { id: "nparks-dc", column: "dc", label: "DC", name: "NParks development control", links: [{ step: "nparks__TREE" }] },
      {
        id: "nparks-bp",
        column: "bp",
        label: "BP",
        name: "NParks building plan (greenery)",
        route: "Self-declaration",
        required: true,
        links: [{ step: "nparks__GREEN" }],
      },
      { id: "nparks-csc", column: "csc", label: "CSC", name: "NParks clearance for CSC", route: "Self-declaration", links: [] },
    ],
  },
  {
    agencyId: "scdf",
    label: "SCDF",
    scope: ["Fire Safety"],
    nodes: [
      { id: "scdf-bp", column: "bp", label: "BP", name: "Fire safety plan approval", links: [{ step: "scdf__FS" }] },
      {
        id: "scdf-top",
        column: "top",
        label: "TOP",
        name: "Fire Safety Certificate / Temporary Fire Permit",
        links: [{ step: "scdf__FSCTFP" }],
      },
    ],
  },
  {
    agencyId: "sla",
    label: "SLA",
    scope: ["Land", "Survey"],
    nodes: [
      {
        id: "sla-survey",
        column: "survey",
        label: "Survey",
        name: "Cadastral and boundary survey",
        links: [{ step: "sla__SURVEY", items: [0, 1, 2, 3] }],
      },
      {
        id: "sla-csc",
        column: "csc",
        label: "As-built",
        name: "As-built survey plan lodgement",
        route: "Lodgement",
        required: true,
        stage: "csc",
        links: [{ step: "sla__SURVEY", items: [4] }],
      },
    ],
  },
  {
    agencyId: "tfcc",
    label: "TFCC",
    scope: ["Telecom", "Fibre"],
    nodes: [
      { id: "tfcc-plans", column: "dc", label: "Plans", name: "Telecom facility plans", links: [{ step: "tfcc__PLAN" }] },
      { id: "tfcc-fibre", column: "top", label: "Fibre", name: "Fibre lead-in, before TOP", links: [{ step: "tfcc__FIBRE" }] },
    ],
  },
];

