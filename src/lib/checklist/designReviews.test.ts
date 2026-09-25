import { describe, expect, it } from "vitest";
import {
  DESIGN_REVIEW_TYPES,
  daysBetween,
  formatDayGap,
  ordinalWord,
  presentationLabel,
  summarizeDesignReviews,
  type DesignReviewEntry,
} from "./designReviews";

let seq = 0;
function entry(type: string, date: string | null, sortOrder: number): DesignReviewEntry {
  return { id: `m${++seq}`, type, date, note: "", sortOrder };
}
const { initial, presentation, confirm } = DESIGN_REVIEW_TYPES;

describe("ordinalWord / presentationLabel", () => {
  it("spells out the first ten and uses numeric ordinals after", () => {
    expect(presentationLabel(1)).toBe("First Presentation");
    expect(presentationLabel(2)).toBe("Second Presentation");
    expect(ordinalWord(10)).toBe("Tenth");
    expect(ordinalWord(11)).toBe("11th");
    expect(ordinalWord(12)).toBe("12th");
    expect(ordinalWord(21)).toBe("21st");
    expect(ordinalWord(22)).toBe("22nd");
    expect(ordinalWord(23)).toBe("23rd");
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
    const s = summarizeDesignReviews([]);
    expect(s.rows.map((r) => r.label)).toEqual(["Produce Initial Concept Design", "Revise and Confirm Design"]);
    expect(s.rows.every((r) => r.entry === null)).toBe(true);
    expect(s.presentationCount).toBe(0);
    expect(s.totalDays).toBeNull();
    expect(s.confirmed).toBe(false);
  });

  it("numbers presentations by their order and keeps them between the fixed rows", () => {
    const s = summarizeDesignReviews([
      entry(confirm, null, 3),
      entry(presentation, null, 2),
      entry(initial, null, 0),
      entry(presentation, null, 1),
    ]);
    expect(s.rows.map((r) => r.label)).toEqual([
      "Produce Initial Concept Design",
      "First Presentation",
      "Second Presentation",
      "Revise and Confirm Design",
    ]);
    expect(s.presentationCount).toBe(2);
  });

  it("measures each gap from the nearest earlier dated row, and the total span", () => {
    const s = summarizeDesignReviews([
      entry(initial, "2026-03-02", 0),
      entry(presentation, "2026-03-16", 1),
      entry(presentation, null, 2),
      entry(presentation, "2026-04-06", 3),
      entry(confirm, "2026-04-20", 4),
    ]);
    expect(s.rows.map((r) => r.daysSincePrevious)).toEqual([null, 14, null, 21, 14]);
    expect(s.totalDays).toBe(49);
    expect(s.confirmed).toBe(true);
  });

  it("reports the span so far while the design isn't confirmed", () => {
    const s = summarizeDesignReviews([entry(initial, "2026-03-02", 0), entry(presentation, "2026-03-12", 1)]);
    expect(s.totalDays).toBe(10);
    expect(s.confirmed).toBe(false);
  });
});
