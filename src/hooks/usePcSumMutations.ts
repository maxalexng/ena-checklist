import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { pcSumRows } from "@/lib/projects/createProject";
import {
  isLastProjectMutation,
  projectDataQueryKey,
  projectMutationKey,
  type PcSumEntry,
  type PcSumQuote,
  type ProjectChecklistData,
} from "./useProjectData";
import type { Database } from "@/lib/supabase/database.types";
import type { PcSumPhase } from "@/template/pcSums";
import { pcSumSwapTarget } from "@/lib/pcSums/pcSums";

type PcSumUpdate = Database["public"]["Tables"]["pc_sums"]["Update"];
type PcSumQuoteUpdate = Database["public"]["Tables"]["pc_sum_quotes"]["Update"];

/** Same write-then-refetch shape as useChecklistMutations, including its optional
 * `optimisticUpdate` for controls people click through quickly (the selection dropdown,
 * the confirmed and N/A checkboxes while running down the list with the client). */
function useProjectMutation<TVars>(
  projectId: string,
  mutationFn: (vars: TVars) => Promise<void>,
  options?: { optimisticUpdate?: (data: ProjectChecklistData, vars: TVars) => ProjectChecklistData }
) {
  const queryClient = useQueryClient();
  const queryKey = projectDataQueryKey(projectId);
  const mutationKey = projectMutationKey(projectId);
  return useMutation({
    mutationKey,
    mutationFn,
    onMutate: async (vars: TVars) => {
      if (!options?.optimisticUpdate) return undefined;
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ProjectChecklistData>(queryKey);
      if (previous) queryClient.setQueryData(queryKey, options.optimisticUpdate(previous, vars));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      const previous = (context as { previous?: ProjectChecklistData } | undefined)?.previous;
      if (previous) queryClient.setQueryData(queryKey, previous);
    },
    onSettled: () => {
      if (isLastProjectMutation(queryClient, projectId)) queryClient.invalidateQueries({ queryKey });
    },
  });
}

function currentPcSums(queryClient: ReturnType<typeof useQueryClient>, projectId: string): PcSumEntry[] {
  return queryClient.getQueryData<ProjectChecklistData>(projectDataQueryKey(projectId))?.pcSums ?? [];
}

/** Adds a blank row at the end of a phase (or unsorted, for null). */
export function useAddPcSum(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useProjectMutation<{ phase: PcSumPhase | null }>(projectId, async ({ phase }) => {
    const existing = currentPcSums(queryClient, projectId);
    const { error } = await supabase.from("pc_sums").insert({
      project_id: projectId,
      phase,
      sort_order: existing.reduce((max, r) => Math.max(max, r.sortOrder + 1), 0),
    });
    if (error) throw error;
  });
}

/** Loads the office's standard list into a project that has no PC sums yet (one created
 * before the schedule existed, or one whose list was cleared). */
export function useLoadStandardPcSums(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<void>(projectId, async () => {
    const { error } = await supabase.from("pc_sums").insert(pcSumRows(projectId));
    if (error) throw error;
  });
}

export type PcSumPatch = Partial<
  Pick<
    PcSumEntry,
    "item" | "selection" | "amount" | "clientConfirmed" | "na" | "note" | "phase" | "awardedAmount" | "awardedQuoteId"
  >
>;

export function useUpdatePcSum(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ id: string } & PcSumPatch>(
    projectId,
    async ({ id, item, selection, amount, clientConfirmed, na, note, phase, awardedAmount, awardedQuoteId }) => {
      const patch: PcSumUpdate = {};
      if (item !== undefined) patch.item = item;
      if (selection !== undefined) patch.selection = selection;
      if (amount !== undefined) patch.amount = amount;
      if (clientConfirmed !== undefined) patch.client_confirmed = clientConfirmed;
      if (na !== undefined) patch.na = na;
      if (note !== undefined) patch.note = note;
      if (phase !== undefined) patch.phase = phase;
      if (awardedAmount !== undefined) patch.awarded_amount = awardedAmount;
      if (awardedQuoteId !== undefined) patch.awarded_quote_id = awardedQuoteId;
      const { error } = await supabase.from("pc_sums").update(patch).eq("id", id);
      if (error) throw error;
    },
    {
      optimisticUpdate: (data, { id, ...patch }) => ({
        ...data,
        pcSums: data.pcSums.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      }),
    }
  );
}

export function useDeletePcSum(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ id: string }>(projectId, async ({ id }) => {
    const { error } = await supabase.from("pc_sums").delete().eq("id", id);
    if (error) throw error;
  });
}

/** Swaps a row with its neighbour within the same phase. */
export function useMovePcSum(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useProjectMutation<{ id: string; direction: -1 | 1 }>(projectId, async ({ id, direction }) => {
    const list = currentPcSums(queryClient, projectId);
    const a = list.find((r) => r.id === id);
    const b = pcSumSwapTarget(list, id, direction);
    if (!a || !b) return;
    const { error: e1 } = await supabase.from("pc_sums").update({ sort_order: b.sortOrder }).eq("id", a.id);
    if (e1) throw e1;
    const { error: e2 } = await supabase.from("pc_sums").update({ sort_order: a.sortOrder }).eq("id", b.id);
    if (e2) throw e2;
  });
}

// ── Supplier quotes ─────────────────────────────────────────────────────────

function mapQuotes(
  data: ProjectChecklistData,
  pcSumId: string,
  fn: (quotes: PcSumQuote[]) => PcSumQuote[]
): ProjectChecklistData {
  return { ...data, pcSums: data.pcSums.map((r) => (r.id === pcSumId ? { ...r, quotes: fn(r.quotes) } : r)) };
}

export function useAddPcSumQuote(projectId: string) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  return useProjectMutation<{ pcSumId: string }>(projectId, async ({ pcSumId }) => {
    const quotes = currentPcSums(queryClient, projectId).find((r) => r.id === pcSumId)?.quotes ?? [];
    const { error } = await supabase.from("pc_sum_quotes").insert({
      project_id: projectId,
      pc_sum_id: pcSumId,
      sort_order: quotes.reduce((max, q) => Math.max(max, q.sortOrder + 1), 0),
    });
    if (error) throw error;
  });
}

export type PcSumQuotePatch = Partial<Pick<PcSumQuote, "supplier" | "brand" | "amount" | "note">>;

export function useUpdatePcSumQuote(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ id: string; pcSumId: string } & PcSumQuotePatch>(
    projectId,
    async ({ id, supplier, brand, amount, note }) => {
      const patch: PcSumQuoteUpdate = {};
      if (supplier !== undefined) patch.supplier = supplier;
      if (brand !== undefined) patch.brand = brand;
      if (amount !== undefined) patch.amount = amount;
      if (note !== undefined) patch.note = note;
      const { error } = await supabase.from("pc_sum_quotes").update(patch).eq("id", id);
      if (error) throw error;
    },
    {
      optimisticUpdate: (data, { id, pcSumId, ...patch }) =>
        mapQuotes(data, pcSumId, (quotes) => quotes.map((q) => (q.id === id ? { ...q, ...patch } : q))),
    }
  );
}

/** Stars one quote as our recommendation (unstarring the item's others), or clears the
 * star with id null. */
export function useRecommendPcSumQuote(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ pcSumId: string; id: string | null }>(
    projectId,
    async ({ pcSumId, id }) => {
      const { error: e1 } = await supabase
        .from("pc_sum_quotes")
        .update({ recommended: false })
        .eq("pc_sum_id", pcSumId)
        .eq("recommended", true);
      if (e1) throw e1;
      if (id === null) return;
      const { error: e2 } = await supabase.from("pc_sum_quotes").update({ recommended: true }).eq("id", id);
      if (e2) throw e2;
    },
    {
      optimisticUpdate: (data, { pcSumId, id }) =>
        mapQuotes(data, pcSumId, (quotes) => quotes.map((q) => ({ ...q, recommended: q.id === id }))),
    }
  );
}

/** Removes a quote; if the item was awarded to it, the award's supplier is cleared (the
 * foreign key does the same server-side) but its amount is kept. */
export function useDeletePcSumQuote(projectId: string) {
  const supabase = createClient();
  return useProjectMutation<{ id: string; pcSumId: string }>(
    projectId,
    async ({ id }) => {
      const { error } = await supabase.from("pc_sum_quotes").delete().eq("id", id);
      if (error) throw error;
    },
    {
      optimisticUpdate: (data, { id, pcSumId }) => ({
        ...data,
        pcSums: data.pcSums.map((r) =>
          r.id === pcSumId
            ? {
                ...r,
                quotes: r.quotes.filter((q) => q.id !== id),
                awardedQuoteId: r.awardedQuoteId === id ? null : r.awardedQuoteId,
              }
            : r
        ),
      }),
    }
  );
}
