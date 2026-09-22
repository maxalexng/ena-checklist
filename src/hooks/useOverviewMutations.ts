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

const EMPTY_PROJECT_DATES: ProjectDates = {
  contractStart: "",
  practicalCompletion: "",
  practicalCompletionNote: "",
  contractSigned: "",
  loaSigned: "",
  loaBasisType: "months",
  loaBasisMonths: "3",
  startAiRef: "",
  eot: [],
};

/** project_dates is a single JSONB object edited as a whole — merges the given partial
 * fields onto whatever the client currently has cached and writes the full object back. */
export function useUpdateProjectDates(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useProjectMutation<Partial<ProjectDates>>(projectId, async (patch) => {
    const existing = currentData(queryClient, projectId)?.project.projectDates ?? EMPTY_PROJECT_DATES;
    const merged: ProjectDates = { ...existing, ...patch };
    const { error } = await supabase.from("projects").update({ project_dates: merged }).eq("id", projectId);
    if (error) throw error;
  });
}

export function useUpdatePpValidityMonths(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ months: string }>(projectId, async ({ months }) => {
    const { error } = await supabase.from("projects").update({ pp_validity_months: months }).eq("id", projectId);
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
  const queryClient = useQueryClient();
  return useProjectMutation<{ stepKey: string; presets: string[] }>(projectId, async ({ stepKey, presets }) => {
    const existing = currentData(queryClient, projectId)?.project.listPresets ?? {};
    const merged = { ...existing, [stepKey]: presets };
    const { error } = await supabase.from("projects").update({ list_presets: merged }).eq("id", projectId);
    if (error) throw error;
  });
}
