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

/** Sets only the one field being changed (start OR end), never both — the row is a
 * (project_id, step_key) upsert, and including only the changed column in the payload
 * means Postgres's ON CONFLICT DO UPDATE only touches that column, leaving the other
 * date untouched. Passing both together (read one from props, write both back) is what
 * used to cause a race: setting start then immediately end could read a stale "start"
 * value from before the first write's refetch landed, silently reverting it. */
export function useUpdateTimelinePlanField(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ stepKey: string; field: "start_date" | "end_date"; value: string | null }>(
    projectId,
    async ({ stepKey, field, value }) => {
      const { error } =
        field === "start_date"
          ? await supabase
              .from("timeline_plan")
              .upsert(
                { project_id: projectId, step_key: stepKey, start_date: value },
                { onConflict: "project_id,step_key" }
              )
          : await supabase
              .from("timeline_plan")
              .upsert(
                { project_id: projectId, step_key: stepKey, end_date: value },
                { onConflict: "project_id,step_key" }
              );
      if (error) throw error;
    }
  );
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
