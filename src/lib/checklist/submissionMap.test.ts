import { describe, expect, it } from "vitest";
import { STEP_BY_ID, SUBMISSION_MAP } from "@/template";
import type { ItemStatus } from "@/template";
import { autoNodeStatus, submissionMapState, submissionMapSummary, type MapInputs } from "./submissionMap";

/** Every template item on the map, pending and applicable, as a new project starts. */
function freshInputs(): MapInputs {
  const itemsByKey: MapInputs["itemsByKey"] = {};
  Object.values(STEP_BY_ID).forEach((step) =>
    step.items.forEach((it) => (itemsByKey[it.id] = { status: "pending", na: false }))
  );
  return { itemsByKey, milestonesByStep: {}, timelinePlanByStep: {}, overrides: {} };
}

function setStep(inputs: MapInputs, stepKey: string, status: ItemStatus, opts: { na?: boolean; only?: number[] } = {}) {
  STEP_BY_ID[stepKey].items.forEach((it, i) => {
    if (opts.only && !opts.only.includes(i)) return;
    inputs.itemsByKey[it.id] = { status, na: !!opts.na };
  });
}

function node(inputs: MapInputs, id: string, today = "2026-10-01") {
  const found = submissionMapState(inputs, today)
    .flatMap((r) => r.nodes)
    .find((n) => n.def.id === id);
  if (!found) throw new Error(`no node ${id}`);
  return found;
}

function def(id: string) {
  return SUBMISSION_MAP.flatMap((r) => r.nodes).find((n) => n.id === id)!;
}

describe("submission map template", () => {
  it("links only to steps and items that exist", () => {
    SUBMISSION_MAP.forEach((row) =>
      row.nodes.forEach((n) =>
        n.links.forEach((link) => {
          const step = STEP_BY_ID[link.step];
          expect(step, `${n.id} → ${link.step}`).toBeDefined();
          link.items?.forEach((i) => expect(step.items[i], `${n.id} → ${link.step} item ${i}`).toBeDefined());
        })
      )
    );
  });

  it("has unique node ids, since they're stored per project", () => {
    const ids = SUBMISSION_MAP.flatMap((r) => r.nodes.map((n) => n.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers the CORENET agencies plus TFCC", () => {
    expect(SUBMISSION_MAP.map((r) => r.agencyId)).toEqual([
      "ura",
      "bca",
      "nea",
      "lta",
      "pub",
      "nparks",
      "scdf",
      "sla",
      "tfcc",
    ]);
  });
});

describe("autoNodeStatus", () => {
  it("is pending for a new project and null for a hand-tracked node", () => {
    const inputs = freshInputs();
    expect(autoNodeStatus(def("bca-bp"), inputs)).toBe("pending");
    expect(autoNodeStatus(def("nea-top"), inputs)).toBeNull();
  });

  it("is in progress once any item moves, and done once every applicable item is cleared", () => {
    const inputs = freshInputs();
    setStep(inputs, "bca__BP", "submitted", { only: [0] });
    expect(autoNodeStatus(def("bca-bp"), inputs)).toBe("progress");
    setStep(inputs, "bca__BP", "cleared");
    setStep(inputs, "bca__BP", "pending", { na: true, only: [3] });
    expect(autoNodeStatus(def("bca-bp"), inputs)).toBe("done");
  });

  it("is N/A when every item is N/A", () => {
    const inputs = freshInputs();
    setStep(inputs, "ura__OP", "pending", { na: true });
    expect(autoNodeStatus(def("ura-opp"), inputs)).toBe("na");
  });

  it("combines several linked steps", () => {
    const inputs = freshInputs();
    setStep(inputs, "pub__SW", "cleared");
    expect(autoNodeStatus(def("pub-dc"), inputs)).toBe("progress");
    setStep(inputs, "pub__SS", "cleared");
    expect(autoNodeStatus(def("pub-dc"), inputs)).toBe("done");
  });

  it("reads only its own items when a step is split across nodes", () => {
    const inputs = freshInputs();
    setStep(inputs, "sla__SURVEY", "cleared", { only: [0, 1, 2, 3] });
    expect(autoNodeStatus(def("sla-survey"), inputs)).toBe("done");
    expect(autoNodeStatus(def("sla-csc"), inputs)).toBe("pending");
  });

  it("counts a logged submission round as under way", () => {
    const inputs = freshInputs();
    inputs.milestonesByStep["nparks__TREE"] = [{ type: "Submitted" }];
    expect(autoNodeStatus(def("nparks-dc"), inputs)).toBe("progress");
  });

  it("splits URA's one PP step into PP and WP from the submission log", () => {
    const inputs = freshInputs();
    inputs.milestonesByStep["ura__PP"] = [{ type: "Submitted" }];
    expect(autoNodeStatus(def("ura-pp"), inputs)).toBe("progress");
    expect(autoNodeStatus(def("ura-wp"), inputs)).toBe("pending");

    inputs.milestonesByStep["ura__PP"].push({ type: "Written Direction" });
    expect(autoNodeStatus(def("ura-wp"), inputs)).toBe("pending");

    inputs.milestonesByStep["ura__PP"].push({ type: "PP Cleared / Granted" });
    expect(autoNodeStatus(def("ura-pp"), inputs)).toBe("done");
    expect(autoNodeStatus(def("ura-wp"), inputs)).toBe("pending");

    inputs.milestonesByStep["ura__PP"].push({ type: "WP submitted" });
    expect(autoNodeStatus(def("ura-wp"), inputs)).toBe("progress");

    inputs.milestonesByStep["ura__PP"].push({ type: "Written Permission" });
    expect(autoNodeStatus(def("ura-wp"), inputs)).toBe("done");
  });

  it("treats a WP grant as PP done too", () => {
    const inputs = freshInputs();
    inputs.milestonesByStep["ura__PP"] = [{ type: "WP Granted" }];
    expect(autoNodeStatus(def("ura-pp"), inputs)).toBe("done");
    expect(autoNodeStatus(def("ura-wp"), inputs)).toBe("done");
  });

  it("marks piling done from the ST log while the rest of ST stays open", () => {
    const inputs = freshInputs();
    inputs.milestonesByStep["bca__ST"] = [{ type: "ST (piling) submitted" }];
    expect(autoNodeStatus(def("bca-st-piling"), inputs)).toBe("progress");
    inputs.milestonesByStep["bca__ST"].push({ type: "Piling approved" });
    expect(autoNodeStatus(def("bca-st-piling"), inputs)).toBe("done");
    expect(autoNodeStatus(def("bca-st"), inputs)).toBe("progress");
  });
});

describe("submissionMapState", () => {
  it("prefers a manual status over the checklist", () => {
    const inputs = freshInputs();
    inputs.overrides = { "bca-bp": { status: "done" }, "nea-top": { status: "progress" } };
    expect(node(inputs, "bca-bp")).toMatchObject({ status: "done", autoStatus: "pending", source: "manual" });
    expect(node(inputs, "nea-top")).toMatchObject({ status: "progress", autoStatus: null, source: "manual" });
  });

  it("starts hand-tracked nodes as not started", () => {
    expect(node(freshInputs(), "lta-bp")).toMatchObject({ status: "pending", source: "untracked" });
  });

  it("makes an uninvolved agency's hand-tracked stages N/A, unless set by hand", () => {
    const inputs = freshInputs();
    setStep(inputs, "lta__ACCESS", "pending", { na: true });
    setStep(inputs, "lta__TIA", "pending", { na: true });
    inputs.overrides = { "lta-csc": { status: "done" } };
    expect(node(inputs, "lta-dc").status).toBe("na");
    expect(node(inputs, "lta-bp")).toMatchObject({ status: "na", source: "inherited" });
    expect(node(inputs, "lta-csc").status).toBe("done");
  });

  it("flags a node late once its planned end date has passed", () => {
    const inputs = freshInputs();
    inputs.timelinePlanByStep["scdf__FS"] = { endDate: "2026-09-30" };
    expect(node(inputs, "scdf-bp", "2026-10-01")).toMatchObject({ due: "2026-09-30", late: true });
    expect(node(inputs, "scdf-bp", "2026-09-30").late).toBe(false);
    setStep(inputs, "scdf__FS", "cleared");
    expect(node(inputs, "scdf-bp", "2026-10-01").late).toBe(false);
  });

  it("uses the latest end date across linked steps", () => {
    const inputs = freshInputs();
    inputs.timelinePlanByStep["pub__SW"] = { endDate: "2026-03-01" };
    inputs.timelinePlanByStep["pub__SS"] = { endDate: "2026-05-01" };
    expect(node(inputs, "pub-dc").due).toBe("2026-05-01");
  });

  it("marks each agency's first not-started stage as next", () => {
    const inputs = freshInputs();
    setStep(inputs, "scdf__FS", "cleared");
    expect(node(inputs, "scdf-bp").isNext).toBe(false);
    expect(node(inputs, "scdf-top").isNext).toBe(true);
  });

  it("doesn't mark anything next in an agency with a stage under way", () => {
    const inputs = freshInputs();
    setStep(inputs, "scdf__FS", "progress", { only: [0] });
    expect(node(inputs, "scdf-bp").isNext).toBe(false);
    expect(node(inputs, "scdf-top").isNext).toBe(false);
  });

  it("skips N/A stages when finding what's next", () => {
    const inputs = freshInputs();
    setStep(inputs, "ura__OP", "pending", { na: true });
    expect(node(inputs, "ura-opp").isNext).toBe(false);
    expect(node(inputs, "ura-pp").isNext).toBe(true);
  });
});

describe("submissionMapSummary", () => {
  it("counts done against applicable stages and finds the current phase", () => {
    const inputs = freshInputs();
    setStep(inputs, "sla__SURVEY", "cleared", { only: [0, 1, 2, 3] });
    setStep(inputs, "ura__OP", "pending", { na: true });
    inputs.milestonesByStep["ura__PP"] = [{ type: "Submitted" }];
    const summary = submissionMapSummary(submissionMapState(inputs, "2026-10-01"));

    const total = SUBMISSION_MAP.flatMap((r) => r.nodes).length - 1; // OPP is N/A
    expect(summary).toMatchObject({ done: 1, total, currentPhaseId: "planning" });
    expect(summary.phases.find((p) => p.id === "site")).toMatchObject({ done: 1, total: 1 });
    expect(summary.inProgress.map((n) => n.def.id)).toEqual(["ura-pp"]);
    expect(summary.upNext.map((n) => n.def.id)).toContain("bca-st-piling");
    expect(summary.upNext.map((n) => n.def.id)).not.toContain("ura-wp");
  });

  it("lists late stages in map order", () => {
    const inputs = freshInputs();
    inputs.timelinePlanByStep["bca__TOP"] = { endDate: "2026-01-01" };
    inputs.timelinePlanByStep["nea__ENV"] = { endDate: "2026-01-01" };
    const summary = submissionMapSummary(submissionMapState(inputs, "2026-10-01"));
    expect(summary.late.map((n) => n.def.id)).toEqual(["nea-dc", "bca-top"]);
  });
});
