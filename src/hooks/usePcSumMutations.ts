import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { pcSumRows } from "@/lib/projects/createProject";
import { projectDataQueryKey, type PcSumEntry, type ProjectChecklistData } from "./useProjectData";
import type { Database } from "@/lib/supabase/database.types";

type PcSumUpdate = Database["public"]["Tables"]["pc_sums"]["Update"];

/** Same write-then-refetch shape as useChecklistMutations, including its optional
 * `optimisticUpdate` for controls people click through quickly (the selection dropdown,
 * the confirmed and N/A checkboxes while running down the list with the client). */
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
      if (previous) queryClient.setQueryData(queryKey, options.optimisticUpdate(previous, vars));
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

function currentPcSums(queryClient: ReturnType<typeof useQueryClient>, projectId: string): PcSumEntry[] {
  return queryClient.getQueryData<ProjectChecklistData>(projectDataQueryKey(projectId))?.pcSums ?? [];
}

export function useAddPcSum(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useProjectMutation<void>(projectId, async () => {
    const existing = currentPcSums(queryClient, projectId);
    const { error } = await supabase.from("pc_sums").insert({
      project_id: projectId,
      sort_order: existing.reduce((max, r) => Math.max(max, r.sortOrder + 1), 0),
    });
    if (error) throw error;
  });
}

/** Loads the office's standard list into a project that has no PC sums yet (one created
 * before the schedule existed, or one whose list was cleared). */
export function useLoadStandardPcSums(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<void>(projectId, async () => {
    const { error } = await supabase.from("pc_sums").insert(pcSumRows(projectId));
    if (error) throw error;
  });
}

export type PcSumPatch = Partial<
  Pick<PcSumEntry, "item" | "supplier" | "selection" | "amount" | "clientConfirmed" | "na" | "note">
>;

export function useUpdatePcSum(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ id: string } & PcSumPatch>(
    projectId,
    async ({ id, item, supplier, selection, amount, clientConfirmed, na, note }) => {
      const patch: PcSumUpdate = {};
      if (item !== undefined) patch.item = item;
      if (supplier !== undefined) patch.supplier = supplier;
      if (selection !== undefined) patch.selection = selection;
      if (amount !== undefined) patch.amount = amount;
      if (clientConfirmed !== undefined) patch.client_confirmed = clientConfirmed;
      if (na !== undefined) patch.na = na;
      if (note !== undefined) patch.note = note;
      const { error } = await supabase.from("pc_sums").update(patch).eq("id", id);
      if (error) throw error;
    },
    {
      optimisticUpdate: (data, { id, ...patch }) => ({
        ...data,
        pcSums: data.pcSums.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      }),
    }
  );
}

export function useDeletePcSum(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ id: string }>(projectId, async ({ id }) => {
    const { error } = await supabase.from("pc_sums").delete().eq("id", id);
    if (error) throw error;
  });
}

export function useMovePcSum(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useProjectMutation<{ id: string; direction: -1 | 1 }>(projectId, async ({ id, direction }) => {
    const list = currentPcSums(queryClient, projectId);
    const idx = list.findIndex((r) => r.id === id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;
    const a = list[idx];
    const b = list[swapIdx];
    const { error: e1 } = await supabase.from("pc_sums").update({ sort_order: b.sortOrder }).eq("id", a.id);
    if (e1) throw e1;
    const { error: e2 } = await supabase.from("pc_sums").update({ sort_order: a.sortOrder }).eq("id", b.id);
    if (e2) throw e2;
  });
}
