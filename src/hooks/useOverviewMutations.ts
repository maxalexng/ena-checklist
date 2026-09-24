import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { projectDataQueryKey, type ProjectChecklistData } from "./useProjectData";
import type { ProjectDates } from "@/lib/supabase/database.types";

function useProjectMutation<TVars>(projectId: string, mutationFn: (vars: TVars) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectDataQueryKey(projectId) });
    },
  });
}

function currentData(queryClient: ReturnType<typeof useQueryClient>, projectId: string) {
  return queryClient.getQueryData<ProjectChecklistData>(projectDataQueryKey(projectId));
}

/** project_dates is a single JSONB object edited as a whole — merged atomically inside
 * Postgres (see supabase/migrations/0003_jsonb_merge_functions.sql) rather than via a
 * client-side read-merge-write. Two rapid edits to different fields of the same JSONB blob
 * (e.g. setting a date, then immediately adding an EOT row) used to race under the
 * client-side version: the second write could read a snapshot from before the first
 * write had landed and silently revert it. An atomic `column = column || patch` UPDATE
 * has no such window, regardless of how close together the two calls fire. */
export function useUpdateProjectDates(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<Partial<ProjectDates>>(projectId, async (patch) => {
    const { error } = await supabase.rpc("merge_project_dates", { p_project_id: projectId, p_patch: patch });
    if (error) throw error;
  });
}

export function useAddMilestone(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useProjectMutation<{ stepKey: string; type: string; date: string | null; note: string }>(
    projectId,
    async ({ stepKey, type, date, note }) => {
      const existing = currentData(queryClient, projectId)?.milestonesByStep[stepKey] ?? [];
      const { error } = await supabase.from("milestones").insert({
        project_id: projectId,
        step_key: stepKey,
        type,
        date,
        note,
        sort_order: existing.length,
      });
      if (error) throw error;
    }
  );
}

export function useUpdateMilestone(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ id: string; type?: string; date?: string | null; note?: string }>(
    projectId,
    async ({ id, ...patch }) => {
      const { error } = await supabase.from("milestones").update(patch).eq("id", id);
      if (error) throw error;
    }
  );
}

export function useDeleteMilestone(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ id: string }>(projectId, async ({ id }) => {
    const { error } = await supabase.from("milestones").delete().eq("id", id);
    if (error) throw error;
  });
}

export function useMoveMilestone(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useProjectMutation<{ stepKey: string; id: string; direction: -1 | 1 }>(
    projectId,
    async ({ stepKey, id, direction }) => {
      const list = [...(currentData(queryClient, projectId)?.milestonesByStep[stepKey] ?? [])];
      const idx = list.findIndex((m) => m.id === id);
      const swapIdx = idx + direction;
      if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;
      const a = list[idx];
      const b = list[swapIdx];
      const { error: e1 } = await supabase.from("milestones").update({ sort_order: b.sortOrder }).eq("id", a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("milestones").update({ sort_order: a.sortOrder }).eq("id", b.id);
      if (e2) throw e2;
    }
  );
}

export function useUpdateListPresets(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ stepKey: string; presets: string[] }>(projectId, async ({ stepKey, presets }) => {
    const { error } = await supabase.rpc("merge_list_presets", {
      p_project_id: projectId,
      p_patch: { [stepKey]: presets },
    });
    if (error) throw error;
  });
}
