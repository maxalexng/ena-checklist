// The office's standard list of PC (Prime Cost) sum items for a landed residential project,
// run through with the client before the tender set is produced. Each new project gets a
// copy as pc_sums rows (createProject); after that the rows are the project's own, so
// renaming, removing or adding lines here never touches existing projects.

// "contract" means the item isn't carried as a PC sum after all: it's fully specified in the
// contract documents (make, model, finish), so the contractor prices it within the contract
// sum and there's no separate allowance.
export type PcSumSelection = "tbc" | "client" | "recommended" | "contract";

export const PC_SUM_SELECTION_LABELS: Record<PcSumSelection, string> = {
  tbc: "To discuss",
  client: "Client's choice",
  recommended: "Our recommendation",
  contract: "Specified in contract",
};

// When on site each PC sum has to be decided: the latest point it can be settled without
// rework. The schedule is grouped and worked through in this order.
export type PcSumPhase = "structure" | "firstFix" | "envelope" | "finishes" | "fitout";

export interface PcSumPhaseInfo {
  id: PcSumPhase;
  name: string;
  decideBy: string;
}

export const PC_SUM_PHASES: PcSumPhaseInfo[] = [
  {
    id: "structure",
    name: "Structure-critical",
    decideBy: "Before the structural drawings are finalised and foundation / RC works start",
  },
  { id: "firstFix", name: "M&E first fix", decideBy: "Before conduits, piping and sleeves are cast or built in" },
  { id: "envelope", name: "Envelope", decideBy: "Before the building is made watertight" },
  { id: "finishes", name: "Finishes", decideBy: "Before screeding, tiling and ceiling works" },
  {
    id: "fitout",
    name: "Fit-out & external works",
    decideBy: "Before the carpenter's site measurement and the external works",
  },
];

export interface DefaultPcSum {
  item: string;
  phase: PcSumPhase;
  /** Prep needed earlier than the item's own phase; seeded into the row's note. */
  earlyPrep?: string;
}

// Titles from the office's "ENA Checklist for Prime Cost Sum Items" (29 Oct 2025). Sub-items
// listed under a heading there are folded into the line in brackets; the Finishes heading
// is split into its floor, wall and ceiling lines. Listed in phase order. Migration 0011
// sorts existing projects' rows into phases by these titles, so keep the two in step.
export const DEFAULT_PC_SUMS: DefaultPcSum[] = [
  { item: "Vertical Transportation", phase: "structure" },
  { item: "Swimming Pool System", phase: "structure" },
  { item: "Water Feature System (including ponds)", phase: "structure" },
  { item: "Sump Pump Systems", phase: "structure" },
  { item: "Flood Barrier System", phase: "structure" },
  { item: "Rainwater Harvesting System", phase: "structure" },
  { item: "Emergency Backup Generators", phase: "structure" },
  { item: "Wine Cellar", phase: "structure" },
  { item: "Spa & Sauna", phase: "structure" },
  { item: "Air-Conditioning & Mechanical Ventilation", phase: "firstFix" },
  { item: "Water Heaters", phase: "firstFix" },
  { item: "Fire Alarm Systems", phase: "firstFix" },
  { item: "CCTV, Security & Intercom", phase: "firstFix" },
  { item: "Integrated Home Automation System", phase: "firstFix" },
  { item: "Audio Visual System", phase: "firstFix" },
  { item: "Electrical Switches & Power Points", phase: "firstFix" },
  { item: "Light Fittings & Fans", phase: "firstFix" },
  { item: "Solar Panels", phase: "firstFix" },
  { item: "EV Charging Point(s) (32A 3-Phase)", phase: "firstFix" },
  { item: "Acoustic Treatments", phase: "firstFix" },
  { item: "Glazing (windows, glass doors, shower, skylights)", phase: "envelope" },
  { item: "External Façade", phase: "envelope" },
  { item: "Metalworks", phase: "envelope" },
  { item: "Floor Finishes — Tiles", phase: "finishes" },
  { item: "Floor Finishes — Stone", phase: "finishes" },
  {
    item: "Floor Finishes — Timber",
    phase: "finishes",
    earlyPrep: "Finish thickness sets the screed and door levels",
  },
  { item: "Wall Finishes", phase: "finishes" },
  { item: "Ceiling Finishes", phase: "finishes" },
  {
    item: "Sanitary Wares & Fittings",
    phase: "finishes",
    earlyPrep: "Concealed mixers and in-wall cisterns are roughed in at M&E first fix",
  },
  { item: "Ironmongery & Locksets", phase: "finishes" },
  {
    item: "Built-In Cabinetry (kitchen, bathroom, wardrobes, carpentry, interior design finishes)",
    phase: "fitout",
    earlyPrep: "Power, water and lighting points are set out at M&E first fix",
  },
  {
    item: "Kitchen Equipment & Appliances",
    phase: "fitout",
    earlyPrep: "Appliance sizes and services are needed for the kitchen cabinetry design",
  },
  {
    item: "Curtains & Motorised Blinds",
    phase: "fitout",
    earlyPrep: "Pelmets / ceiling recesses and power points for motors at M&E first fix",
  },
  { item: "Landscaping", phase: "fitout" },
  {
    item: "Automatic Sliding Gates",
    phase: "fitout",
    earlyPrep: "Gate motor power and conduits are laid with the external works",
  },
];

export const DEFAULT_PC_SUM_ITEMS: string[] = DEFAULT_PC_SUMS.map((d) => d.item);

/** The row note a standard item starts with. */
export function earlyPrepNote(d: DefaultPcSum): string {
  return d.earlyPrep ? `Early prep: ${d.earlyPrep}` : "";
}
