// Hand-written to match supabase/migrations/0001_init.sql + 0002_storage.sql until a real
// Supabase project exists to generate from. Once linked (see README "Supabase setup"),
// regenerate with:
//   npm run gen-types
// and this file (including this comment) will be overwritten — that's expected.

export interface ProjectDates {
  contractStart: string;
  practicalCompletion: string;
  practicalCompletionNote: string;
  contractSigned: string;
  loaSigned: string;
  loaBasisType: "months" | "approval";
  loaBasisMonths: string;
  startAiRef: string;
  eot: { title: string; days: number }[];
}

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          reference: string;
          title: string;
          address: string;
          initialism: string;
          bca_ref: string;
          contract_period_months: number | null;
          contract_sum: string;
          current_stage: string;
          project_dates: ProjectDates;
          pp_validity_months: string;
          list_presets: Record<string, string[]>;
          step_order: string[] | null;
          overview_section_order: string[] | null;
          step_stage: Record<string, string>;
          stage_duration_weeks: Record<string, number>;
          assignments_locked: boolean;
          archived: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["projects"]["Row"]> & {
          reference: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
        Relationships: [];
      };
      checklist_items: {
        Row: {
          id: string;
          project_id: string;
          item_key: string;
          step_key: string;
          agency_id: string;
          status: "pending" | "progress" | "submitted" | "cleared";
          na: boolean;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["checklist_items"]["Row"]> & {
          project_id: string;
          item_key: string;
          step_key: string;
          agency_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["checklist_items"]["Row"]>;
        Relationships: [];
      };
      item_subchecks: {
        Row: { item_id: string; checklist_idx: number; checked: boolean };
        Insert: Database["public"]["Tables"]["item_subchecks"]["Row"];
        Update: Partial<Database["public"]["Tables"]["item_subchecks"]["Row"]>;
        Relationships: [];
      };
      item_responsible: {
        Row: {
          id: string;
          item_id: string;
          role_id: string;
          note: string;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["item_responsible"]["Row"]> & {
          item_id: string;
          role_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["item_responsible"]["Row"]>;
        Relationships: [];
      };
      milestones: {
        Row: {
          id: string;
          project_id: string;
          step_key: string;
          type: string;
          date: string | null;
          note: string;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["milestones"]["Row"]> & {
          project_id: string;
          step_key: string;
          type: string;
        };
        Update: Partial<Database["public"]["Tables"]["milestones"]["Row"]>;
        Relationships: [];
      };
      project_roles: {
        Row: { id: string; project_id: string; name: string; color: string; sort_order: number };
        Insert: Partial<Database["public"]["Tables"]["project_roles"]["Row"]> & {
          project_id: string;
          name: string;
          color: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_roles"]["Row"]>;
        Relationships: [];
      };
      consultants: {
        Row: {
          id: string;
          project_id: string;
          company: string;
          role_id: string | null;
          date_signed: string | null;
          note: string;
          sort_order: number;
        };
        Insert: Partial<Database["public"]["Tables"]["consultants"]["Row"]> & {
          project_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["consultants"]["Row"]>;
        Relationships: [];
      };
      timeline_plan: {
        Row: {
          project_id: string;
          step_key: string;
          start_date: string | null;
          end_date: string | null;
        };
        Insert: Database["public"]["Tables"]["timeline_plan"]["Row"];
        Update: Partial<Database["public"]["Tables"]["timeline_plan"]["Row"]>;
        Relationships: [];
      };
      item_files: {
        Row: {
          item_id: string;
          link: string | null;
          storage_path: string | null;
          file_name: string | null;
          file_type: string | null;
          file_size: number | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["item_files"]["Row"]> & { item_id: string };
        Update: Partial<Database["public"]["Tables"]["item_files"]["Row"]>;
        Relationships: [];
      };
      template_files: {
        Row: {
          item_key: string;
          storage_path: string;
          file_name: string;
          file_type: string | null;
          file_size: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["template_files"]["Row"]> & {
          item_key: string;
          storage_path: string;
          file_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["template_files"]["Row"]>;
        Relationships: [];
      };
      milestone_files: {
        Row: {
          milestone_id: string;
          storage_path: string;
          file_name: string;
          file_type: string | null;
          file_size: number | null;
        };
        Insert: Database["public"]["Tables"]["milestone_files"]["Row"];
        Update: Partial<Database["public"]["Tables"]["milestone_files"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
