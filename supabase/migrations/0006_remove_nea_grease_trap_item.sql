-- Template R11a removed NEA ENV's "Grease trap maintenance declaration" item (index 2).
-- Item keys are positional (`${stepKey}__${index}`), so the two items after it moved down
-- a slot in the template: nea__ENV__3 -> nea__ENV__2 (construction noise permit) and
-- nea__ENV__4 -> nea__ENV__3 (vector control). Without this, existing projects would show
-- the grease trap row's status under "noise permit", and so on down the step.
--
-- Run once, right AFTER deploying R11a. If the old code is still running afterwards, it
-- would lazily backfill a fresh nea__ENV__4 row for each project it opens (see
-- reconcileItems.ts), and a second run of this file would then shift the keys again.
-- Only projects still in the old layout (i.e. that still have nea__ENV__4) are touched.

begin;

-- Drops the removed item; its item_responsible / item_subchecks / item_files cascade.
delete from checklist_items
where item_key = 'nea__ENV__2'
  and project_id in (select project_id from checklist_items where item_key = 'nea__ENV__4');

-- One key at a time: unique (project_id, item_key) is checked per row, not per statement.
update checklist_items set item_key = 'nea__ENV__2'
where item_key = 'nea__ENV__3'
  and project_id in (select project_id from checklist_items where item_key = 'nea__ENV__4');

update checklist_items set item_key = 'nea__ENV__3'
where item_key = 'nea__ENV__4';

-- Saved per-project item orders (flat string[] of item keys, null = template order).
update projects set item_order = (
  select coalesce(jsonb_agg(
    case e when 'nea__ENV__3' then 'nea__ENV__2'
           when 'nea__ENV__4' then 'nea__ENV__3'
           else e end
    order by ord), '[]'::jsonb)
  from jsonb_array_elements_text(item_order) with ordinality as t(e, ord)
  where e <> 'nea__ENV__2'
)
where item_order ? 'nea__ENV__4';

-- Global office template documents, keyed the same way. Not project-scoped, so there's no
-- "still in the old layout" check here; it had no nea__ENV__* rows when this was written.
delete from template_files where item_key = 'nea__ENV__2';
update template_files set item_key = 'nea__ENV__2' where item_key = 'nea__ENV__3';
update template_files set item_key = 'nea__ENV__3' where item_key = 'nea__ENV__4';

commit;
