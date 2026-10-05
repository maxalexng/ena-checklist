// The Overview tab is a fixed, curated view — not a generic list — showing only these 6
// agency sections and their submission logs. Ported from the prototype's OV_SECTION_DEFS
// and renderOvSection* functions (each of which combined a heading, a blurb, and one or
// two milestone-log widgets keyed by `keys`).
/** A fixed row in a submission log: an approval the rounds lead to. It can be moved among
 * the rounds (PP Granted usually comes before the WP rounds) but never deleted, and once
 * it has a date it marks its Submission Map stages done. */
export interface LogCheckpoint {
  /** Stored milestone `type`. Existing rows are matched on it, so never change it once shipped. */
  type: string;
  label: string;
  /** Submission Map node ids (template/submissionMap.ts) this approval completes. */
  completes: string[];
}

export interface OverviewSectionDef {
  id: string;
  heading: string;
  /** One milestone-log widget per key; a label is shown when a section has more than one. */
  logs: { key: string; label: string; blurb: string; checkpoints?: LogCheckpoint[] }[];
  sectionBlurb?: string;
}

export const OV_SECTION_DEFS: OverviewSectionDef[] = [
  {
    id: "ura",
    heading: "URA — Provisional Permission (PP) / Written Permission (WP)",
    logs: [
      {
        key: "ura__PP",
        label: "PP / WP submissions",
        // WP straight away is the aim; a PP is acceptable on the way. A WP grant clears both.
        checkpoints: [
          { type: "PP Granted", label: "PP Granted", completes: ["ura-pp"] },
          { type: "WP Granted", label: "WP Granted", completes: ["ura-pp", "ura-wp"] },
        ],
        blurb:
          "Track each Provisional Permission (PP) submission round as it actually happens — cleared straight away, sent back with a Written Direction (WD), lapsed to No Commencement of Works (NCW), rejected outright, or carried straight into Written Permission (WP). Add one row per round; the label is free text, with suggestions.",
      },
    ],
  },
  {
    id: "bca",
    heading: "BCA — Building Plan & Structural Permits",
    logs: [
      {
        key: "bca__BP",
        label: "BP & HS submissions",
        checkpoints: [{ type: "BP & HS Approval (BP01)", label: "BP & HS Approval (BP01)", completes: ["bca-bp"] }],
        blurb: "Submitted, then cleared, or received back with comments or a Written Direction — track each round.",
      },
      {
        key: "bca__ST",
        label: "ST submissions",
        blurb:
          "Different engineers and projects number BCA ST permits completely differently — add each one under whatever label your team actually uses.",
      },
    ],
  },
  {
    id: "nparks",
    heading: "NParks — Development Control",
    logs: [
      {
        key: "nparks__TREE",
        label: "NParks submissions",
        blurb:
          "Tracked as Development Control (DC) at design stage and Building Plan (BP) at construction stage — tree felling/pruning is a component within the DC submission, not a separate approval of its own.",
      },
    ],
  },
  {
    id: "lta",
    heading: "LTA — Vehicular Access & Road Works",
    logs: [
      {
        key: "lta__ACCESS",
        label: "LTA submissions",
        blurb:
          "Development Control (DC) is the formal review; Lodgement is the self-declaration route a QP can use instead, where it applies.",
      },
    ],
  },
  {
    id: "pub",
    heading: "PUB — Drainage & Sewer",
    logs: [
      {
        key: "pub__SW",
        label: "PUB-DRA submissions",
        blurb:
          "Drainage and sewer clear independently — each tracks its own Development Control (DC) and Detailed Plan (DP) stages, plus any deviations.",
      },
      { key: "pub__SS", label: "PUB-SEW submissions", blurb: "" },
    ],
  },
  {
    id: "scdf",
    heading: "SCDF / FSSD — Fire Safety",
    logs: [
      {
        key: "scdf__FS",
        label: "Fire Safety submissions",
        blurb: "Submitted, then cleared, or received back with comments or a Written Direction — track each round.",
      },
    ],
  },
];

export const OV_SECTION_BY_ID: Record<string, OverviewSectionDef> = Object.fromEntries(
  OV_SECTION_DEFS.map((s) => [s.id, s])
);

/** Each submission log's fixed checkpoints, by step key. */
export const LOG_CHECKPOINTS_BY_STEP: Record<string, LogCheckpoint[]> = Object.fromEntries(
  OV_SECTION_DEFS.flatMap((s) => s.logs.filter((l) => l.checkpoints).map((l) => [l.key, l.checkpoints!]))
);

export function defaultOverviewSectionOrder(): string[] {
  return OV_SECTION_DEFS.map((s) => s.id);
}
