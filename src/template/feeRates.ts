// Authority submission fee rates for a "New Erection / Reconstruction" landed housing
// project — ported from the office's own New_Erection_Reconstruction_Sub_Fee_Calculator
// spreadsheet, cross-checked against each agency's own published fee schedule (Sep 2026)
// and corrected where the office's copy had drifted from the current published rate. Fees
// change; re-verify against CORENET X / each agency's site before quoting a client — same
// disclaimer the original spreadsheet carried.
//
// Sources checked:
// - URA: "Appendix 2: Development Control & Conservation Fee Schedule" (Sep 2024),
//   https://go.gov.sg/feeschedule — Table 1 (New Erection, Landed Housing), Table 5
//   (Resubmissions, Extension of Permissions).
// - BCA: "Building Plan Submission Fee Schedule" (effective 30 Dec 2024),
//   https://www1.bca.gov.sg/safety-and-standards/applications-and-licenses/building-plan-submission/statistical-gross-floor-area-and-plan-fees/
// - PUB: "Application Fees for Submission of Building Plan and Water Service Works"
//   (effective 1 Apr 2025), https://www.pub.gov.sg/Professionals/Requirements/Qualified-Persons/Building-Plan-Submission-Process-Flow/Application-Fees-for-Submission-of-Building-Plan-and-Water-Service-Works
// - NParks: "Development Submission Plan Application Fee Schedule",
//   https://www.nparks.gov.sg/services/development-plan-submission — Development Control
//   fees by development type / tree-conservation-area status.
// - LTA: "Service Standards Fees Schedule" (last updated 15 Jan 2024),
//   https://www.lta.gov.sg/content/dam/ltagov/industry_innovations/industry_matters/development_construction_resources/pdf/service_standard_and_fees_schedule.pdf
//   — Vehicle Parking Proposals resubmission fee.
// - SCDF and NEA rates below are carried over from the office's own spreadsheet as-is —
//   the only current public source found for SCDF's fire-safety-works plan fee (a 2015
//   circular) didn't cleanly match the office's figure, and NEA's lodgement scheme fee
//   couldn't be independently re-confirmed online — flag these two for a manual check
//   against CORENET X before relying on them.

export const NPARKS_CATEGORIES = [
  {
    id: "non-tca",
    label: "Non-TCA — Detached / Semi-Detached",
    fee: 1605,
  },
  {
    id: "tca-gcb",
    label: "TCA — Good Class Bungalow",
    fee: 2675,
  },
  {
    id: "tca-other",
    label: "TCA — Detached / Semi-D / Terrace / Strata / Cluster",
    fee: 2140,
  },
] as const;

export type NParksCategoryId = (typeof NPARKS_CATEGORIES)[number]["id"];

export const PUB_PROJECT_TYPES = ["Minor", "Major"] as const;
export type PubProjectType = (typeof PUB_PROJECT_TYPES)[number];

export const FEE_RATES = {
  // URA New Erection, Landed Housing (Table 1) — a single unit inside a Good Class
  // Bungalow Area (GCBA) costs more than one outside it. Resubmissions are 50% of
  // whichever of those two applies (Table 5).
  uraNewErectionGcba: 8000,
  uraNewErectionNonGcba: 6000,

  // URA extension of validity for Provisional Permission / Written Permission (Table 5) —
  // same fee scale for both: 1st & 2nd extension $500 each, 3rd and every subsequent
  // extension adds another $1,000. Ambiguous enough in the office's own reading (and left
  // as a manual entry in their spreadsheet) that this stays a manual $ field rather than an
  // auto-computed one here.

  // PUB drainage/sewerage/sanitary works, one-time submission fee.
  pubMinor: 1450,
  pubMajor: 1850,

  // BCA Building Plan, new SGFA (General Buildings, above sublevel) — tiered: first
  // 2,500 m² at one rate, everything above at a lower rate.
  bcaFirst2500PerHundredSqm: 300,
  bcaAbove2500PerHundredSqm: 270,
  bcaTierThresholdSqm: 2500,

  // BCA Building Plan amendment/deviation to an approved plan, per storey.
  bcaAmendmentPerStorey: 200,

  // LTA vehicle parking proposal resubmission — free for the first 3 submissions, then
  // charged per submission from the 4th onwards.
  ltaPerSubmissionFrom4th: 300,

  // SCDF — carried over from the office spreadsheet; see source note above.
  scdfNewFswPerHundredSqm: 100,
  scdfAmendmentPerStorey: 90,

  // NEA lodgement scheme (Environmental Public Health + Pollution Control) — carried over
  // from the office spreadsheet; see source note above.
  neaLodgementScheme: 600,
} as const;
