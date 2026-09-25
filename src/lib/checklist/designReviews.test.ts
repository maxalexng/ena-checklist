import { describe, expect, it } from "vitest";
import { DESIGN_LOGS } from "@/template/designLogs";
import {
  daysBetween,
  formatDayGap,
  ordinalWord,
  roundCountLabel,
  roundLabel,
  summarizeDesignReviews,
  type DesignReviewEntry,
} from "./designReviews";

let seq = 0;
function entry(type: string, date: string | null, sortOrder: number): DesignReviewEntry {
  return { id: `m${++seq}`, type, date, note: "", sortOrder };
}
const concept = DESIGN_LOGS.concept;
const { initial, round: presentation, confirm } = concept.types;

describe("ordinalWord / roundLabel / roundCountLabel", () => {
  it("spells out the first ten and uses numeric ordinals after", () => {
    expect(roundLabel(1, "Presentation")).toBe("First Presentation");
    expect(roundLabel(2, "Review Meeting")).toBe("Second Review Meeting");
    expect(ordinalWord(10)).toBe("Tenth");
    expect(ordinalWord(11)).toBe("11th");
    expect(ordinalWord(12)).toBe("12th");
    expect(ordinalWord(21)).toBe("21st");
    expect(ordinalWord(22)).toBe("22nd");
    expect(ordinalWord(23)).toBe("23rd");
  });

  it("pluralizes the count noun", () => {
    expect(roundCountLabel(0, "Presentation")).toBe("0 presentations");
    expect(roundCountLabel(1, "Coordination Round")).toBe("1 coordination round");
    expect(roundCountLabel(3, "Review Meeting")).toBe("3 review meetings");
    expect(roundCountLabel(2, "Tender Addendum", "tender addenda")).toBe("2 tender addenda");
    expect(roundCountLabel(1, "Tender Addendum", "tender addenda")).toBe("1 tender addendum");
  });
});

describe("daysBetween / formatDayGap", () => {
  it("counts calendar days across a month end", () => {
    expect(daysBetween("2026-01-28", "2026-02-04")).toBe(7);
  });

  it("formats gaps in weeks and days", () => {
    expect(formatDayGap(1)).toBe("1 day");
    expect(formatDayGap(5)).toBe("5 days");
    expect(formatDayGap(7)).toBe("1 wk");
    expect(formatDayGap(17)).toBe("2 wks 3 days");
    expect(formatDayGap(-3)).toBe("−3 days");
  });
});

describe("summarizeDesignReviews", () => {
  it("always shows the fixed first and last rows, even with no entries", () => {
    const s = summarizeDesignReviews([], concept);
    expect(s.rows.map((r) => r.label)).toEqual(["Produce Initial Concept Design", "Revise and Confirm Design"]);
    expect(s.rows.every((r) => r.entry === null)).toBe(true);
    expect(s.roundCount).toBe(0);
    expect(s.totalDays).toBeNull();
    expect(s.confirmed).toBe(false);
  });

  it("numbers rounds by their order and keeps them between the fixed rows", () => {
    const s = summarizeDesignReviews(
      [entry(confirm, null, 3), entry(presentation, null, 2), entry(initial, null, 0), entry(presentation, null, 1)],
      concept
    );
    expect(s.rows.map((r) => r.label)).toEqual([
      "Produce Initial Concept Design",
      "First Presentation",
      "Second Presentation",
      "Revise and Confirm Design",
    ]);
    expect(s.roundCount).toBe(2);
  });

  it("measures each gap from the nearest earlier dated row, and the total span", () => {
    const s = summarizeDesignReviews(
      [
        entry(initial, "2026-03-02", 0),
        entry(presentation, "2026-03-16", 1),
        entry(presentation, null, 2),
        entry(presentation, "2026-04-06", 3),
        entry(confirm, "2026-04-20", 4),
      ],
      concept
    );
    expect(s.rows.map((r) => r.daysSincePrevious)).toEqual([null, 14, null, 21, 14]);
    expect(s.totalDays).toBe(49);
    expect(s.confirmed).toBe(true);
  });

  it("reports the span so far while not confirmed", () => {
    const s = summarizeDesignReviews([entry(initial, "2026-03-02", 0), entry(presentation, "2026-03-12", 1)], concept);
    expect(s.totalDays).toBe(10);
    expect(s.confirmed).toBe(false);
  });

  it("labels each step's log from its own config and ignores another log's types", () => {
    const dev = DESIGN_LOGS.dev;
    const s = summarizeDesignReviews(
      [entry(dev.types.initial, null, 0), entry(dev.types.round, null, 1), entry(presentation, null, 2)],
      dev
    );
    expect(s.rows.map((r) => r.label)).toEqual([
      "DD Set Issued to Client",
      "First Review Meeting",
      "Design Frozen / Signed Off",
    ]);
    expect(summarizeDesignReviews([], DESIGN_LOGS.tender).rows.map((r) => r.label)).toEqual([
      "Tender Set Issued for Coordination",
      "Tender Set Issued",
    ]);
  });

  it("keeps each config's stored types distinct within the log", () => {
    for (const config of Object.values(DESIGN_LOGS)) {
      const types = Object.values(config.types);
      expect(new Set(types).size).toBe(types.length);
    }
  });
});
