// The Overview tab is a fixed, curated view — not a generic list — showing only these 6
// agency sections and their submission logs. Ported from the prototype's OV_SECTION_DEFS
// and renderOvSection* functions (each of which combined a heading, a blurb, and one or
// two milestone-log widgets keyed by `keys`).
export interface OverviewSectionDef {
  id: string;
  heading: string;
  /** One milestone-log widget per key; a label is shown when a section has more than one. */
  logs: { key: string; label: string; blurb: string }[];
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

/** The 8 curated steps shown as Gantt rows on the Timeline tab — same set the Overview
 * tab's sections cover, flattened. */
export function timelineKeys(): string[] {
  return OV_SECTION_DEFS.flatMap((s) => s.logs.map((l) => l.key));
}

export function defaultOverviewSectionOrder(): string[] {
  return OV_SECTION_DEFS.map((s) => s.id);
}
