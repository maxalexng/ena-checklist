// The office's standard list of PC (Prime Cost) sum items for a landed residential project,
// run through with the client before the tender set is produced. Each new project gets a
// copy as pc_sums rows (createProject); after that the rows are the project's own, so
// renaming, removing or adding lines here never touches existing projects.

export type PcSumSelection = "tbc" | "client" | "recommended";

export const PC_SUM_SELECTION_LABELS: Record<PcSumSelection, string> = {
  tbc: "To discuss",
  client: "Client's choice",
  recommended: "Our recommendation",
};

export const DEFAULT_PC_SUM_ITEMS: string[] = [
  "Sanitary wares & fittings (WCs, basins, taps, showers)",
  "Shower screens & vanity mirrors",
  "Kitchen cabinets & countertops",
  "Kitchen appliances (hob, hood, oven, fridge)",
  "Wardrobes & built-in carpentry",
  "Floor & wall tiles",
  "Natural stone (marble / granite)",
  "Timber / engineered timber flooring",
  "Door ironmongery & digital locks",
  "Decorative lighting fittings",
  "Air-conditioning units",
  "Water heaters (storage / heat pump)",
  "Home lift",
  "Swimming pool equipment & finishes",
  "Main gate & autogate system",
  "Smart home / ELV (CCTV, intercom, alarm, Wi-Fi)",
  "Solar PV system",
  "Landscaping & softscape",
];
