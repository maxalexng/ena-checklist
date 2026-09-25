import { describe, expect, it } from "vitest";
import { stageState, stepProgress } from "./railStatus";

const cleared = { na: false, status: "cleared" };
const pending = { na: false, status: "pending" };
const na = { na: true, status: "pending" };

describe("stepProgress", () => {
  it("marks a step whose items are all N/A as na", () => {
    expect(stepProgress([na, na])).toEqual({ applicable: 0, cleared: 0, pct: 0, state: "na" });
  });

  it("marks a step with every applicable item cleared as done", () => {
    expect(stepProgress([cleared, na, cleared])).toEqual({ applicable: 2, cleared: 2, pct: 100, state: "done" });
  });

  it("marks a partly cleared step as open", () => {
    expect(stepProgress([cleared, pending, undefined])).toMatchObject({ applicable: 2, cleared: 1, pct: 50, state: "open" });
  });
});

describe("stageState", () => {
  it("is complete when every step is done or N/A", () => {
    expect(stageState([stepProgress([cleared]), stepProgress([na])])).toBe("complete");
  });

  it("is open while any step is open", () => {
    expect(stageState([stepProgress([cleared]), stepProgress([pending])])).toBe("open");
  });

  it("is na, not complete, when every step is N/A", () => {
    expect(stageState([stepProgress([na]), stepProgress([na])])).toBe("na");
  });
});
