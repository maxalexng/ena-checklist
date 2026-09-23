import { describe, expect, it } from "vitest";
import { letterForIndex } from "./lettering";

describe("letterForIndex", () => {
  it("maps the first 26 positions to a-z", () => {
    expect(letterForIndex(0)).toBe("a");
    expect(letterForIndex(1)).toBe("b");
    expect(letterForIndex(25)).toBe("z");
  });

  it("rolls over to double letters after z", () => {
    expect(letterForIndex(26)).toBe("aa");
    expect(letterForIndex(27)).toBe("ab");
    expect(letterForIndex(51)).toBe("az");
    expect(letterForIndex(52)).toBe("ba");
  });

  it("covers the largest real step (TOPDOCS, 48 items) without collision", () => {
    const letters = Array.from({ length: 48 }, (_, i) => letterForIndex(i));
    expect(new Set(letters).size).toBe(48);
    expect(letters[47]).toBe("av");
  });
});
