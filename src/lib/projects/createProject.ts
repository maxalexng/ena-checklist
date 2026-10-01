import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_PC_SUMS, earlyPrepNote, STEPS, defaultRoles, defaultListPresets, defaultStageDurationWeeks } from "@/template";
import type { Database } from "@/lib/supabase/database.types";

export interface NewProjectInput {
  reference: string;
  title: string;
  address?: string;
  initialism?: string;
}

/** Creates a new project row and seeds it from the template: every checklist item at
 * "pending", the office's default roles, the standard PC sum list, and default list
 * presets/stage durations. Mirrors the prototype's defaultState() — see
 * src/template/defaults.ts. */
export async function createProject(
  supabase: SupabaseClient<Database>,
  input: NewProjectInput,
  userId: string | null
) {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      reference: input.reference,
      title: input.title ?? "",
      address: input.address ?? "",
      initialism: input.initialism ?? "",
      list_presets: defaultListPresets(),
      stage_duration_weeks: defaultStageDurationWeeks(),
      created_by: userId,
    })
    .select()
    .single();

  if (projectError || !project) {
    throw projectError ?? new Error("Failed to create project");
  }

  const itemRows = STEPS.flatMap((step) =>
    step.items.map((item) => ({
      project_id: project.id,
      item_key: item.id,
      step_key: step.id,
      agency_id: step.realId,
      status: "pending" as const,
    }))
  );

  if (itemRows.length > 0) {
    const { error: itemsError } = await supabase.from("checklist_items").insert(itemRows);
    if (itemsError) throw itemsError;
  }

  const roleRows = defaultRoles().map((r) => ({
    project_id: project.id,
    name: r.name,
    color: r.color,
    sort_order: r.sortOrder,
  }));
  const { error: rolesError } = await supabase.from("project_roles").insert(roleRows);
  if (rolesError) throw rolesError;

  const { error: pcSumsError } = await supabase.from("pc_sums").insert(pcSumRows(project.id));
  if (pcSumsError) throw pcSumsError;

  return project;
}

/** How long after creating a project a resubmit of the same form counts as a duplicate. */
export const DUPLICATE_CREATE_WINDOW_MS = 2 * 60 * 1000;

/** The project this user just created with the same reference and title, if it was within
 * DUPLICATE_CREATE_WINDOW_MS — a resubmit of the New Project form (a second click while the
 * first was still seeding, or Back and submit again) should land on that project, not make
 * another copy. Reference alone isn't unique on purpose: colleagues can open separate
 * projects under one job reference. */
export async function findRecentDuplicateProject(
  supabase: SupabaseClient<Database>,
  input: NewProjectInput,
  userId: string | null,
  now: Date = new Date()
): Promise<{ id: string } | null> {
  if (!userId) return null;
  const since = new Date(now.getTime() - DUPLICATE_CREATE_WINDOW_MS).toISOString();
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("created_by", userId)
    .eq("reference", input.reference)
    .eq("title", input.title ?? "")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** The standard PC sum list as pc_sums rows — used when a project is created, and to load
 * the list into a project created before the PC sum schedule existed. */
export function pcSumRows(projectId: string) {
  return DEFAULT_PC_SUMS.map((d, i) => ({
    project_id: projectId,
    item: d.item,
    phase: d.phase,
    note: earlyPrepNote(d),
    sort_order: i,
  }));
}
