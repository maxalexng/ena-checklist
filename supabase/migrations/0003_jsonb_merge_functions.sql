-- Atomic server-side merges for the three JSONB "settings blob" columns on `projects`
-- (project_dates, list_presets, stage_duration_weeks). Two rapid edits to different keys
-- of the same JSONB column — e.g. setting a date, then immediately adding an EOT row —
-- used to race under a client-side read-merge-write (read the column, merge in JS, write
-- the whole object back): the second write could read a snapshot from before the first
-- write had landed, silently reverting it. A single atomic `column = column || patch`
-- UPDATE, run inside Postgres, has no such window — concurrent updates to the same row
-- serialize at the row-lock level and each patch always applies on top of whatever the
-- previous one left behind, regardless of client-side timing.
create or replace function merge_project_dates(p_project_id uuid, p_patch jsonb)
returns void
language sql
as $$
  update projects set project_dates = project_dates || p_patch where id = p_project_id;
$$;

create or replace function merge_list_presets(p_project_id uuid, p_patch jsonb)
returns void
language sql
as $$
  update projects set list_presets = list_presets || p_patch where id = p_project_id;
$$;

create or replace function merge_stage_duration_weeks(p_project_id uuid, p_patch jsonb)
returns void
language sql
as $$
  update projects set stage_duration_weeks = stage_duration_weeks || p_patch where id = p_project_id;
$$;

-- SECURITY INVOKER (the default) — these run as the calling user, so the existing RLS
-- policy on `projects` (any authenticated user) still applies; the function is just a
-- vehicle for an atomic expression PostgREST's plain .update() can't express.
grant execute on function merge_project_dates(uuid, jsonb) to authenticated;
grant execute on function merge_list_presets(uuid, jsonb) to authenticated;
grant execute on function merge_stage_duration_weeks(uuid, jsonb) to authenticated;
