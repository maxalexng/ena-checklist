import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { projectDataQueryKey } from "./useProjectData";
import type { FeeCalculatorInputsRow } from "@/lib/supabase/database.types";

/** fee_calculator_inputs is a single JSONB object edited as a whole (one Step-1 form) —
 * merged atomically inside Postgres, same reasoning as useUpdateProjectDates: two rapid
 * edits to different fields of the same blob could otherwise race under a client-side
 * read-merge-write. */
export function useUpdateFeeCalculatorInputs(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: FeeCalculatorInputsRow) => {
      const { error } = await supabase.rpc("merge_fee_calculator_inputs", {
        p_project_id: projectId,
        p_patch: patch,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectDataQueryKey(projectId) });
    },
  });
}
