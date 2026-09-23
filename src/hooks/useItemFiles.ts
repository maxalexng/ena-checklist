import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { projectDataQueryKey } from "./useProjectData";

export const FILE_MAX_BYTES = 6 * 1024 * 1024;
export const FILE_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function useProjectMutation<TVars>(projectId: string, mutationFn: (vars: TVars) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectDataQueryKey(projectId) }),
  });
}

export function useSetItemFileLink(projectId: string, itemId: string) {
  const supabase = createClient();
  return useProjectMutation<string>(projectId, async (link) => {
    const { error } = await supabase
      .from("item_files")
      .upsert({ item_id: itemId, link: link || null }, { onConflict: "item_id" });
    if (error) throw error;
  });
}

export function useUploadItemFile(projectId: string, itemId: string, itemKey: string) {
  const supabase = createClient();
  return useProjectMutation<File>(projectId, async (file) => {
    if (file.size > FILE_MAX_BYTES) {
      throw new Error("File is larger than 6MB — use the link field instead.");
    }
    const path = `${projectId}/${itemKey}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from("item-files").upload(path, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { error } = await supabase.from("item_files").upsert(
      {
        item_id: itemId,
        storage_path: path,
        file_name: file.name.slice(0, 200),
        file_type: file.type || null,
        file_size: file.size,
      },
      { onConflict: "item_id" }
    );
    if (error) throw error;
  });
}

export function useRemoveItemFile(projectId: string, itemId: string) {
  const supabase = createClient();
  return useProjectMutation<string | null>(projectId, async (storagePath) => {
    if (storagePath) {
      const { error: removeError } = await supabase.storage.from("item-files").remove([storagePath]);
      if (removeError) throw removeError;
    }
    const { error } = await supabase
      .from("item_files")
      .update({ storage_path: null, file_name: null, file_type: null, file_size: null })
      .eq("item_id", itemId);
    if (error) throw error;
  });
}

export async function openStorageFile(bucket: string, path: string) {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
  if (error || !data) throw error ?? new Error("Could not create signed URL");
  window.open(data.signedUrl, "_blank");
}
