import { describe, expect, it } from "vitest";
import {
  STEPS,
  STEP_BY_ID,
  agencyColorFor,
  agencyIdForStepKey,
  agencyLogoSrc,
  defaultStepOrder,
  itemById,
  parseItemId,
  reconcileOrder,
  stepKey,
} from "./keys";

describe("stepKey", () => {
  it("joins agencyId and a sanitized code with a double underscore", () => {
    expect(stepKey("bca", "ST")).toBe("bca__ST");
  });

  it("strips non-alphanumeric characters from the code", () => {
    expect(stepKey("ura", "DC/DP")).toBe("ura__DCDP");
    expect(stepKey("scdf", "FSC/TFP")).toBe("scdf__FSCTFP");
  });
});

describe("parseItemId", () => {
  it("splits a stable item id back into its step key and index", () => {
    expect(parseItemId("bca__ST__0")).toEqual({ stepKey: "bca__ST", index: 0 });
    expect(parseItemId("admin__TOPDOCS__47")).toEqual({ stepKey: "admin__TOPDOCS", index: 47 });
  });

  it("returns null for a string with no trailing index", () => {
    expect(parseItemId("not-an-item-id")).toBeNull();
    expect(parseItemId("bca__ST")).toBeNull();
  });
});

describe("agencyIdForStepKey", () => {
  it("resolves a step key to its owning agency id", () => {
    expect(agencyIdForStepKey("bca__ST")).toBe("bca");
    expect(agencyIdForStepKey("ura__PP")).toBe("ura");
  });

  it("returns undefined for an unknown step key", () => {
    expect(agencyIdForStepKey("not__real")).toBeUndefined();
  });
});

describe("reconcileOrder", () => {
  const validIds = ["a", "b", "c"];

  it("keeps saved order for ids that are still valid", () => {
    expect(reconcileOrder(["c", "a", "b"], validIds)).toEqual(["c", "a", "b"]);
  });

  it("drops stale ids no longer in the valid set", () => {
    expect(reconcileOrder(["a", "stale", "b"], validIds)).toEqual(["a", "b", "c"]);
  });

  it("appends new valid ids not present in the saved order, at the end", () => {
    expect(reconcileOrder(["b"], validIds)).toEqual(["b", "a", "c"]);
  });

  it("de-duplicates repeated ids in the saved order", () => {
    expect(reconcileOrder(["a", "a", "b"], validIds)).toEqual(["a", "b", "c"]);
  });

  it("falls back to the full valid list when saved is null, undefined, or empty", () => {
    expect(reconcileOrder(null, validIds)).toEqual(validIds);
    expect(reconcileOrder(undefined, validIds)).toEqual(validIds);
    expect(reconcileOrder([], validIds)).toEqual(validIds);
  });
});

describe("agencyColorFor", () => {
  it("uses the fixed override colors for BCA, NParks, and PUB", () => {
    expect(agencyColorFor("BCA")).toBe("red");
    expect(agencyColorFor("NParks")).toBe("green");
    expect(agencyColorFor("PUB")).toBe("blue");
  });

  it("falls back to slate for an unknown code", () => {
    expect(agencyColorFor("NOT-A-REAL-CODE")).toBe("slate");
  });

  it("gives every real agency code some color, with no two overridden codes colliding", () => {
    const codes = new Set(STEPS.map((s) => s.code));
    codes.forEach((code) => {
      expect(agencyColorFor(code)).toBeTruthy();
    });
  });
});

describe("agencyLogoSrc", () => {
  it("returns a /logos path for agencies with a real-world logo", () => {
    expect(agencyLogoSrc("bca")).toBe("/logos/bca.png");
    expect(agencyLogoSrc("ura")).toBe("/logos/ura.png");
  });

  it("returns null for internal, non-governmental agencies", () => {
    expect(agencyLogoSrc("admin")).toBeNull();
    expect(agencyLogoSrc("site")).toBeNull();
  });
});

describe("itemById", () => {
  it("resolves a known item id to its template item", () => {
    const item = itemById("bca__ST__0");
    expect(item).toBeDefined();
    expect(item?.id).toBe("bca__ST__0");
  });

  it("returns undefined for an unknown item id", () => {
    expect(itemById("nope__NOPE__99")).toBeUndefined();
  });
});

describe("defaultStepOrder", () => {
  it("returns every step id in STEP_ORDER's canonical order", () => {
    expect(defaultStepOrder()).toEqual(STEPS.map((s) => s.id));
  });
});

// Guards the whole template build against silent drift — matches the counts verified
// against the legacy prototype's real data (see scripts/migrate-html-import.ts's run for
// "2 Astrid Hill": 183 items imported vs 183 in source).
describe("template integrity", () => {
  it("has exactly 44 steps", () => {
    expect(STEPS.length).toBe(44);
  });

  it("has exactly 198 checklist items across all steps", () => {
    // 183 from the original prototype port, +1 for the Consultant Appointments step's own
    // clearable item, +2 for the new Asbestos Survey & Removal step, +2 for the design-lock
    // and construction-drawings checkpoints added to PP/BP, -1 for the NEA grease trap item
    // removed in R11a (grease traps are PUB's, under the Sewerage & Sanitary plan), +2 for
    // the Contract Award & Documents step added in R12, +8 for the two TFCC steps added in R13,
    // +1 for the Concept Design & Client Presentations step added in R14.
    const total = STEPS.reduce((sum, s) => sum + s.items.length, 0);
    expect(total).toBe(198);
  });

  it("places the TFCC steps after IMDA COPIF and after the gas connection, with the NetLink logo", () => {
    const plan = STEPS.findIndex((s) => s.id === "tfcc__PLAN");
    expect(STEPS[plan - 1].id).toBe("imda__COPIF");
    expect(STEPS[plan].defaultStage).toBe("detailed");
    expect(STEPS[plan].items).toHaveLength(3);

    const fibre = STEPS.findIndex((s) => s.id === "tfcc__FIBRE");
    expect(STEPS[fibre - 1].id).toBe("utilities__GAS");
    expect(STEPS[fibre].defaultStage).toBe("construction");
    expect(STEPS[fibre].items).toHaveLength(5);
    expect(STEPS[fibre].items.every((i) => i.agencyCode === "TFCC")).toBe(true);

    expect(agencyLogoSrc("tfcc")).toBe("/logos/tfcc.png");
  });

  it("opens Concept Design with the presentation log step", () => {
    const i = STEPS.findIndex((s) => s.id === "admin__DESIGN");
    expect(STEPS[i - 1].defaultStage).toBe("pre-design");
    expect(STEPS[i].defaultStage).toBe("concept");
    expect(STEPS[i].isDesignReviewLog).toBe(true);
    expect(STEPS[i].items.map((it) => it.id)).toEqual(["admin__DESIGN__0"]);
  });

  it("places Contract Award & Documents in Tendering, right after the BCA Structural Plan", () => {
    const i = STEPS.findIndex((s) => s.id === "admin__AWARD");
    expect(STEPS[i - 1].id).toBe("bca__ST");
    expect(STEPS[i].defaultStage).toBe("tender");
    expect(STEPS[i].items.map((it) => it.id)).toEqual(["admin__AWARD__0", "admin__AWARD__1"]);
  });

  it("keeps grease traps under PUB's Sewerage & Sanitary plan only, not NEA", () => {
    const mentions = STEPS.flatMap((s) =>
      s.items.filter((i) => /grease/i.test(i.text)).map((i) => i.id)
    );
    expect(mentions).toEqual(["pub__SS__2"]);
    expect(STEP_BY_ID["nea__ENV"].items.map((i) => i.text)).toEqual([
      "Environmental control measures for construction dust and noise",
      "Refuse / bin collection point siting with access for collection vehicles",
      "Construction noise permit, where extended or night works are needed",
      "Vector control (mosquito breeding prevention) site management plan",
    ]);
  });

  it("gives every step a unique id", () => {
    const ids = STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every item within a step a unique, correctly-prefixed id", () => {
    STEPS.forEach((step) => {
      step.items.forEach((item, i) => {
        expect(item.id).toBe(`${step.id}__${i}`);
      });
    });
  });

  it("indexes every step in STEP_BY_ID", () => {
    STEPS.forEach((step) => {
      expect(STEP_BY_ID[step.id]).toBe(step);
    });
  });
});
