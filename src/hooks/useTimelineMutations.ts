import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { projectDataQueryKey, type ProjectChecklistData } from "./useProjectData";

function useProjectMutation<TVars>(projectId: string, mutationFn: (vars: TVars) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectDataQueryKey(projectId) });
    },
  });
}

export function useUpdateTimelinePlan(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ stepKey: string; startDate: string | null; endDate: string | null }>(
    projectId,
    async ({ stepKey, startDate, endDate }) => {
      const { error } = await supabase
        .from("timeline_plan")
        .upsert(
          { project_id: projectId, step_key: stepKey, start_date: startDate, end_date: endDate },
          { onConflict: "project_id,step_key" }
        );
      if (error) throw error;
    }
  );
}

export function useUpdateStageDurationWeeks(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useProjectMutation<{ stageId: string; weeks: number }>(projectId, async ({ stageId, weeks }) => {
    const existing =
      queryClient.getQueryData<ProjectChecklistData>(projectDataQueryKey(projectId))?.project.stageDurationWeeks ??
      {};
    const merged = { ...existing, [stageId]: weeks };
    const { error } = await supabase.from("projects").update({ stage_duration_weeks: merged }).eq("id", projectId);
    if (error) throw error;
  });
}
