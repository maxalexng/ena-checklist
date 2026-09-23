import { describe, expect, it } from "vitest";
import { STAGES } from "@/template";
import {
  TL_MIN_TRACK_WIDTH,
  TL_PX_PER_WEEK,
  aggregateStatus,
  projectSpan,
  pxForDate,
  stageBands,
} from "./timeline";

const STAGE_WEEKS = { "pre-design": 5, concept: 10, dev: 10, detailed: 14, tender: 8, construction: 108, top: 12, csc: 10 };

describe("projectSpan", () => {
  it("returns null when there's no contract start date", () => {
    expect(projectSpan("", STAGE_WEEKS)).toBeNull();
  });

  it("returns null when total stage weeks is zero", () => {
    expect(projectSpan("2024-08-06", {})).toBeNull();
  });

  it("sums stage durations across all 8 stages", () => {
    const span = projectSpan("2024-08-06", STAGE_WEEKS)!;
    expect(span.totalWeeks).toBe(177);
  });

  it("widens the track to the minimum width for a short project", () => {
    const span = projectSpan("2024-08-06", { "pre-design": 1 })!;
    expect(span.trackWidthPx).toBe(TL_MIN_TRACK_WIDTH);
  });

  it("uses totalWeeks * px-per-week once that exceeds the minimum", () => {
    const span = projectSpan("2024-08-06", STAGE_WEEKS)!;
    expect(span.trackWidthPx).toBe(177 * TL_PX_PER_WEEK);
  });
});

describe("pxForDate", () => {
  const span = projectSpan("2024-08-06", STAGE_WEEKS)!;

  it("positions the start date itself at 0", () => {
    expect(pxForDate("2024-08-06", span)).toBe(0);
  });

  it("positions exactly one week later at one week's worth of pixels", () => {
    expect(pxForDate("2024-08-13", span)).toBe(TL_PX_PER_WEEK);
  });

  it("returns null for a missing date", () => {
    expect(pxForDate(null, span)).toBeNull();
    expect(pxForDate(undefined, span)).toBeNull();
  });

  it("returns a negative offset for a date before the project start", () => {
    expect(pxForDate("2024-07-30", span)).toBeLessThan(0);
  });
});

describe("stageBands", () => {
  it("lays bands out left-to-right in stage order with no gaps", () => {
    const span = projectSpan("2024-08-06", STAGE_WEEKS)!;
    const bands = stageBands(span, STAGE_WEEKS);
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i].leftPx).toBe(bands[i - 1].leftPx + bands[i - 1].widthPx);
    }
  });

  it("marks only the first and last band as such", () => {
    const span = projectSpan("2024-08-06", STAGE_WEEKS)!;
    const bands = stageBands(span, STAGE_WEEKS);
    expect(bands[0].first).toBe(true);
    expect(bands[bands.length - 1].last).toBe(true);
    bands.slice(1, -1).forEach((b) => {
      expect(b.first).toBe(false);
      expect(b.last).toBe(false);
    });
  });

  it("omits stages with zero duration", () => {
    const span = projectSpan("2024-08-06", { ...STAGE_WEEKS, csc: 0 })!;
    const bands = stageBands(span, { ...STAGE_WEEKS, csc: 0 });
    expect(bands.find((b) => b.stage.id === "csc")).toBeUndefined();
    expect(bands.length).toBeLessThan(STAGES.length);
  });
});

describe("aggregateStatus", () => {
  it("returns 'pending' when there are no applicable items", () => {
    expect(aggregateStatus([])).toBe("pending");
    expect(aggregateStatus([{ status: "pending", na: true }])).toBe("pending");
  });

  it("returns 'cleared' only when every applicable item is cleared", () => {
    expect(
      aggregateStatus([
        { status: "cleared", na: false },
        { status: "cleared", na: false },
      ])
    ).toBe("cleared");
  });

  it("ignores N/A items when deciding whether everything is cleared", () => {
    expect(
      aggregateStatus([
        { status: "cleared", na: false },
        { status: "pending", na: true },
      ])
    ).toBe("cleared");
  });

  it("returns 'progress' when at least one applicable item has moved but not all are cleared", () => {
    expect(
      aggregateStatus([
        { status: "progress", na: false },
        { status: "pending", na: false },
      ])
    ).toBe("progress");
  });

  it("returns 'pending' when every applicable item is still pending", () => {
    expect(
      aggregateStatus([
        { status: "pending", na: false },
        { status: "pending", na: false },
      ])
    ).toBe("pending");
  });
});
