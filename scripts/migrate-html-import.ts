// One-off migration: imports a legacy HTML prototype's embedded state-data JSON into a
// brand-new project row in the real database. Run with:
//   npx tsx scripts/migrate-html-import.ts <path-to-html-file>
// Uses SUPABASE_SERVICE_ROLE_KEY (bypasses RLS — this script runs with no logged-in user,
// unlike the app itself) from .env.local. Never commit that key or ship it to Vercel.
//
// Creates a NEW project every run — safe to re-run without touching any existing project,
// including ones created through the app's own "New Project" flow.
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { parseItemId, agencyIdForStepKey } from "../src/template/keys";
import type { Database } from "../src/lib/supabase/database.types";
import type { ProjectDates } from "../src/lib/supabase/database.types";

// --- env -----------------------------------------------------------------------------
const envText = readFileSync(".env.local", "utf-8");
const env: Record<string, string> = {};
for (const line of envText.split("\n")) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2];
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}
const supabase = createClient<Database>(url, serviceRoleKey);

// --- legacy shape (loose — this is untyped historical data, not app state) -----------
interface LegacyEot {
  title: string;
  days: number;
}
interface LegacyProjectDates {
  contractStart: string;
  practicalCompletion: string;
  practicalCompletionNote: string;
  contractSigned: string;
  loaSigned: string;
  loaBasisType: "months" | "approval";
  loaBasisMonths: string;
  startAiRef: string;
  eot: LegacyEot[];
}
interface LegacyProjectInfo {
  address: string;
  reference: string;
  initialism: string;
  title: string;
  bcaRef: string;
  contractPeriod: string;
  contractSum: string;
  currentStage: string;
}
interface LegacyRole {
  id: string;
  name: string;
  color: string;
}
interface LegacyConsultant {
  company: string;
  roleId?: string;
  dateSigned?: string;
  note?: string;
}
interface LegacyMilestone {
  type: string;
  date?: string;
  note?: string;
}
interface LegacyFileEntry {
  name: string;
  type?: string;
  size?: number;
  dataUrl?: string;
}
interface LegacyItemFile {
  link?: string;
  file?: LegacyFileEntry;
}
interface LegacyState {
  items: Record<string, { status: string }>;
  milestones: Record<string, LegacyMilestone[]>;
  stepOrder: string[];
  overviewSectionOrder: string[];
  responsible: Record<string, { roleId: string; note?: string }[]>;
  stepStage: Record<string, string>;
  roles: LegacyRole[];
  projectDates: LegacyProjectDates;
  ppValidityMonths: string;
  projectInfo: LegacyProjectInfo;
  listPresets: Record<string, string[]>;
  itemFiles: Record<string, LegacyItemFile>;
  templateFiles: Record<string, LegacyFileEntry>;
  subchecks: Record<string, Record<string, boolean>>;
  assignmentsLocked: boolean;
  timelinePlan: Record<string, { start?: string; end?: string }>;
  stageDurationWeeks: Record<string, number>;
  consultants: LegacyConsultant[];
}

function extractState(html: string): LegacyState {
  const startMarker = '<script type="application/json" id="state-data">';
  const start = html.indexOf(startMarker);
  if (start === -1) throw new Error("No #state-data script block found in file");
  const jsonStart = start + startMarker.length;
  const end = html.indexOf("</script>", jsonStart);
  return JSON.parse(html.slice(jsonStart, end));
}

async function uploadLegacyFile(bucket: string, path: string, file: LegacyFileEntry) {
  if (!file.dataUrl) return null;
  const base64 = file.dataUrl.split(",")[1] ?? "";
  const bytes = Buffer.from(base64, "base64");
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error("Usage: npx tsx scripts/migrate-html-import.ts <path-to-html-file>");
  }
  const html = readFileSync(filePath, "utf-8");
  const legacy = extractState(html);

  console.log(`Importing "${legacy.projectInfo.reference}" — ${legacy.projectInfo.title.slice(0, 60)}...`);

  // --- 1. project row -------------------------------------------------------------
  const contractPeriodMonths = legacy.projectInfo.contractPeriod
    ? Number(legacy.projectInfo.contractPeriod)
    : null;

  const projectDates: ProjectDates = {
    contractStart: legacy.projectDates.contractStart || "",
    practicalCompletion: legacy.projectDates.practicalCompletion || "",
    practicalCompletionNote: legacy.projectDates.practicalCompletionNote || "",
    contractSigned: legacy.projectDates.contractSigned || "",
    loaSigned: legacy.projectDates.loaSigned || "",
    loaBasisType: legacy.projectDates.loaBasisType || "months",
    loaBasisMonths: legacy.projectDates.loaBasisMonths || "3",
    startAiRef: legacy.projectDates.startAiRef || "",
    eot: legacy.projectDates.eot || [],
  };

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      reference: legacy.projectInfo.reference,
      title: legacy.projectInfo.title,
      address: legacy.projectInfo.address,
      initialism: legacy.projectInfo.initialism,
      bca_ref: legacy.projectInfo.bcaRef,
      contract_period_months: contractPeriodMonths,
      contract_sum: legacy.projectInfo.contractSum,
      current_stage: legacy.projectInfo.currentStage || "pre-design",
      project_dates: projectDates,
      pp_validity_months: legacy.ppValidityMonths || "",
      list_presets: legacy.listPresets || {},
      step_order: legacy.stepOrder && legacy.stepOrder.length > 0 ? legacy.stepOrder : null,
      overview_section_order:
        legacy.overviewSectionOrder && legacy.overviewSectionOrder.length > 0 ? legacy.overviewSectionOrder : null,
      step_stage: legacy.stepStage || {},
      stage_duration_weeks: legacy.stageDurationWeeks || {},
      assignments_locked: !!legacy.assignmentsLocked,
    })
    .select()
    .single();
  if (projectError || !project) throw projectError ?? new Error("Project insert failed");
  console.log(`Created project ${project.id}`);

  // --- 2. roles (client-generated ids so we can map legacy roleId -> new uuid) ----
  const roleIdMap = new Map<string, string>();
  const roleRows = legacy.roles.map((r, i) => {
    const id = randomUUID();
    roleIdMap.set(r.id, id);
    return { id, project_id: project.id, name: r.name, color: r.color, sort_order: i };
  });
  if (roleRows.length > 0) {
    const { error } = await supabase.from("project_roles").insert(roleRows);
    if (error) throw error;
  }
  console.log(`Imported ${roleRows.length} roles`);

  // --- 3. checklist items (client-generated ids so we can map item_key -> new uuid) -
  const itemKeys = Object.keys(legacy.items);
  const itemIdMap = new Map<string, string>();
  const itemRows = itemKeys.map((itemKey) => {
    const parsed = parseItemId(itemKey);
    if (!parsed) throw new Error(`Unparseable item key: ${itemKey}`);
    const agencyId = agencyIdForStepKey(parsed.stepKey);
    if (!agencyId) throw new Error(`Unknown step key (template drift?): ${parsed.stepKey}`);
    const id = randomUUID();
    itemIdMap.set(itemKey, id);
    const legacyStatus = legacy.items[itemKey].status;
    const isNa = legacyStatus === "na";
    return {
      id,
      project_id: project.id,
      item_key: itemKey,
      step_key: parsed.stepKey,
      agency_id: agencyId,
      status: (isNa ? "pending" : legacyStatus) as "pending" | "progress" | "submitted" | "cleared",
      na: isNa,
    };
  });
  for (let i = 0; i < itemRows.length; i += 500) {
    const { error } = await supabase.from("checklist_items").insert(itemRows.slice(i, i + 500));
    if (error) throw error;
  }
  console.log(`Imported ${itemRows.length} checklist items (${itemRows.filter((r) => r.na).length} marked N/A)`);

  // --- 4. subchecks -----------------------------------------------------------------
  const subcheckRows: Database["public"]["Tables"]["item_subchecks"]["Insert"][] = [];
  for (const [itemKey, byIdx] of Object.entries(legacy.subchecks || {})) {
    const itemId = itemIdMap.get(itemKey);
    if (!itemId) continue;
    for (const [idx, checked] of Object.entries(byIdx)) {
      if (checked) subcheckRows.push({ item_id: itemId, checklist_idx: Number(idx), checked: true });
    }
  }
  if (subcheckRows.length > 0) {
    const { error } = await supabase.from("item_subchecks").insert(subcheckRows);
    if (error) throw error;
  }
  console.log(`Imported ${subcheckRows.length} sub-checklist ticks`);

  // --- 5. responsible parties ---------------------------------------------------------
  const responsibleRows: Database["public"]["Tables"]["item_responsible"]["Insert"][] = [];
  for (const [itemKey, entries] of Object.entries(legacy.responsible || {})) {
    const itemId = itemIdMap.get(itemKey);
    if (!itemId) continue;
    entries.forEach((entry, i) => {
      const roleId = roleIdMap.get(entry.roleId);
      if (!roleId) return;
      responsibleRows.push({ item_id: itemId, role_id: roleId, note: entry.note || "", sort_order: i });
    });
  }
  if (responsibleRows.length > 0) {
    const { error } = await supabase.from("item_responsible").insert(responsibleRows);
    if (error) throw error;
  }
  console.log(`Imported ${responsibleRows.length} responsible-party assignments`);

  // --- 6. consultants -----------------------------------------------------------------
  const consultantRows = (legacy.consultants || []).map((c, i) => ({
    project_id: project.id,
    company: c.company,
    role_id: c.roleId ? roleIdMap.get(c.roleId) ?? null : null,
    date_signed: c.dateSigned || null,
    note: c.note || "",
    sort_order: i,
  }));
  if (consultantRows.length > 0) {
    const { error } = await supabase.from("consultants").insert(consultantRows);
    if (error) throw error;
  }
  console.log(`Imported ${consultantRows.length} consultants`);

  // --- 7. milestones -------------------------------------------------------------------
  const milestoneRows: Database["public"]["Tables"]["milestones"]["Insert"][] = [];
  for (const [stepKey, entries] of Object.entries(legacy.milestones || {})) {
    entries.forEach((entry, i) => {
      milestoneRows.push({
        project_id: project.id,
        step_key: stepKey,
        type: entry.type,
        date: entry.date || null,
        note: entry.note || "",
        sort_order: i,
      });
    });
  }
  if (milestoneRows.length > 0) {
    const { error } = await supabase.from("milestones").insert(milestoneRows);
    if (error) throw error;
  }
  console.log(`Imported ${milestoneRows.length} milestone entries across ${Object.keys(legacy.milestones || {}).length} steps`);

  // --- 8. timeline plan -----------------------------------------------------------------
  const timelineRows = Object.entries(legacy.timelinePlan || {}).map(([stepKey, plan]) => ({
    project_id: project.id,
    step_key: stepKey,
    start_date: plan.start || null,
    end_date: plan.end || null,
  }));
  if (timelineRows.length > 0) {
    const { error } = await supabase.from("timeline_plan").insert(timelineRows);
    if (error) throw error;
  }
  console.log(`Imported ${timelineRows.length} timeline plan rows`);

  // --- 9. files (generic — handles a future copy of the file with real attachments) ----
  let itemFilesImported = 0;
  for (const [itemKey, entry] of Object.entries(legacy.itemFiles || {})) {
    const itemId = itemIdMap.get(itemKey);
    if (!itemId) continue;
    let storagePath: string | null = null;
    if (entry.file?.dataUrl) {
      storagePath = await uploadLegacyFile("item-files", `${project.id}/${itemKey}/${entry.file.name}`, entry.file);
    }
    if (entry.link || storagePath) {
      const { error } = await supabase.from("item_files").insert({
        item_id: itemId,
        link: entry.link || null,
        storage_path: storagePath,
        file_name: entry.file?.name || null,
        file_type: entry.file?.type || null,
        file_size: entry.file?.size || null,
      });
      if (error) throw error;
      itemFilesImported++;
    }
  }
  let templateFilesImported = 0;
  for (const [itemKey, file] of Object.entries(legacy.templateFiles || {})) {
    if (!file.dataUrl) continue;
    const storagePath = await uploadLegacyFile("template-files", `${itemKey}/${file.name}`, file);
    if (!storagePath) continue;
    const { error } = await supabase.from("template_files").upsert({
      item_key: itemKey,
      storage_path: storagePath,
      file_name: file.name,
      file_type: file.type || null,
      file_size: file.size || null,
    });
    if (error) throw error;
    templateFilesImported++;
  }
  console.log(`Imported ${itemFilesImported} item files, ${templateFilesImported} template files`);

  // --- verification -----------------------------------------------------------------
  console.log("\nVerification:");
  console.log(`  items:      ${itemRows.length} imported vs ${itemKeys.length} in source (expect equal)`);
  console.log(`  roles:      ${roleRows.length} imported vs ${legacy.roles.length} in source (expect equal)`);
  console.log(
    `  consultants:${consultantRows.length} imported vs ${(legacy.consultants || []).length} in source (expect equal)`
  );
  console.log(`\nDone. Project id: ${project.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
