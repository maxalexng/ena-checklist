import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { projectDataQueryKey, type ProjectChecklistData } from "./useProjectData";
import { ROLE_PALETTE } from "@/template";

function useProjectMutation<TVars>(projectId: string, mutationFn: (vars: TVars) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectDataQueryKey(projectId) });
    },
  });
}

export function useRenameRole(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ roleId: string; name: string }>(projectId, async ({ roleId, name }) => {
    const { error } = await supabase.from("project_roles").update({ name }).eq("id", roleId);
    if (error) throw error;
  });
}

export function useCycleRoleColor(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ roleId: string; currentColor: string }>(
    projectId,
    async ({ roleId, currentColor }) => {
      const idx = ROLE_PALETTE.indexOf(currentColor as (typeof ROLE_PALETTE)[number]);
      const next = ROLE_PALETTE[(idx + 1) % ROLE_PALETTE.length];
      const { error } = await supabase.from("project_roles").update({ color: next }).eq("id", roleId);
      if (error) throw error;
    }
  );
}

export function useMoveRole(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useProjectMutation<{ roleId: string; direction: -1 | 1 }>(projectId, async ({ roleId, direction }) => {
    const roles = [
      ...(queryClient.getQueryData<ProjectChecklistData>(projectDataQueryKey(projectId))?.roles ?? []),
    ].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = roles.findIndex((r) => r.id === roleId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= roles.length) return;
    const a = roles[idx];
    const b = roles[swapIdx];
    const { error: e1 } = await supabase.from("project_roles").update({ sort_order: b.sortOrder }).eq("id", a.id);
    if (e1) throw e1;
    const { error: e2 } = await supabase.from("project_roles").update({ sort_order: a.sortOrder }).eq("id", b.id);
    if (e2) throw e2;
  });
}

export function useAddRole(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useProjectMutation<{ name: string }>(projectId, async ({ name }) => {
    const roles = queryClient.getQueryData<ProjectChecklistData>(projectDataQueryKey(projectId))?.roles ?? [];
    const color = ROLE_PALETTE[roles.length % ROLE_PALETTE.length];
    const { error } = await supabase.from("project_roles").insert({
      project_id: projectId,
      name,
      color,
      sort_order: roles.length,
    });
    if (error) throw error;
  });
}
