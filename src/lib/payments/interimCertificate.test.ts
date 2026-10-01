import { describe, expect, it } from "vitest";
import { certifiedProgress, formatMoney, formatPercent, parseMoney } from "./interimCertificate";

describe("parseMoney", () => {
  it("reads plain and formatted amounts", () => {
    expect(parseMoney("10000000")).toBe(10_000_000);
    expect(parseMoney("S$10,000,000.00")).toBe(10_000_000);
    expect(parseMoney("$ 9,250,000.50")).toBe(9_250_000.5);
    expect(parseMoney("SGD 1,000")).toBe(1_000);
  });

  it("reads k / m shorthand", () => {
    expect(parseMoney("9m")).toBe(9_000_000);
    expect(parseMoney("9.5 mil")).toBe(9_500_000);
    expect(parseMoney("12 million")).toBe(12_000_000);
    expect(parseMoney("850k")).toBe(850_000);
  });

  it("returns null for blank or non-numeric text", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney(undefined)).toBeNull();
    expect(parseMoney("S$")).toBeNull();
    expect(parseMoney("TBC")).toBeNull();
  });
});

describe("certifiedProgress", () => {
  it("is the value of works as a share of the contract sum", () => {
    expect(certifiedProgress("9m", "S$10,000,000.00")).toEqual({
      valueOfWorks: 9_000_000,
      contractSum: 10_000_000,
      percent: 90,
      overContract: false,
    });
  });

  it("goes past 100% when variations push the cost over the contract sum", () => {
    const progress = certifiedProgress("12,000,000", "10m");
    expect(progress?.percent).toBe(120);
    expect(progress?.overContract).toBe(true);
  });

  it("exactly 100% is not over the contract", () => {
    expect(certifiedProgress("10m", "10m")?.overContract).toBe(false);
  });

  it("is null until both amounts are set and the contract sum is above zero", () => {
    expect(certifiedProgress("", "10m")).toBeNull();
    expect(certifiedProgress("9m", "")).toBeNull();
    expect(certifiedProgress("9m", "0")).toBeNull();
  });
});

describe("formatting", () => {
  it("formats money as S$ with two decimals", () => {
    expect(formatMoney(9_000_000)).toBe("S$9,000,000.00");
  });

  it("formats percentages to one decimal, dropping .0", () => {
    expect(formatPercent(90)).toBe("90%");
    expect(formatPercent(87.456)).toBe("87.5%");
    expect(formatPercent(120)).toBe("120%");
  });
});
