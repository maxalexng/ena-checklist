import { describe, expect, it } from "vitest";
import { STATUSES, defaultListPresets, defaultRoles, nextStatus, slugify, uniqueRoleId } from "./defaults";
import { ROLE_PALETTE } from "./keys";

describe("nextStatus", () => {
  it("cycles pending -> progress -> submitted -> cleared -> pending", () => {
    expect(nextStatus("pending")).toBe("progress");
    expect(nextStatus("progress")).toBe("submitted");
    expect(nextStatus("submitted")).toBe("cleared");
    expect(nextStatus("cleared")).toBe("pending");
  });

  it("never produces a value outside the 4-value cycle", () => {
    STATUSES.forEach((status) => {
      expect(STATUSES).toContain(nextStatus(status));
    });
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates a plain name", () => {
    expect(slugify("C&S Engineer")).toBe("c-s-engineer");
  });

  it("collapses runs of non-alphanumeric characters into one hyphen", () => {
    expect(slugify("M&E   Engineer (M&E)")).toBe("m-e-engineer-m-e");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("--Owner--")).toBe("owner");
  });

  it("falls back to 'role' for a name with no alphanumeric characters", () => {
    expect(slugify("###")).toBe("role");
    expect(slugify("")).toBe("role");
  });
});

describe("uniqueRoleId", () => {
  it("returns the plain slug when it isn't already taken", () => {
    expect(uniqueRoleId("Owner", ["architect", "plumber"])).toBe("owner");
  });

  it("appends -2, -3, ... until it finds a free id", () => {
    expect(uniqueRoleId("Owner", ["owner"])).toBe("owner-2");
    expect(uniqueRoleId("Owner", ["owner", "owner-2"])).toBe("owner-3");
  });
});

describe("defaultRoles", () => {
  it("returns 11 roles with sequential sort orders starting at 0", () => {
    const roles = defaultRoles();
    expect(roles).toHaveLength(11);
    roles.forEach((role, i) => expect(role.sortOrder).toBe(i));
  });

  it("cycles through the role palette for colors", () => {
    const roles = defaultRoles();
    roles.forEach((role, i) => {
      expect(role.color).toBe(ROLE_PALETTE[i % ROLE_PALETTE.length]);
    });
  });

  it("gives every role a non-empty name", () => {
    defaultRoles().forEach((role) => expect(role.name.length).toBeGreaterThan(0));
  });
});

describe("defaultListPresets", () => {
  it("returns a fresh, independently-mutable object on every call", () => {
    const a = defaultListPresets();
    const b = defaultListPresets();
    a.ura__PP.push("mutated");
    expect(b.ura__PP).not.toContain("mutated");
  });

  it("covers exactly the 8 curated Overview-tab log keys", () => {
    expect(Object.keys(defaultListPresets()).sort()).toEqual(
      ["bca__BP", "bca__ST", "lta__ACCESS", "nparks__TREE", "pub__SS", "pub__SW", "scdf__FS", "ura__PP"].sort()
    );
  });
});
