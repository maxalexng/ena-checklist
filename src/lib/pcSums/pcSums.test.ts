import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_PC_SUMS, DEFAULT_PC_SUM_ITEMS, PC_SUM_PHASES, type PcSumPhase } from "@/template/pcSums";
import {
  formatAmountInput,
  formatSgd,
  formatVariance,
  groupPcSumsByPhase,
  parseSgdInput,
  pcSumAwardLine,
  pcSumSummaryLine,
  pcSumSwapTarget,
  pcSumVariance,
  summarizePcSums,
  type PcSumLike,
} from "./pcSums";

function row(p: Partial<PcSumLike> = {}): PcSumLike {
  return { selection: "tbc", amount: null, clientConfirmed: false, na: false, awardedAmount: null, ...p };
}

const EMPTY_AWARDS = { awarded: 0, awardedTotal: 0, variance: 0 };

describe("summarizePcSums", () => {
  it("counts only rows still in the project", () => {
    const s = summarizePcSums([
      row({ selection: "client", amount: 12000, clientConfirmed: true }),
      row({ selection: "recommended", amount: 8000.5 }),
      row(),
      row({ na: true, selection: "client", amount: 99999, clientConfirmed: true }),
    ]);
    expect(s).toEqual({
      applicable: 3,
      decided: 2,
      confirmed: 1,
      inContract: 0,
      allowanceItems: 3,
      total: 20000.5,
      unpriced: 1,
      ...EMPTY_AWARDS,
    });
  });

  it("counts a row specified in the contract as decided but leaves it out of the allowances", () => {
    const s = summarizePcSums([
      row({ selection: "contract", amount: 5000, clientConfirmed: true, awardedAmount: 4000 }),
      row({ selection: "contract" }),
      row({ selection: "client", amount: 1000 }),
    ]);
    expect(s).toEqual({
      applicable: 3,
      decided: 3,
      confirmed: 1,
      inContract: 2,
      allowanceItems: 1,
      total: 1000,
      unpriced: 0,
      ...EMPTY_AWARDS,
    });
  });

  it("totals the awarded rows and their variance against those rows' allowances only", () => {
    const s = summarizePcSums([
      row({ selection: "client", amount: 10000, awardedAmount: 11200 }),
      row({ selection: "recommended", amount: 8000, awardedAmount: 7000.5 }),
      row({ selection: "recommended", amount: 50000 }),
      row({ na: true, amount: 1000, awardedAmount: 9000 }),
    ]);
    expect(s.awarded).toBe(2);
    expect(s.awardedTotal).toBe(18200.5);
    expect(s.variance).toBe(200.5);
    expect(s.total).toBe(68000);
  });

  it("is all zeros for an empty schedule", () => {
    expect(summarizePcSums([])).toEqual({
      applicable: 0,
      decided: 0,
      confirmed: 0,
      inContract: 0,
      allowanceItems: 0,
      total: 0,
      unpriced: 0,
      ...EMPTY_AWARDS,
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

describe("pcSumVariance", () => {
  it("is awarded minus allowance, null until awarded, with a missing allowance as zero", () => {
    expect(pcSumVariance({ amount: 10000, awardedAmount: 9200 })).toBe(-800);
    expect(pcSumVariance({ amount: 10000, awardedAmount: null })).toBeNull();
    expect(pcSumVariance({ amount: null, awardedAmount: 500 })).toBe(500);
    expect(pcSumVariance({ amount: 0.1, awardedAmount: 0.3 })).toBe(0.2);
  });
});

describe("formatVariance", () => {
  it("signs over and under", () => {
    expect(formatVariance(1200)).toBe("+S$1,200");
    expect(formatVariance(-800.5)).toBe("−S$800.50");
    expect(formatVariance(0)).toBe("S$0");
  });
});

describe("pcSumAwardLine", () => {
  it("says nothing is awarded, then where the awards leave the budget", () => {
    expect(pcSumAwardLine(summarizePcSums([row({ amount: 1000 })]))).toBe("Nothing awarded yet");
    expect(
      pcSumAwardLine(
        summarizePcSums([row({ amount: 10000, awardedAmount: 9000 }), row({ amount: 5000 })])
      )
    ).toBe("Awarded S$9,000 on 1 of 2 items · S$1,000 under the allowances");
    expect(pcSumAwardLine(summarizePcSums([row({ amount: 10000, awardedAmount: 10500 })]))).toBe(
      "Awarded S$10,500 on 1 of 1 items · S$500 over the allowances"
    );
    expect(pcSumAwardLine(summarizePcSums([row({ amount: 10000, awardedAmount: 10000 })]))).toBe(
      "Awarded S$10,000 on 1 of 1 items · On budget"
    );
  });
});

describe("groupPcSumsByPhase", () => {
  const r = (id: string, phase: PcSumPhase | null) => ({ id, phase });

  it("lists every phase in site order, keeping row order within each", () => {
    const groups = groupPcSumsByPhase([r("a", "finishes"), r("b", "structure"), r("c", "finishes")]);
    expect(groups.map((g) => g.phase?.id)).toEqual(PC_SUM_PHASES.map((p) => p.id));
    expect(groups[0].rows.map((x) => x.id)).toEqual(["b"]);
    expect(groups.find((g) => g.phase?.id === "finishes")!.rows.map((x) => x.id)).toEqual(["a", "c"]);
    expect(groups.find((g) => g.phase?.id === "envelope")!.rows).toEqual([]);
  });

  it("puts unsorted rows first, only when there are any", () => {
    const groups = groupPcSumsByPhase([r("a", "fitout"), r("b", null)]);
    expect(groups[0].phase).toBeNull();
    expect(groups[0].rows.map((x) => x.id)).toEqual(["b"]);
    expect(groups).toHaveLength(PC_SUM_PHASES.length + 1);
  });
});

describe("pcSumSwapTarget", () => {
  const rows = [
    { id: "a", phase: "structure" as const },
    { id: "b", phase: "firstFix" as const },
    { id: "c", phase: "structure" as const },
  ];

  it("swaps with the neighbour in the same phase, skipping other phases' rows", () => {
    expect(pcSumSwapTarget(rows, "a", 1)?.id).toBe("c");
    expect(pcSumSwapTarget(rows, "c", -1)?.id).toBe("a");
  });

  it("stops at either end of the phase", () => {
    expect(pcSumSwapTarget(rows, "a", -1)).toBeNull();
    expect(pcSumSwapTarget(rows, "c", 1)).toBeNull();
    expect(pcSumSwapTarget(rows, "b", 1)).toBeNull();
    expect(pcSumSwapTarget(rows, "missing", 1)).toBeNull();
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

describe("DEFAULT_PC_SUMS", () => {
  it("is listed in phase order", () => {
    const order = DEFAULT_PC_SUMS.map((d) => PC_SUM_PHASES.findIndex((p) => p.id === d.phase));
    expect(order.every((o) => o >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("matches the titles and phases migration 0011 sorts existing rows by", () => {
    const sql = readFileSync(
      join(__dirname, "../../../supabase/migrations/0011_pc_sum_phases_quotes_awards.sql"),
      "utf8"
    );
    for (const d of DEFAULT_PC_SUMS) {
      expect(sql).toContain(`('${d.item.replace(/'/g, "''")}', '${d.phase}')`);
    }
  });
});
