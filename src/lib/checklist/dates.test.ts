import { describe, expect, it } from "vitest";
import {
  adjustedCompletionDate,
  eotTotalDays,
  formatDateDMY,
  loaSuggestedStart,
  ppWpExpiryInfo,
  tpcSuggestedDate,
} from "./dates";
import type { ProjectDates } from "@/lib/supabase/database.types";

describe("formatDateDMY", () => {
  it("reformats an ISO date to 'DD MM YYYY'", () => {
    expect(formatDateDMY("2024-06-05")).toBe("05 06 2024");
  });

  it("returns an empty string for null/undefined/blank", () => {
    expect(formatDateDMY(null)).toBe("");
    expect(formatDateDMY(undefined)).toBe("");
    expect(formatDateDMY("")).toBe("");
  });

  it("returns the input unchanged if it doesn't look like an ISO date", () => {
    expect(formatDateDMY("not-a-date")).toBe("not-a-date");
  });
});

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

describe("ppWpExpiryInfo", () => {
  it("returns null when there are no entries", () => {
    expect(ppWpExpiryInfo([])).toBeNull();
  });

  it("returns null when no entry has a date", () => {
    expect(ppWpExpiryInfo([{ type: "PP Cleared / Granted", date: null }])).toBeNull();
  });

  it("returns null when entries exist but none read as an actual grant", () => {
    // "Submitted" and "Rejected" aren't grants — validity only starts once something is
    // actually cleared/granted/issued.
    const entries = [
      { type: "PP Submitted", date: "2024-01-01" },
      { type: "Rejected", date: "2024-02-01" },
      { type: "Written Direction (WD1)", date: "2024-03-01" },
    ];
    expect(ppWpExpiryInfo(entries)).toBeNull();
  });

  it("computes a 6-month PP expiry from a PP grant, ignoring undated/non-grant rows", () => {
    const entries = [
      { type: "PP Submitted", date: "2023-01-01" },
      { type: "PP Cleared / Granted", date: "2024-06-15" },
      { type: "Placeholder", date: null },
    ];
    const info = ppWpExpiryInfo(entries)!;
    expect(info.kind).toBe("pp");
    expect(info.basisDate).toBe("2024-06-15");
    expect(info.date).toBe("2024-12-15");
    expect(info.extensionDeadline).toBe("2024-10-15"); // 2 months before expiry
  });

  it("computes a 2-year WP expiry from a WP grant", () => {
    const info = ppWpExpiryInfo([{ type: "WP Granted", date: "2024-06-15" }])!;
    expect(info.kind).toBe("wp");
    expect(info.date).toBe("2026-06-15");
    expect(info.extensionDeadline).toBe("2026-04-15");
  });

  it("prefers WP over PP once WP is granted, even if the PP grant date is later", () => {
    const entries = [
      { type: "WP Granted", date: "2023-01-01" },
      { type: "PP Cleared / Granted", date: "2024-06-15" }, // later date, but superseded
    ];
    const info = ppWpExpiryInfo(entries)!;
    expect(info.kind).toBe("wp");
    expect(info.basisDate).toBe("2023-01-01");
  });

  it("uses the latest grant when there are several of the same kind", () => {
    const entries = [
      { type: "PP Cleared / Granted", date: "2023-01-01" },
      { type: "PP Cleared / Granted", date: "2024-06-15" },
    ];
    const info = ppWpExpiryInfo(entries)!;
    expect(info.basisDate).toBe("2024-06-15");
  });

  it("flags a far-future expiry as ok", () => {
    const farFuture = new Date();
    farFuture.setUTCFullYear(farFuture.getUTCFullYear() + 5);
    const info = ppWpExpiryInfo([{ type: "WP Granted", date: farFuture.toISOString().slice(0, 10) }]);
    expect(info?.status).toBe("ok");
  });

  it("flags a past expiry as urgent (and reports negative days remaining)", () => {
    const info = ppWpExpiryInfo([{ type: "PP Cleared / Granted", date: "2000-01-01" }]);
    expect(info?.status).toBe("urgent");
    expect(info?.daysRemaining).toBeLessThan(0);
  });

  // Anchored to "now" (via months-ago offsets) rather than fixed dates, so these don't
  // silently start failing as the test suite ages — same approach as the far-future/past
  // cases above, just landing inside each of the three traffic-light zones instead of at
  // the extremes.
  function monthsAgoIso(months: number): string {
    const d = new Date();
    d.setUTCDate(1); // avoid day-of-month/short-month edge cases — only the zone matters here
    d.setUTCMonth(d.getUTCMonth() - months);
    return d.toISOString().slice(0, 10);
  }

  describe("PP traffic-light zones (green >4mo remaining, yellow 2-4mo, red <=2mo)", () => {
    it("is ok just after grant (6mo remaining)", () => {
      const info = ppWpExpiryInfo([{ type: "PP Cleared / Granted", date: monthsAgoIso(0) }]);
      expect(info?.status).toBe("ok");
    });

    it("is soon partway through (~3mo remaining)", () => {
      const info = ppWpExpiryInfo([{ type: "PP Cleared / Granted", date: monthsAgoIso(3) }]);
      expect(info?.status).toBe("soon");
    });

    it("is urgent in the final stretch, even before actually expiring (~1mo remaining)", () => {
      const info = ppWpExpiryInfo([{ type: "PP Cleared / Granted", date: monthsAgoIso(5) }]);
      expect(info?.status).toBe("urgent");
      expect(info?.daysRemaining).toBeGreaterThan(0);
    });
  });

  describe("WP traffic-light zones (green >18mo remaining, yellow 3-18mo, red <=3mo)", () => {
    it("is ok just after grant (24mo remaining)", () => {
      const info = ppWpExpiryInfo([{ type: "WP Granted", date: monthsAgoIso(0) }]);
      expect(info?.status).toBe("ok");
    });

    it("is soon partway through (~14mo remaining)", () => {
      const info = ppWpExpiryInfo([{ type: "WP Granted", date: monthsAgoIso(10) }]);
      expect(info?.status).toBe("soon");
    });

    it("is urgent in the final stretch, even before actually expiring (~2mo remaining)", () => {
      const info = ppWpExpiryInfo([{ type: "WP Granted", date: monthsAgoIso(22) }]);
      expect(info?.status).toBe("urgent");
      expect(info?.daysRemaining).toBeGreaterThan(0);
    });
  });
});
