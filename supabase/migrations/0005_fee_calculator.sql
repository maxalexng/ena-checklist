-- Per-project inputs for the Fee Calculator tab (Step 1 inputs from the office's own
-- New_Erection_Reconstruction_Sub_Fee_Calculator spreadsheet) — a single JSONB object
-- edited as a whole, same convention as project_dates. Merged atomically via the RPC
-- below rather than a client-side read-merge-write, for the same reason project_dates
-- and list_presets already are (see 0003_jsonb_merge_functions.sql) — two rapid edits to
-- different fields of this same form could otherwise race and silently drop one.
alter table projects add column if not exists fee_calculator_inputs jsonb not null default '{}'::jsonb;

create or replace function merge_fee_calculator_inputs(p_project_id uuid, p_patch jsonb)
returns void
language sql
as $$
  update projects
  set fee_calculator_inputs = fee_calculator_inputs || p_patch
  where id = p_project_id;
$$;

grant execute on function merge_fee_calculator_inputs(uuid, jsonb) to authenticated;
