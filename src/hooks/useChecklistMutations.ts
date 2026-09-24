import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { projectDataQueryKey } from "./useProjectData";
import type { ItemRecord, ProjectChecklistData } from "./useProjectData";
import type { ItemStatus } from "@/template";

/** All checklist mutations share the same "write, then refetch this project's data" shape
 * — the dataset is small (a few hundred rows) so a full refetch is cheap and simple. Pass
 * `optimisticUpdate` for anything clicked rapidly (status cycling, NA toggles): it patches
 * the cache synchronously on click, before the network round trip, so the UI advances
 * instantly and a fast run of clicks each see the previous click's result immediately
 * instead of racing a still-in-flight refetch. Rolled back on error, reconciled with the
 * server on settle either way. */
function useProjectMutation<TVars>(
  projectId: string,
  mutationFn: (vars: TVars) => Promise<void>,
  options?: { optimisticUpdate?: (data: ProjectChecklistData, vars: TVars) => ProjectChecklistData }
) {
  const queryClient = useQueryClient();
  const queryKey = projectDataQueryKey(projectId);
  return useMutation({
    mutationFn,
    onMutate: async (vars: TVars) => {
      if (!options?.optimisticUpdate) return undefined;
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProjectChecklistData>(queryKey);
      if (previous) {
        queryClient.setQueryData(queryKey, options.optimisticUpdate(previous, vars));
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      const previous = (context as { previous?: ProjectChecklistData } | undefined)?.previous;
      if (previous) queryClient.setQueryData(queryKey, previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/** Finds an item's itemsByKey entry by its DB id — mutations address items by dbId (the
 * primary key), but the cache is keyed by item_key (the template id). */
function findItemEntry(data: ProjectChecklistData, itemDbId: string): [string, ItemRecord] | undefined {
  return Object.entries(data.itemsByKey).find(([, r]) => r.dbId === itemDbId);
}

export function useUpdateItemStatus(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ itemDbId: string; status: ItemStatus }>(
    projectId,
    async ({ itemDbId, status }) => {
      const { error } = await supabase
        .from("checklist_items")
        .update({ status, na: false, updated_at: new Date().toISOString() })
        .eq("id", itemDbId);
      if (error) throw error;
    },
    {
      optimisticUpdate: (data, { itemDbId, status }) => {
        const entry = findItemEntry(data, itemDbId);
        if (!entry) return data;
        const [key, record] = entry;
        return {
          ...data,
          itemsByKey: { ...data.itemsByKey, [key]: { ...record, status, na: false } },
        };
      },
    }
  );
}

export function useToggleItemNa(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ itemDbId: string; na: boolean }>(
    projectId,
    async ({ itemDbId, na }) => {
      const { error } = await supabase
        .from("checklist_items")
        .update({ na, updated_at: new Date().toISOString() })
        .eq("id", itemDbId);
      if (error) throw error;
    },
    {
      optimisticUpdate: (data, { itemDbId, na }) => {
        const entry = findItemEntry(data, itemDbId);
        if (!entry) return data;
        const [key, record] = entry;
        return { ...data, itemsByKey: { ...data.itemsByKey, [key]: { ...record, na } } };
      },
    }
  );
}

export function useToggleStepNa(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ stepKey: string; na: boolean }>(
    projectId,
    async ({ stepKey, na }) => {
      const { error } = await supabase
        .from("checklist_items")
        .update({ na, updated_at: new Date().toISOString() })
        .eq("project_id", projectId)
        .eq("step_key", stepKey);
      if (error) throw error;
    },
    {
      optimisticUpdate: (data, { stepKey, na }) => {
        const prefix = `${stepKey}__`;
        const itemsByKey = { ...data.itemsByKey };
        Object.keys(itemsByKey).forEach((key) => {
          if (key.startsWith(prefix)) itemsByKey[key] = { ...itemsByKey[key], na };
        });
        return { ...data, itemsByKey };
      },
    }
  );
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

/** Same shape as useUpdateStepOrder, for item_order — the caller (StepCard) always computes
 * the new array from the full current order via moveItemInOrder(). */
export function useUpdateItemOrder(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<string[]>(projectId, async (order) => {
    const { error } = await supabase.from("projects").update({ item_order: order }).eq("id", projectId);
    if (error) throw error;
  });
}
