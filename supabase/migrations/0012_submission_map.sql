-- Submission map, R21: the Overview tab's agency-by-agency map of the regulatory process
-- (URA OPP → PP → WP, each agency's DC → BP → TOP → CSC, all feeding BCA's overall
-- TOP/CSC). The map itself lives in code (src/template/submissionMap.ts) and most nodes
-- work out their own status from the checklist. This column holds only what can't be
-- derived: a manual status per node, keyed by node id, e.g.
--   { "nea-top": { "status": "done" }, "lta-csc": { "status": "na" } }
-- Each node is an object rather than a bare status so planned dates can sit beside the
-- status later without another migration.
--
-- Run this BEFORE deploying R21: the app reads this column on every project load.

alter table projects add column if not exists submission_map jsonb not null default '{}'::jsonb;

-- Atomic merge, same reasoning as 0003: two quick clicks on different nodes must not
-- overwrite each other. Merges one level deep (each node's own fields), and a null field
-- in the patch removes that field, so { "nea-top": { "status": null } } returns the node
-- to its automatic status.
create or replace function merge_submission_map(p_project_id uuid, p_patch jsonb)
returns void
language sql
as $$
  update projects p
  set submission_map = jsonb_strip_nulls(
    p.submission_map || (
      select coalesce(jsonb_object_agg(k, coalesce(p.submission_map -> k, '{}'::jsonb) || v), '{}'::jsonb)
      from jsonb_each(p_patch) as e(k, v)
    )
  )
  where p.id = p_project_id;
$$;

grant execute on function merge_submission_map(uuid, jsonb) to authenticated;
