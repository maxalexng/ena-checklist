import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { projectDataQueryKey } from "./useProjectData";

function useProjectMutation<TVars>(projectId: string, mutationFn: (vars: TVars) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectDataQueryKey(projectId) });
    },
  });
}

// Atomic server-side merge — see the comment on useUpdateProjectDates in
// useOverviewMutations.ts for why this isn't a client-side read-merge-write.
export function useUpdateStageDurationWeeks(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ stageId: string; weeks: number }>(projectId, async ({ stageId, weeks }) => {
    const { error } = await supabase.rpc("merge_stage_duration_weeks", {
      p_project_id: projectId,
      p_patch: { [stageId]: weeks },
    });
    if (error) throw error;
  });
}
