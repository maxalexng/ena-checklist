import { describe, expect, it } from "vitest";
import { roadName, sortProjectsByRoad } from "./sortProjects";

const p = (title: string | null, address: string | null = null) => ({ title, address });

describe("roadName", () => {
  it("strips the leading house number", () => {
    expect(roadName("2 Astrid Hill")).toBe("Astrid Hill");
    expect(roadName("12A Dyson Road")).toBe("Dyson Road");
    expect(roadName("2-4 White House Park")).toBe("White House Park");
    expect(roadName("No. 8 Jalan Kayu")).toBe("Jalan Kayu");
  });

  it("leaves names without a number alone", () => {
    expect(roadName("White House Park")).toBe("White House Park");
    expect(roadName("3rd Avenue")).toBe("3rd Avenue");
  });
});

describe("sortProjectsByRoad", () => {
  it("orders by road name, ignoring house numbers", () => {
    const sorted = sortProjectsByRoad([p("9 White House Park"), p("30 Dyson Road"), p("2 Astrid Hill")]);
    expect(sorted.map((x) => x.title)).toEqual(["2 Astrid Hill", "30 Dyson Road", "9 White House Park"]);
  });

  it("orders house numbers numerically on the same road", () => {
    const sorted = sortProjectsByRoad([p("12 Dyson Road"), p("2 Dyson Road"), p("10 Dyson Road")]);
    expect(sorted.map((x) => x.title)).toEqual(["2 Dyson Road", "10 Dyson Road", "12 Dyson Road"]);
  });

  it("sorts by address rather than the project description title", () => {
    const sorted = sortProjectsByRoad([
      p("PROPOSED ERECTION OF ... AT 4D DYSON ROAD", "4D Dyson Road, Singapore 309358"),
      p("PROPOSED NEW ERECTION OF ... AT 50 WHITE HOUSE PARK", "50 White House Park, Singapore 257621"),
      p("PROPOSED NEW ERECTION OF ... AT 2 ASTRID HILL", "2 Astrid Hill, Singapore 269925"),
    ]);
    expect(sorted.map((x) => x.address)).toEqual([
      "2 Astrid Hill, Singapore 269925",
      "4D Dyson Road, Singapore 309358",
      "50 White House Park, Singapore 257621",
    ]);
  });

  it("falls back to the title when there is no address", () => {
    const sorted = sortProjectsByRoad([p("5 Bukit Timah Road"), p(null, "1 Astrid Hill")]);
    expect(sorted.map((x) => x.address ?? x.title)).toEqual(["1 Astrid Hill", "5 Bukit Timah Road"]);
  });

  it("does not mutate the input", () => {
    const input = [p("B Road"), p("A Road")];
    sortProjectsByRoad(input);
    expect(input[0].title).toBe("B Road");
  });
});
