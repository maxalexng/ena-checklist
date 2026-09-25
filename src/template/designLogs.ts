// Dated design logs: a fixed first row, any number of numbered rounds, then a fixed last
// row. A step opts in with `designLog: <id>` on its submission (see agencies.ts); the rows
// are stored as milestones under that step's key (see lib/checklist/designReviews.ts).

export type DesignLogId = "concept" | "dev" | "tender" | "tenderCall";

export interface DesignLogConfig {
  /** Stored milestone `type` values. Existing rows are matched on these, so never change
   * one once it has shipped; relabel through the labels below instead. */
  types: { initial: string; round: string; confirm: string };
  initialLabel: string;
  /** Rounds are labelled "First <roundNoun>", "Second <roundNoun>", and so on. */
  roundNoun: string;
  /** Summary-line plural, when adding an "s" to roundNoun is wrong (Addendum → addenda). */
  roundNounPlural?: string;
  confirmLabel: string;
  /** Finishes the summary line, e.g. "9 wks from initial design to confirmation". */
  spanPhrase: string;
}

export const DESIGN_LOGS: Record<DesignLogId, DesignLogConfig> = {
  concept: {
    types: { initial: "Initial Concept Design", round: "Presentation", confirm: "Revise and Confirm Design" },
    initialLabel: "Produce Initial Concept Design",
    roundNoun: "Presentation",
    confirmLabel: "Revise and Confirm Design",
    spanPhrase: "from initial design to confirmation",
  },
  dev: {
    types: { initial: "DD Set Issued to Client", round: "Review Meeting", confirm: "Design Frozen / Signed Off" },
    initialLabel: "DD Set Issued to Client",
    roundNoun: "Review Meeting",
    confirmLabel: "Design Frozen / Signed Off",
    spanPhrase: "from DD set issued to design freeze",
  },
  tender: {
    types: {
      initial: "Tender Set Issued for Coordination",
      round: "Coordination Round",
      confirm: "Tender Set Issued",
    },
    initialLabel: "Tender Set Issued for Coordination",
    roundNoun: "Coordination Round",
    confirmLabel: "Tender Set Issued",
    spanPhrase: "from first issue to tender set issued",
  },
  tenderCall: {
    types: { initial: "Tender Called", round: "Tender Addendum", confirm: "Tender Recommendation Approved" },
    initialLabel: "Tender Called",
    roundNoun: "Tender Addendum",
    roundNounPlural: "tender addenda",
    confirmLabel: "Tender Recommendation Approved",
    spanPhrase: "from tender called to recommendation approved",
  },
};
