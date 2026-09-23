import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ItemStatus } from "@/template";
import type { ProjectDates } from "@/lib/supabase/database.types";

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

export interface MilestoneEntry {
  id: string;
  stepKey: string;
  type: string;
  date: string | null;
  note: string;
  sortOrder: number;
}

export interface ConsultantEntry {
  id: string;
  company: string;
  roleId: string | null;
  dateSigned: string | null;
  note: string;
  sortOrder: number;
}

export interface TimelinePlanEntry {
  stepKey: string;
  startDate: string | null;
  endDate: string | null;
}

export interface ItemFileEntry {
  link: string | null;
  storagePath: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
}

export interface ProjectChecklistData {
  project: {
    id: string;
    reference: string;
    title: string;
    address: string;
    initialism: string;
    bcaRef: string;
    contractPeriodMonths: number | null;
    contractSum: string;
    currentStage: string;
    step_order: string[] | null;
    step_stage: Record<string, string>;
    assignments_locked: boolean;
    projectDates: ProjectDates;
    ppValidityMonths: string;
    listPresets: Record<string, string[]>;
    stageDurationWeeks: Record<string, number>;
  };
  itemsByKey: Record<string, ItemRecord>;
  subchecksByItem: Record<string, Record<number, boolean>>;
  responsibleByItem: Record<string, ResponsibleEntry[]>;
  roles: RoleRecord[];
  milestonesByStep: Record<string, MilestoneEntry[]>;
  consultants: ConsultantEntry[];
  timelinePlanByStep: Record<string, TimelinePlanEntry>;
  itemFilesByItem: Record<string, ItemFileEntry>;
}

export function projectDataQueryKey(projectId: string) {
  return ["project-data", projectId] as const;
}

export function useProjectData(projectId: string) {
  return useQuery({
    queryKey: projectDataQueryKey(projectId),
    queryFn: async (): Promise<ProjectChecklistData> => {
      const supabase = createClient();

      const [projectRes, itemsRes, rolesRes, milestonesRes, consultantsRes, timelinePlanRes] = await Promise.all([
        supabase
          .from("projects")
          .select(
            "id, reference, title, address, initialism, bca_ref, contract_period_months, contract_sum, current_stage, step_order, step_stage, assignments_locked, project_dates, pp_validity_months, list_presets, stage_duration_weeks"
          )
          .eq("id", projectId)
          .single(),
        supabase.from("checklist_items").select("id, item_key, status, na").eq("project_id", projectId),
        supabase.from("project_roles").select("id, name, color, sort_order").eq("project_id", projectId).order("sort_order"),
        supabase.from("milestones").select("id, step_key, type, date, note, sort_order").eq("project_id", projectId),
        supabase.from("consultants").select("id, company, role_id, date_signed, note, sort_order").eq("project_id", projectId),
        supabase.from("timeline_plan").select("step_key, start_date, end_date").eq("project_id", projectId),
      ]);

      if (projectRes.error) throw projectRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (milestonesRes.error) throw milestonesRes.error;
      if (consultantsRes.error) throw consultantsRes.error;
      if (timelinePlanRes.error) throw timelinePlanRes.error;

      const itemsByKey: Record<string, ItemRecord> = {};
      (itemsRes.data ?? []).forEach((row) => {
        itemsByKey[row.item_key] = { dbId: row.id, status: row.status as ItemStatus, na: row.na };
      });

      const itemDbIds = (itemsRes.data ?? []).map((row) => row.id);

      const [subchecksRes, responsibleRes, itemFilesRes] =
        itemDbIds.length > 0
          ? await Promise.all([
              supabase.from("item_subchecks").select("item_id, checklist_idx, checked").in("item_id", itemDbIds),
              supabase
                .from("item_responsible")
                .select("id, item_id, role_id, note, sort_order")
                .in("item_id", itemDbIds),
              supabase.from("item_files").select("*").in("item_id", itemDbIds),
            ])
          : [
              { data: [], error: null } as const,
              { data: [], error: null } as const,
              { data: [], error: null } as const,
            ];

      if (subchecksRes.error) throw subchecksRes.error;
      if (responsibleRes.error) throw responsibleRes.error;
      if (itemFilesRes.error) throw itemFilesRes.error;

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

      const milestonesByStep: Record<string, MilestoneEntry[]> = {};
      (milestonesRes.data ?? []).forEach((row) => {
        (milestonesByStep[row.step_key] ||= []).push({
          id: row.id,
          stepKey: row.step_key,
          type: row.type,
          date: row.date,
          note: row.note,
          sortOrder: row.sort_order,
        });
      });
      Object.values(milestonesByStep).forEach((list) => list.sort((a, b) => a.sortOrder - b.sortOrder));

      const consultants: ConsultantEntry[] = (consultantsRes.data ?? [])
        .map((c) => ({
          id: c.id,
          company: c.company,
          roleId: c.role_id,
          dateSigned: c.date_signed,
          note: c.note,
          sortOrder: c.sort_order,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const itemFilesByItem: Record<string, ItemFileEntry> = {};
      (itemFilesRes.data ?? []).forEach((row) => {
        itemFilesByItem[row.item_id] = {
          link: row.link,
          storagePath: row.storage_path,
          fileName: row.file_name,
          fileType: row.file_type,
          fileSize: row.file_size,
        };
      });

      const timelinePlanByStep: Record<string, TimelinePlanEntry> = {};
      (timelinePlanRes.data ?? []).forEach((row) => {
        timelinePlanByStep[row.step_key] = {
          stepKey: row.step_key,
          startDate: row.start_date,
          endDate: row.end_date,
        };
      });

      return {
        project: {
          id: projectRes.data.id,
          reference: projectRes.data.reference,
          title: projectRes.data.title,
          address: projectRes.data.address,
          initialism: projectRes.data.initialism,
          bcaRef: projectRes.data.bca_ref,
          contractPeriodMonths: projectRes.data.contract_period_months,
          contractSum: projectRes.data.contract_sum,
          currentStage: projectRes.data.current_stage,
          step_order: projectRes.data.step_order,
          step_stage: (projectRes.data.step_stage as Record<string, string>) ?? {},
          assignments_locked: projectRes.data.assignments_locked,
          projectDates: projectRes.data.project_dates,
          ppValidityMonths: projectRes.data.pp_validity_months,
          listPresets: (projectRes.data.list_presets as Record<string, string[]>) ?? {},
          stageDurationWeeks: (projectRes.data.stage_duration_weeks as Record<string, number>) ?? {},
        },
        itemsByKey,
        subchecksByItem,
        responsibleByItem,
        roles,
        milestonesByStep,
        consultants,
        timelinePlanByStep,
        itemFilesByItem,
      };
    },
  });
}
