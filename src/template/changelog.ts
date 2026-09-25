// Template revision stamp — this file's job is to make it obvious at a glance which
// version of the shared checklist (src/template/*) the running app was last built from,
// and what changed. Ported from the prototype's TEMPLATE_VERSION/TEMPLATE_CHANGELOG
// convention — there it mattered because template changes had to be manually copied into
// every project file; here every project always runs the currently-deployed template, so
// this is now purely a changelog for the office to see what changed and when, not a
// migration concern.
//
// Numbering: "R<n>" for a larger revision (new step/stage, restructuring, a new feature) —
// bump n and drop any letter suffix. "R<n><letter>" for a smaller revision within that
// cycle (a wording tweak, a logo swap, a bug fix) — keep n, advance the letter.
// Never renumber a revision once published.
export const TEMPLATE_VERSION = "R11a";

export interface ChangelogEntry {
  rev: string;
  date: string;
  summary: string;
}

// One entry per published revision, newest first. Prepend a new entry (never edit an old
// one) each time TEMPLATE_VERSION is bumped. History up to R11 carried forward verbatim
// from the HTML prototype (submissions-register-MASTER.html); entries from here on
// describe changes made in this app.
export const TEMPLATE_CHANGELOG: ChangelogEntry[] = [
  {
    rev: "R11a",
    date: "2026-09-25",
    summary:
      'NEA Joint referral / environmental clearance (ENV) no longer has a "Grease trap maintenance declaration, coordinated with PUB" item. Grease trap design is approved by PUB under the Sewerage & Sanitary plan submission, which keeps its own grease trap item, and ongoing maintenance is checked by NEA when it licenses the food shop, not at the building-plan stage. Existing projects keep the status, assignees and files of the remaining ENV items (migration 0006).',
  },
  {
    rev: "R11",
    date: "2026-09-21",
    summary:
      'URA Planning Permission (PP) item 13b no longer asks to check the current BOA/PEB practising certificate — per Max, that check isn\'t needed. The item is now just "QP declaration form".',
  },
  {
    rev: "R10",
    date: "2026-09-21",
    summary:
      'Three checklist content fixes per Max\'s review: URA Planning Permission (PP) no longer has a separate "Prepare submission drawings & supporting documents" item — removed as not needed; NParks Greenery/landscape submission (GREEN) no longer has an "RI review of submission drawings prior to lodgement" item — RI review only applies to the SCDF Fire Safety (FS) submission, not NParks; and the standalone BCA "Appointment & Authorisation of QP / Accredited Checker / Builder (Form BCA LU-NAPPQP01)" step (added in R7) has been folded back into the BCA Building Plan (BP) submission.',
  },
  {
    rev: "R9",
    date: "2026-09-21",
    summary:
      "Fixed the recurring lag/revert bug reported during fast editing: every self-publish reloaded every open view of the page, and the page always hardcoded that reload back to the Overview tab. The current tab is now remembered and restored across a reload instead of being reset. (Not applicable to this app — replaced by real Supabase persistence with no forced page reload at all.)",
  },
  {
    rev: "R8",
    date: "2026-09-21",
    summary:
      'Toolbar reorganised: Overview/Checklist/Timeline on the left with Expand all/Collapse all on the right; Roles moved to its own row. New "⏭ Next to-do" button jumps to the first not-started item in on-screen order.',
  },
  {
    rev: "R7",
    date: "2026-09-21",
    summary:
      "New BCA step for QP/Accredited Checker/Builder appointment (later folded back into BP in R10). Submission-log entries no longer require a date to be added — can be logged as a placeholder reminder before a date is known.",
  },
  {
    rev: "R6",
    date: "2026-09-21",
    summary:
      'Target practical completion now offers a computed suggestion (contract start + contract period) with a one-click "Use this date". Entries within a submission log can be reordered with their own ▲/▼ instead of always auto-sorting by date.',
  },
  {
    rev: "R5",
    date: "2026-09-18",
    summary:
      "Fixed a save race where an overlapping save could silently overwrite newer edits with older ones. The lock now also covers project-identity fields, not just role assignments and step order. Auto-locks after 30 seconds of no activity.",
  },
  {
    rev: "R4",
    date: "2026-09-18",
    summary:
      'Overview now opens first (Overview, Checklist, Timeline). Contract Period is a whole number of months. Consultants gain a note field. Assignee roles can no longer be removed, only reordered/renamed, to avoid silently dropping assignments made under that role.',
  },
  {
    rev: "R3",
    date: "2026-09-18",
    summary:
      "Roles and Consultants can be reordered. New project-identity fields (address, reference, initialism, title, BCA reference, contract period/sum, current stage) and Extensions of Time tracking. Master-level template-document attachment on any checklist item.",
  },
  {
    rev: "R2",
    date: "2026-09-18",
    summary:
      "A visible Saved/Saving status pill that retries a failed auto-save instead of silently dropping the edit. Project Dates gains Contract Signed, LOA Signed, an LOA-based suggested start date, and an AI-reference field.",
  },
  {
    rev: "R1",
    date: "2026-09-18",
    summary:
      "Revision numbering starts here. Official agency logos, the master/project-copy template architecture, and the Consultant Appointments step.",
  },
];
