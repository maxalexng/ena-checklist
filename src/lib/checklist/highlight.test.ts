import { describe, expect, it } from "vitest";
import { splitHighlight } from "./highlight";

describe("splitHighlight", () => {
  it("returns the whole text unhighlighted for an empty query", () => {
    expect(splitHighlight("Topographic survey", "")).toEqual([{ text: "Topographic survey", hit: false }]);
    expect(splitHighlight("Topographic survey", "   ")).toEqual([{ text: "Topographic survey", hit: false }]);
  });

  it("marks a case-insensitive match while keeping the original casing", () => {
    expect(splitHighlight("Topographic survey", "SURVEY")).toEqual([
      { text: "Topographic ", hit: false },
      { text: "survey", hit: true },
    ]);
  });

  it("marks every occurrence, including at the start", () => {
    expect(splitHighlight("CORENET via CORENET X", "corenet")).toEqual([
      { text: "CORENET", hit: true },
      { text: " via ", hit: false },
      { text: "CORENET", hit: true },
      { text: " X", hit: false },
    ]);
  });

  it("trims the query the same way the filter does", () => {
    expect(splitHighlight("Site plan", " plan ")).toEqual([
      { text: "Site ", hit: false },
      { text: "plan", hit: true },
    ]);
  });

  it("returns plain text when nothing matches", () => {
    expect(splitHighlight("Site plan", "fire")).toEqual([{ text: "Site plan", hit: false }]);
  });

  it("treats regex metacharacters literally", () => {
    expect(splitHighlight("Plan (A) / B", "(a)")).toEqual([
      { text: "Plan ", hit: false },
      { text: "(A)", hit: true },
      { text: " / B", hit: false },
    ]);
  });
});
