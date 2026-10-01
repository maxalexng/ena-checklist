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

// Based on the office's "ENA Checklist for Prime Cost Sum Items" (29 Oct 2025), titles only.
// Sub-items listed under a heading there are folded into the line in brackets; the
// Finishes heading is split into its floor, wall and ceiling lines.
export const DEFAULT_PC_SUM_ITEMS: string[] = [
  "Sanitary Wares & Fittings",
  "Ironmongery & Locksets",
  "CCTV, Security & Intercom",
  "Air-Conditioning & Mechanical Ventilation",
  "Vertical Transportation",
  "Light Fittings & Fans",
  "Electrical Switches & Power Points",
  "Built-In Cabinetry (kitchen, bathroom, wardrobes, carpentry, interior design finishes)",
  "Water Heaters",
  "Fire Alarm Systems",
  "Solar Panels",
  "EV Charging Point(s) (32A 3-Phase)",
  "Glazing (windows, glass doors, shower, skylights)",
  "External Façade",
  "Kitchen Equipment & Appliances",
  "Swimming Pool System",
  "Water Feature System (including ponds)",
  "Curtains & Motorised Blinds",
  "Emergency Backup Generators",
  "Integrated Home Automation System",
  "Audio Visual System",
  "Rainwater Harvesting System",
  "Flood Barrier System",
  "Sump Pump Systems",
  "Acoustic Treatments",
  "Floor Finishes — Tiles",
  "Floor Finishes — Stone",
  "Floor Finishes — Timber",
  "Wall Finishes",
  "Ceiling Finishes",
  "Landscaping",
  "Automatic Sliding Gates",
  "Wine Cellar",
  "Spa & Sauna",
  "Metalworks",
];
