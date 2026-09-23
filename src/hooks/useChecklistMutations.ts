import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { projectDataQueryKey } from "./useProjectData";
import type { ItemStatus } from "@/template";

/** All checklist mutations share the same "write, then refetch this project's data" shape
 * — the dataset is small (a few hundred rows) so a full refetch is cheap and simple; true
 * per-row optimistic updates can be layered in later without changing this API. */
function useProjectMutation<TVars>(projectId: string, mutationFn: (vars: TVars) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectDataQueryKey(projectId) });
    },
  });
}

export function useUpdateItemStatus(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ itemDbId: string; status: ItemStatus }>(projectId, async ({ itemDbId, status }) => {
    const { error } = await supabase
      .from("checklist_items")
      .update({ status, na: false, updated_at: new Date().toISOString() })
      .eq("id", itemDbId);
    if (error) throw error;
  });
}

export function useToggleItemNa(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ itemDbId: string; na: boolean }>(projectId, async ({ itemDbId, na }) => {
    const { error } = await supabase
      .from("checklist_items")
      .update({ na, updated_at: new Date().toISOString() })
      .eq("id", itemDbId);
    if (error) throw error;
  });
}

export function useToggleStepNa(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ stepKey: string; na: boolean }>(projectId, async ({ stepKey, na }) => {
    const { error } = await supabase
      .from("checklist_items")
      .update({ na, updated_at: new Date().toISOString() })
      .eq("project_id", projectId)
      .eq("step_key", stepKey);
    if (error) throw error;
  });
}

export function useToggleSubcheck(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ itemDbId: string; checklistIdx: number; checked: boolean }>(
    projectId,
    async ({ itemDbId, checklistIdx, checked }) => {
      const { error } = await supabase
        .from("item_subchecks")
        .upsert(
          { item_id: itemDbId, checklist_idx: checklistIdx, checked },
          { onConflict: "item_id,checklist_idx" }
        );
      if (error) throw error;
    }
  );
}

export function useAssignRole(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ itemDbId: string; roleId: string; note: string; sortOrder: number }>(
    projectId,
    async ({ itemDbId, roleId, note, sortOrder }) => {
      const { error } = await supabase
        .from("item_responsible")
        .insert({ item_id: itemDbId, role_id: roleId, note, sort_order: sortOrder });
      if (error) throw error;
    }
  );
}

export function useRemoveAssign(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ responsibleId: string }>(projectId, async ({ responsibleId }) => {
    const { error } = await supabase.from("item_responsible").delete().eq("id", responsibleId);
    if (error) throw error;
  });
}

/** step_order is a plain column (string[] JSONB, but always written whole) — no merge race
 * here since the caller (ChecklistTab) always computes the new array from the full current
 * order via moveStepInOrder(), not a partial patch. */
export function useUpdateStepOrder(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<string[]>(projectId, async (order) => {
    const { error } = await supabase.from("projects").update({ step_order: order }).eq("id", projectId);
    if (error) throw error;
  });
}
