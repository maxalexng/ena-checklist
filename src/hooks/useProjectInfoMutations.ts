import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { projectDataQueryKey } from "./useProjectData";
import type { Database } from "@/lib/supabase/database.types";

type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];

function useProjectMutation<TVars>(projectId: string, mutationFn: (vars: TVars) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectDataQueryKey(projectId) });
    },
  });
}

export interface ProjectInfoPatch {
  reference?: string;
  title?: string;
  address?: string;
  initialism?: string;
  bcaRef?: string;
  contractPeriodMonths?: number | null;
  contractSum?: string;
  currentStage?: string;
}

export function useUpdateProjectInfo(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<ProjectInfoPatch>(projectId, async (patch) => {
    const dbPatch: ProjectUpdate = {};
    if (patch.reference !== undefined) dbPatch.reference = patch.reference;
    if (patch.title !== undefined) dbPatch.title = patch.title;
    if (patch.address !== undefined) dbPatch.address = patch.address;
    if (patch.initialism !== undefined) dbPatch.initialism = patch.initialism;
    if (patch.bcaRef !== undefined) dbPatch.bca_ref = patch.bcaRef;
    if (patch.contractPeriodMonths !== undefined) dbPatch.contract_period_months = patch.contractPeriodMonths;
    if (patch.contractSum !== undefined) dbPatch.contract_sum = patch.contractSum;
    if (patch.currentStage !== undefined) dbPatch.current_stage = patch.currentStage;
    const { error } = await supabase.from("projects").update(dbPatch).eq("id", projectId);
    if (error) throw error;
  });
}

export function useToggleAssignmentsLocked(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ locked: boolean }>(projectId, async ({ locked }) => {
    const { error } = await supabase.from("projects").update({ assignments_locked: locked }).eq("id", projectId);
    if (error) throw error;
  });
}
