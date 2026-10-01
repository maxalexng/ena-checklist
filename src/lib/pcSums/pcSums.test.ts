import { describe, expect, it } from "vitest";
import { DEFAULT_PC_SUM_ITEMS } from "@/template/pcSums";
import {
  formatAmountInput,
  formatSgd,
  parseSgdInput,
  pcSumSummaryLine,
  summarizePcSums,
  type PcSumLike,
} from "./pcSums";

function row(p: Partial<PcSumLike> = {}): PcSumLike {
  return { selection: "tbc", amount: null, clientConfirmed: false, na: false, ...p };
}

describe("summarizePcSums", () => {
  it("counts only rows still in the project", () => {
    const s = summarizePcSums([
      row({ selection: "client", amount: 12000, clientConfirmed: true }),
      row({ selection: "recommended", amount: 8000.5 }),
      row(),
      row({ na: true, selection: "client", amount: 99999, clientConfirmed: true }),
    ]);
    expect(s).toEqual({ applicable: 3, decided: 2, confirmed: 1, inContract: 0, total: 20000.5, unpriced: 1 });
  });

  it("counts a row specified in the contract as decided but leaves it out of the allowances", () => {
    const s = summarizePcSums([
      row({ selection: "contract", amount: 5000, clientConfirmed: true }),
      row({ selection: "contract" }),
      row({ selection: "client", amount: 1000 }),
    ]);
    expect(s).toEqual({ applicable: 3, decided: 3, confirmed: 1, inContract: 2, total: 1000, unpriced: 0 });
  });

  it("is all zeros for an empty schedule", () => {
    expect(summarizePcSums([])).toEqual({
      applicable: 0,
      decided: 0,
      confirmed: 0,
      inContract: 0,
      total: 0,
      unpriced: 0,
    });
  });
});

describe("pcSumSummaryLine", () => {
  it("mentions contract-specified rows and unpriced allowances only when there are any", () => {
    expect(pcSumSummaryLine(summarizePcSums([row({ selection: "client", amount: 18500 })]))).toBe(
      "1 of 1 decided · 0 confirmed by client · Total allowances S$18,500"
    );
    expect(pcSumSummaryLine(summarizePcSums([row({ selection: "contract" }), row()]))).toBe(
      "1 of 2 decided · 0 confirmed by client · 1 specified in contract · Total allowances S$0 (1 not priced yet)"
    );
  });
});

describe("formatSgd", () => {
  it("drops cents only when they're zero", () => {
    expect(formatSgd(12500)).toBe("S$12,500");
    expect(formatSgd(12500.5)).toBe("S$12,500.50");
    expect(formatSgd(0)).toBe("S$0");
  });
});

describe("formatAmountInput", () => {
  it("shows thousands separators and blanks an unset amount", () => {
    expect(formatAmountInput(18500)).toBe("18,500");
    expect(formatAmountInput(1234.5)).toBe("1,234.50");
    expect(formatAmountInput(null)).toBe("");
  });
});

describe("parseSgdInput", () => {
  it("accepts what people type, with or without S$ and commas", () => {
    expect(parseSgdInput("12,500")).toBe(12500);
    expect(parseSgdInput("S$ 8000")).toBe(8000);
    expect(parseSgdInput("$1,234.50")).toBe(1234.5);
  });

  it("treats blank as cleared and junk as invalid", () => {
    expect(parseSgdInput("  ")).toBeNull();
    expect(parseSgdInput("about 5k")).toBeUndefined();
    expect(parseSgdInput("-100")).toBeUndefined();
    expect(parseSgdInput("1.234")).toBeUndefined();
  });
});

describe("DEFAULT_PC_SUM_ITEMS", () => {
  it("has no blank or duplicate lines", () => {
    expect(DEFAULT_PC_SUM_ITEMS.every((i) => i.trim().length > 0)).toBe(true);
    expect(new Set(DEFAULT_PC_SUM_ITEMS).size).toBe(DEFAULT_PC_SUM_ITEMS.length);
  });
});
