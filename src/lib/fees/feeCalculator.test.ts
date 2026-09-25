import { describe, expect, it } from "vitest";
import {
  computeFeeBreakdown,
  defaultFeeCalculatorInputs,
  feeBreakdownTotal,
  roundedSgfa,
  uraNewErectionRate,
} from "./feeCalculator";

describe("roundedSgfa", () => {
  it("rounds up to the next 100 m²", () => {
    expect(roundedSgfa(1000)).toBe(1000);
    expect(roundedSgfa(1001)).toBe(1100);
    expect(roundedSgfa(50)).toBe(100);
    expect(roundedSgfa(0)).toBe(0);
  });

  it("never goes negative", () => {
    expect(roundedSgfa(-50)).toBe(0);
  });
});

describe("uraNewErectionRate", () => {
  it("is $8,000 inside a GCBA and $6,000 outside", () => {
    expect(uraNewErectionRate(true)).toBe(8000);
    expect(uraNewErectionRate(false)).toBe(6000);
  });
});

describe("computeFeeBreakdown", () => {
  it("computes zero for every count/area-based fee when the inputs are all zero", () => {
    const inputs = defaultFeeCalculatorInputs();
    inputs.units = 0; // isolate the "all zero" case fully
    const lines = computeFeeBreakdown(inputs);
    // NEA (flat per-project) and PUB (flat Minor/Major, always charged) are the only fees
    // that don't scale off SGFA/units/counts, so they're the only ones still non-zero —
    // plus NParks, whose per-category fee is likewise flat once a category is selected.
    const nonZero = lines.filter((l) => l.fee > 0).map((l) => l.agency);
    expect(new Set(nonZero)).toEqual(new Set(["NEA", "NPARKS", "PUB"]));
  });

  it("matches the office spreadsheet's own worked example (1,000 m² SGFA, 1 house, non-GCBA, PUB Minor, NParks non-TCA)", () => {
    const inputs = defaultFeeCalculatorInputs();
    inputs.sgfa = 1000;
    inputs.units = 1;
    const lines = computeFeeBreakdown(inputs);
    const byAgencyDesc = (agency: string, description: string) =>
      lines.find((l) => l.agency === agency && l.description === description)!.fee;

    expect(byAgencyDesc("URA", "First submission (per house)")).toBe(6000);
    expect(byAgencyDesc("PUB", "Drainage / sewerage / sanitary — one-time submission fee")).toBe(1450);
    expect(byAgencyDesc("BCA", "Building Plan 1st submission — first 2,500 m² of SGFA")).toBe(3000);
    expect(byAgencyDesc("NPARKS", "One-time submission fee (category selected above)")).toBe(1605);
    expect(byAgencyDesc("SCDF", "New fire safety works — 1st submission (plans without prescribed fire safety measures)")).toBe(
      1000
    );
    expect(byAgencyDesc("NEA", "Lodgement scheme fee (Lodgment EPH $300 + Lodgment PC $300)")).toBe(600);

    // Spreadsheet's own worked total for this exact scenario (non-GCBA).
    expect(feeBreakdownTotal(lines)).toBe(13655);
  });

  it("charges the GCBA rate for URA's new erection fee and resubmissions when gcba is true", () => {
    const inputs = defaultFeeCalculatorInputs();
    inputs.gcba = true;
    inputs.units = 1;
    inputs.uraResubmissions = 1;
    const lines = computeFeeBreakdown(inputs);
    expect(lines.find((l) => l.description === "First submission (per house)")!.fee).toBe(8000);
    expect(lines.find((l) => l.description === "Resubmission fee")!.fee).toBe(4000); // half of 8,000
  });

  it("applies the BCA tiered rate above 2,500 m² of SGFA", () => {
    const inputs = defaultFeeCalculatorInputs();
    inputs.sgfa = 3000;
    const lines = computeFeeBreakdown(inputs);
    expect(lines.find((l) => l.description.includes("first 2,500"))!.fee).toBe(7500); // 2500/100*300
    expect(lines.find((l) => l.description.includes("above 2,500"))!.fee).toBe(1350); // 500/100*270
  });

  it("charges the PUB Major rate when selected", () => {
    const inputs = defaultFeeCalculatorInputs();
    inputs.pubProjectType = "Major";
    const lines = computeFeeBreakdown(inputs);
    expect(lines.find((l) => l.agency === "PUB")!.fee).toBe(1850);
  });

  it("looks up the correct NParks fee for each category", () => {
    const base = defaultFeeCalculatorInputs();
    expect(computeFeeBreakdown({ ...base, nparksCategory: "non-tca" }).find((l) => l.agency === "NPARKS")!.fee).toBe(
      1605
    );
    expect(computeFeeBreakdown({ ...base, nparksCategory: "tca-gcb" }).find((l) => l.agency === "NPARKS")!.fee).toBe(
      2675
    );
    expect(computeFeeBreakdown({ ...base, nparksCategory: "tca-other" }).find((l) => l.agency === "NPARKS")!.fee).toBe(
      2140
    );
  });

  it("passes manual URA PP/WP extension fees straight through into the total", () => {
    const inputs = defaultFeeCalculatorInputs();
    inputs.units = 0;
    inputs.uraPpExtensionFee = 500;
    inputs.uraWpExtensionFee = 1500;
    const lines = computeFeeBreakdown(inputs);
    expect(lines.find((l) => l.description.startsWith("PP extension"))!.fee).toBe(500);
    expect(lines.find((l) => l.description.startsWith("WP extension"))!.fee).toBe(1500);
  });

  it("multiplies per-storey and per-submission fees by their counts", () => {
    const inputs = defaultFeeCalculatorInputs();
    inputs.units = 0;
    inputs.bcaBpAmendmentStoreys = 3;
    inputs.scdfFswAmendmentStoreys = 2;
    inputs.ltaSubmissionsFrom4th = 2;
    const lines = computeFeeBreakdown(inputs);
    expect(lines.find((l) => l.description === "Building Plan amendment")!.fee).toBe(600); // 200*3
    expect(lines.find((l) => l.description === "Amendment to approved fire safety works")!.fee).toBe(180); // 90*2
    expect(lines.find((l) => l.description === "Development Control submission")!.fee).toBe(600); // 300*2
  });
});
