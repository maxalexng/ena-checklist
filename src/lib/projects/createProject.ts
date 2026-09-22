import type { SupabaseClient } from "@supabase/supabase-js";
import { STEPS, defaultRoles, defaultListPresets, defaultStageDurationWeeks } from "@/template";
import type { Database } from "@/lib/supabase/database.types";

export interface NewProjectInput {
  reference: string;
  title: string;
  address?: string;
  initialism?: string;
}

/** Creates a new project row and seeds it from the template: every checklist item at
 * "pending", the office's default roles, and default list presets/stage durations. Mirrors
 * the prototype's defaultState() — see src/template/defaults.ts. */
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

  return project;
}
