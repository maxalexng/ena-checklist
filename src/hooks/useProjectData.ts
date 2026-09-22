import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ItemStatus } from "@/template";

export interface ItemRecord {
  dbId: string;
  status: ItemStatus;
  na: boolean;
}

export interface ResponsibleEntry {
  id: string;
  roleId: string;
  note: string;
  sortOrder: number;
}

export interface RoleRecord {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
}

export interface ProjectChecklistData {
  project: {
    id: string;
    reference: string;
    title: string;
    address: string;
    step_order: string[] | null;
    step_stage: Record<string, string>;
    assignments_locked: boolean;
  };
  itemsByKey: Record<string, ItemRecord>;
  subchecksByItem: Record<string, Record<number, boolean>>;
  responsibleByItem: Record<string, ResponsibleEntry[]>;
  roles: RoleRecord[];
}

export function projectDataQueryKey(projectId: string) {
  return ["project-data", projectId] as const;
}

export function useProjectData(projectId: string) {
  return useQuery({
    queryKey: projectDataQueryKey(projectId),
    queryFn: async (): Promise<ProjectChecklistData> => {
      const supabase = createClient();

      const [projectRes, itemsRes, rolesRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, reference, title, address, step_order, step_stage, assignments_locked")
          .eq("id", projectId)
          .single(),
        supabase.from("checklist_items").select("id, item_key, status, na").eq("project_id", projectId),
        supabase.from("project_roles").select("id, name, color, sort_order").eq("project_id", projectId).order("sort_order"),
      ]);

      if (projectRes.error) throw projectRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const itemsByKey: Record<string, ItemRecord> = {};
      const dbIdToKey: Record<string, string> = {};
      (itemsRes.data ?? []).forEach((row) => {
        itemsByKey[row.item_key] = { dbId: row.id, status: row.status as ItemStatus, na: row.na };
        dbIdToKey[row.id] = row.item_key;
      });

      const itemDbIds = (itemsRes.data ?? []).map((row) => row.id);

      const [subchecksRes, responsibleRes] =
        itemDbIds.length > 0
          ? await Promise.all([
              supabase.from("item_subchecks").select("item_id, checklist_idx, checked").in("item_id", itemDbIds),
              supabase
                .from("item_responsible")
                .select("id, item_id, role_id, note, sort_order")
                .in("item_id", itemDbIds),
            ])
          : [{ data: [], error: null } as const, { data: [], error: null } as const];

      if (subchecksRes.error) throw subchecksRes.error;
      if (responsibleRes.error) throw responsibleRes.error;

      const subchecksByItem: Record<string, Record<number, boolean>> = {};
      (subchecksRes.data ?? []).forEach((row) => {
        (subchecksByItem[row.item_id] ||= {})[row.checklist_idx] = row.checked;
      });

      const responsibleByItem: Record<string, ResponsibleEntry[]> = {};
      (responsibleRes.data ?? []).forEach((row) => {
        (responsibleByItem[row.item_id] ||= []).push({
          id: row.id,
          roleId: row.role_id,
          note: row.note,
          sortOrder: row.sort_order,
        });
      });
      Object.values(responsibleByItem).forEach((list) => list.sort((a, b) => a.sortOrder - b.sortOrder));

      const roles: RoleRecord[] = (rolesRes.data ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        sortOrder: r.sort_order,
      }));

      return {
        project: {
          id: projectRes.data.id,
          reference: projectRes.data.reference,
          title: projectRes.data.title,
          address: projectRes.data.address,
          step_order: projectRes.data.step_order,
          step_stage: (projectRes.data.step_stage as Record<string, string>) ?? {},
          assignments_locked: projectRes.data.assignments_locked,
        },
        itemsByKey,
        subchecksByItem,
        responsibleByItem,
        roles,
      };
    },
  });
}
