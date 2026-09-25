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
  uraPpExtensionFee: number;
  uraWpExtensionFee: number;
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
    uraPpExtensionFee: 0,
    uraWpExtensionFee: 0,
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
      description: "PP extension (manual entry — see note below)",
      basis: "$500 (1st/2nd); +$1,000 incremental thereafter",
      inputUsed: "manual",
      fee: inputs.uraPpExtensionFee,
    },
    {
      agency: "URA",
      description: "WP extension (manual entry — see note below)",
      basis: "$500 (1st/2nd); +$1,000 incremental thereafter",
      inputUsed: "manual",
      fee: inputs.uraWpExtensionFee,
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
