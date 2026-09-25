import { FEE_RATES, NPARKS_CATEGORIES } from "@/template";
import type { NParksCategoryId, PubProjectType } from "@/template";

export interface FeeCalculatorInputs {
  sgfa: number;
  gcba: boolean;
  units: number;
  uraResubmissions: number;
  pubProjectType: PubProjectType;
  nparksCategory: NParksCategoryId;
  ltaSubmissionsFrom4th: number;
  bcaBpAmendmentStoreys: number;
  scdfFswAmendmentStoreys: number;
  bcaStAmendmentStoreys: number;
  uraPpExtensions: number;
  uraWpExtensions: number;
  bcaWaivers: number;
  scdfWaivers: number;
}

export function defaultFeeCalculatorInputs(): FeeCalculatorInputs {
  return {
    sgfa: 0,
    gcba: false,
    units: 1,
    uraResubmissions: 0,
    pubProjectType: "Minor",
    nparksCategory: "non-tca",
    ltaSubmissionsFrom4th: 0,
    bcaBpAmendmentStoreys: 0,
    scdfFswAmendmentStoreys: 0,
    bcaStAmendmentStoreys: 0,
    uraPpExtensions: 0,
    uraWpExtensions: 0,
    bcaWaivers: 0,
    scdfWaivers: 0,
  };
}

export interface FeeLineItem {
  agency: string;
  description: string;
  basis: string;
  inputUsed: string;
  fee: number;
}

/** SGFA rounded up to the next 100 m² — BCA and SCDF both charge per 100 m² "or part
 * thereof", so a partial 100 m² block still costs a full increment. */
export function roundedSgfa(sgfa: number): number {
  return Math.ceil(Math.max(sgfa, 0) / 100) * 100;
}

/** URA's New Erection fee for a single landed dwelling unit — GCBA costs more than
 * outside it (see feeRates.ts). Resubmissions are half of whichever applies. */
export function uraNewErectionRate(gcba: boolean): number {
  return gcba ? FEE_RATES.uraNewErectionGcba : FEE_RATES.uraNewErectionNonGcba;
}

/** Fee for the nth (1-based) URA PP/WP extension — $500 for the 1st and 2nd, then $1,000
 * for the 3rd, $2,000 for the 4th, and so on. */
export function uraExtensionFee(nth: number): number {
  if (nth < 1) return 0;
  if (nth <= 2) return FEE_RATES.uraExtensionFirstTwo;
  return (nth - 2) * FEE_RATES.uraExtensionIncrement;
}

/** Each individual extension's fee, 1st to count-th, e.g. 3 → [500, 500, 1000]. */
export function uraExtensionFees(count: number): number[] {
  return Array.from({ length: Math.max(Math.floor(count), 0) }, (_, i) => uraExtensionFee(i + 1));
}

function uraExtensionBasis(count: number): string {
  if (count < 1) return "$500 (1st/2nd); $1,000 (3rd); +$1,000 more for each one after";
  return uraExtensionFees(count)
    .map((f) => `$${f.toLocaleString()}`)
    .join(" + ");
}

function nparksFee(category: NParksCategoryId): number {
  return NPARKS_CATEGORIES.find((c) => c.id === category)?.fee ?? 0;
}

/** The full Step 2 breakdown — one line per fee, in the same order as the office's own
 * spreadsheet, plus a computed grand total. Every input defaults to 0/false, so an empty
 * form computes cleanly to an all-zero breakdown rather than throwing. */
export function computeFeeBreakdown(inputs: FeeCalculatorInputs): FeeLineItem[] {
  const sgfaRounded = roundedSgfa(inputs.sgfa);
  const uraRate = uraNewErectionRate(inputs.gcba);
  const bcaTier1Sqm = Math.min(sgfaRounded, FEE_RATES.bcaTierThresholdSqm);
  const bcaTier2Sqm = Math.max(sgfaRounded - FEE_RATES.bcaTierThresholdSqm, 0);
  const nparksCategory = NPARKS_CATEGORIES.find((c) => c.id === inputs.nparksCategory);
  const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

  return [
    {
      agency: "URA",
      description: "First submission (per house)",
      basis: `$${uraRate.toLocaleString()} per house${inputs.gcba ? " (in GCBA)" : ""}`,
      inputUsed: String(inputs.units),
      fee: uraRate * inputs.units,
    },
    {
      agency: "URA",
      description: "Resubmission fee",
      basis: `$${(uraRate / 2).toLocaleString()} each (half of 1st submission)`,
      inputUsed: String(inputs.uraResubmissions),
      fee: (uraRate / 2) * inputs.uraResubmissions,
    },
    {
      agency: "URA",
      description: "Provisional Permission (PP) extensions",
      basis: uraExtensionBasis(inputs.uraPpExtensions),
      inputUsed: String(inputs.uraPpExtensions),
      fee: sum(uraExtensionFees(inputs.uraPpExtensions)),
    },
    {
      agency: "URA",
      description: "Written Permission (WP) extensions",
      basis: uraExtensionBasis(inputs.uraWpExtensions),
      inputUsed: String(inputs.uraWpExtensions),
      fee: sum(uraExtensionFees(inputs.uraWpExtensions)),
    },
    {
      agency: "PUB",
      description: "Drainage / sewerage / sanitary — one-time submission fee",
      basis: `Minor $${FEE_RATES.pubMinor.toLocaleString()} / Major $${FEE_RATES.pubMajor.toLocaleString()}`,
      inputUsed: inputs.pubProjectType,
      fee: inputs.pubProjectType === "Major" ? FEE_RATES.pubMajor : FEE_RATES.pubMinor,
    },
    {
      agency: "BCA",
      description: `Building Plan 1st submission — first ${FEE_RATES.bcaTierThresholdSqm.toLocaleString()} m² of SGFA`,
      basis: `$${FEE_RATES.bcaFirst2500PerHundredSqm} per 100 m²`,
      inputUsed: String(bcaTier1Sqm),
      fee: (bcaTier1Sqm / 100) * FEE_RATES.bcaFirst2500PerHundredSqm,
    },
    {
      agency: "BCA",
      description: `Building Plan 1st submission — SGFA above ${FEE_RATES.bcaTierThresholdSqm.toLocaleString()} m²`,
      basis: `$${FEE_RATES.bcaAbove2500PerHundredSqm} per 100 m²`,
      inputUsed: String(bcaTier2Sqm),
      fee: (bcaTier2Sqm / 100) * FEE_RATES.bcaAbove2500PerHundredSqm,
    },
    {
      agency: "BCA",
      description: "Building Plan amendment",
      basis: `$${FEE_RATES.bcaAmendmentPerStorey} per storey per block`,
      inputUsed: String(inputs.bcaBpAmendmentStoreys),
      fee: FEE_RATES.bcaAmendmentPerStorey * inputs.bcaBpAmendmentStoreys,
    },
    {
      agency: "BCA",
      description: "Structural Plan 1st submission (engineer / PE)",
      basis: "No separate fee — covered by the BCA plan fee above, paid once per project",
      inputUsed: "—",
      fee: 0,
    },
    {
      agency: "BCA",
      description: "Structural Plan amendment (engineer / PE)",
      basis: `$${FEE_RATES.bcaAmendmentPerStorey} per storey per block`,
      inputUsed: String(inputs.bcaStAmendmentStoreys),
      fee: FEE_RATES.bcaAmendmentPerStorey * inputs.bcaStAmendmentStoreys,
    },
    {
      agency: "BCA",
      description: "Modification / waiver of building regulations",
      basis: `$${FEE_RATES.bcaWaiverPerItem} per waiver item`,
      inputUsed: String(inputs.bcaWaivers),
      fee: FEE_RATES.bcaWaiverPerItem * inputs.bcaWaivers,
    },
    {
      agency: "LTA",
      description: "Development Control submission",
      basis: `$${FEE_RATES.ltaPerSubmissionFrom4th} per submission, 4th onwards only`,
      inputUsed: String(inputs.ltaSubmissionsFrom4th),
      fee: FEE_RATES.ltaPerSubmissionFrom4th * inputs.ltaSubmissionsFrom4th,
    },
    {
      agency: "NPARKS",
      description: "One-time submission fee (category selected above)",
      basis: "Per category — see rates note below",
      inputUsed: nparksCategory?.label ?? inputs.nparksCategory,
      fee: nparksFee(inputs.nparksCategory),
    },
    {
      agency: "SCDF",
      description: "New fire safety works — 1st submission (plans without prescribed fire safety measures)",
      basis: `$${FEE_RATES.scdfNewFswPerHundredSqm} per 100 m² or part thereof`,
      inputUsed: String(sgfaRounded),
      fee: (sgfaRounded / 100) * FEE_RATES.scdfNewFswPerHundredSqm,
    },
    {
      agency: "SCDF",
      description: "Amendment to approved fire safety works",
      basis: `$${FEE_RATES.scdfAmendmentPerStorey} per storey`,
      inputUsed: String(inputs.scdfFswAmendmentStoreys),
      fee: FEE_RATES.scdfAmendmentPerStorey * inputs.scdfFswAmendmentStoreys,
    },
    {
      agency: "SCDF",
      description: "Fire safety waiver",
      basis: `$${FEE_RATES.scdfWaiverPerItem} per waiver item`,
      inputUsed: String(inputs.scdfWaivers),
      fee: FEE_RATES.scdfWaiverPerItem * inputs.scdfWaivers,
    },
    {
      agency: "NEA",
      description: "Lodgement scheme fee (Lodgment EPH $300 + Lodgment PC $300)",
      basis: `$${FEE_RATES.neaLodgementScheme} per project`,
      inputUsed: "1",
      fee: FEE_RATES.neaLodgementScheme,
    },
  ];
}

export function feeBreakdownTotal(lines: FeeLineItem[]): number {
  return lines.reduce((sum, l) => sum + l.fee, 0);
}
