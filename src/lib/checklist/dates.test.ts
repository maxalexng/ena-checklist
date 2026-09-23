import { describe, expect, it } from "vitest";
import { adjustedCompletionDate, eotTotalDays, loaSuggestedStart, ppExpiryInfo, tpcSuggestedDate } from "./dates";
import type { ProjectDates } from "@/lib/supabase/database.types";

function baseDates(overrides: Partial<ProjectDates> = {}): ProjectDates {
  return {
    contractStart: "",
    practicalCompletion: "",
    practicalCompletionNote: "",
    contractSigned: "",
    loaSigned: "",
    loaBasisType: "months",
    loaBasisMonths: "3",
    startAiRef: "",
    eot: [],
    ...overrides,
  };
}

describe("loaSuggestedStart", () => {
  it("adds the LOA basis months to the LOA signed date", () => {
    // Regression case: this exact input previously came out as 2024-07-08 (one day short)
    // because of a local-vs-UTC timezone mismatch in the date arithmetic.
    const result = loaSuggestedStart(baseDates({ loaSigned: "2024-04-09", loaBasisMonths: "3" }));
    expect(result.date).toBe("2024-07-09");
    expect(result.note).toContain("3 month");
  });

  it("returns no date when the basis type is 'approval'", () => {
    const result = loaSuggestedStart(baseDates({ loaBasisType: "approval", loaSigned: "2024-04-09" }));
    expect(result.date).toBeNull();
    expect(result.note).toContain("approval");
  });

  it("returns no date when LOA signed is blank", () => {
    expect(loaSuggestedStart(baseDates({ loaSigned: "" })).date).toBeNull();
  });

  it("returns no date when the basis months is zero or blank", () => {
    expect(loaSuggestedStart(baseDates({ loaSigned: "2024-04-09", loaBasisMonths: "0" })).date).toBeNull();
    expect(loaSuggestedStart(baseDates({ loaSigned: "2024-04-09", loaBasisMonths: "" })).date).toBeNull();
  });
});

describe("tpcSuggestedDate", () => {
  it("adds the contract period in months to the contract start date", () => {
    expect(tpcSuggestedDate("2024-08-06", 28)).toBe("2026-12-06");
  });

  it("returns null when either input is missing", () => {
    expect(tpcSuggestedDate("", 28)).toBeNull();
    expect(tpcSuggestedDate("2024-08-06", null)).toBeNull();
  });
});

describe("eotTotalDays", () => {
  it("sums the days across every EOT entry", () => {
    const dates = baseDates({
      eot: [
        { title: "EOT 1", days: 4 },
        { title: "EOT 2", days: 2 },
        { title: "EOT 3", days: 90 },
      ],
    });
    expect(eotTotalDays(dates)).toBe(96);
  });

  it("returns 0 for an empty EOT list", () => {
    expect(eotTotalDays(baseDates())).toBe(0);
  });
});

describe("adjustedCompletionDate", () => {
  it("returns practicalCompletion unchanged when there are no EOT days", () => {
    expect(adjustedCompletionDate(baseDates({ practicalCompletion: "2026-06-30" }))).toBe("2026-06-30");
  });

  it("adds the total EOT days on top of practicalCompletion", () => {
    const dates = baseDates({
      practicalCompletion: "2026-06-30",
      eot: [{ title: "EOT 1", days: 10 }],
    });
    expect(adjustedCompletionDate(dates)).toBe("2026-07-10");
  });

  it("returns null when practicalCompletion isn't set", () => {
    expect(adjustedCompletionDate(baseDates({ eot: [{ title: "x", days: 5 }] }))).toBeNull();
  });
});

describe("ppExpiryInfo", () => {
  it("returns null when validity months isn't set", () => {
    expect(ppExpiryInfo([{ type: "PP Submitted", date: "2024-01-01" }], "")).toBeNull();
  });

  it("returns null when no entry has a date", () => {
    expect(ppExpiryInfo([{ type: "PP Submitted", date: null }], "12")).toBeNull();
  });

  it("computes expiry from the latest dated entry, ignoring undated ones", () => {
    const entries = [
      { type: "PP Submitted", date: "2023-01-01" },
      { type: "PP Advice", date: "2024-06-15" },
      { type: "Placeholder", date: null },
    ];
    const info = ppExpiryInfo(entries, "12");
    expect(info?.date).toBe("2025-06-15");
  });

  it("flags a far-future expiry as ok", () => {
    const farFuture = new Date();
    farFuture.setUTCFullYear(farFuture.getUTCFullYear() + 5);
    const info = ppExpiryInfo([{ type: "x", date: farFuture.toISOString().slice(0, 10) }], "1");
    expect(info?.status).toBe("ok");
  });

  it("flags a past expiry as expired", () => {
    const info = ppExpiryInfo([{ type: "x", date: "2000-01-01" }], "1");
    expect(info?.status).toBe("expired");
    expect(info?.daysRemaining).toBeLessThan(0);
  });
});
