import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { FILE_MAX_BYTES } from "./useItemFiles";

// Global (not per-project) — one office-attached form document per template item_key,
// visible and downloadable from every project. See src/template/agencies.ts and the
// migration script's note on why this rides separately from itemFiles.
export interface TemplateFileRecord {
  itemKey: string;
  storagePath: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
}

const TEMPLATE_FILES_QUERY_KEY = ["template-files"] as const;

export function useTemplateFiles() {
  return useQuery({
    queryKey: TEMPLATE_FILES_QUERY_KEY,
    queryFn: async (): Promise<Record<string, TemplateFileRecord>> => {
      const supabase = createClient();
      const { data, error } = await supabase.from("template_files").select("*");
      if (error) throw error;
      const byKey: Record<string, TemplateFileRecord> = {};
      (data ?? []).forEach((row) => {
        byKey[row.item_key] = {
          itemKey: row.item_key,
          storagePath: row.storage_path,
          fileName: row.file_name,
          fileType: row.file_type,
          fileSize: row.file_size,
        };
      });
      return byKey;
    },
  });
}

export function useUploadTemplateFile() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemKey, file }: { itemKey: string; file: File }) => {
      if (file.size > FILE_MAX_BYTES) {
        throw new Error("File is larger than 6MB.");
      }
      const path = `${itemKey}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from("template-files").upload(path, file, {
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase.from("template_files").upsert({
        item_key: itemKey,
        storage_path: path,
        file_name: file.name.slice(0, 200),
        file_type: file.type || null,
        file_size: file.size,
        updated_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEMPLATE_FILES_QUERY_KEY }),
  });
}

export function useRemoveTemplateFile() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemKey, storagePath }: { itemKey: string; storagePath: string }) => {
      const { error: removeError } = await supabase.storage.from("template-files").remove([storagePath]);
      if (removeError) throw removeError;
      const { error } = await supabase.from("template_files").delete().eq("item_key", itemKey);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEMPLATE_FILES_QUERY_KEY }),
  });
}
