import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { projectDataQueryKey, type ProjectChecklistData } from "./useProjectData";
import type { Database } from "@/lib/supabase/database.types";

type ConsultantUpdate = Database["public"]["Tables"]["consultants"]["Update"];

function useProjectMutation<TVars>(projectId: string, mutationFn: (vars: TVars) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectDataQueryKey(projectId) });
    },
  });
}

export function useAddConsultant(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useProjectMutation<void>(projectId, async () => {
    const existing =
      queryClient.getQueryData<ProjectChecklistData>(projectDataQueryKey(projectId))?.consultants ?? [];
    const { error } = await supabase.from("consultants").insert({
      project_id: projectId,
      company: "",
      sort_order: existing.length,
    });
    if (error) throw error;
  });
}

export function useUpdateConsultant(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{
    id: string;
    company?: string;
    roleId?: string | null;
    dateSigned?: string | null;
    note?: string;
  }>(projectId, async ({ id, company, roleId, dateSigned, note }) => {
    const patch: ConsultantUpdate = {};
    if (company !== undefined) patch.company = company;
    if (roleId !== undefined) patch.role_id = roleId;
    if (dateSigned !== undefined) patch.date_signed = dateSigned;
    if (note !== undefined) patch.note = note;
    const { error } = await supabase.from("consultants").update(patch).eq("id", id);
    if (error) throw error;
  });
}

export function useDeleteConsultant(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ id: string }>(projectId, async ({ id }) => {
    const { error } = await supabase.from("consultants").delete().eq("id", id);
    if (error) throw error;
  });
}

export function useMoveConsultant(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useProjectMutation<{ id: string; direction: -1 | 1 }>(projectId, async ({ id, direction }) => {
    const list = [
      ...(queryClient.getQueryData<ProjectChecklistData>(projectDataQueryKey(projectId))?.consultants ?? []),
    ].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = list.findIndex((c) => c.id === id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return;
    const a = list[idx];
    const b = list[swapIdx];
    const { error: e1 } = await supabase.from("consultants").update({ sort_order: b.sortOrder }).eq("id", a.id);
    if (e1) throw e1;
    const { error: e2 } = await supabase.from("consultants").update({ sort_order: a.sortOrder }).eq("id", b.id);
    if (e2) throw e2;
  });
}
