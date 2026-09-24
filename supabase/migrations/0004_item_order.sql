-- Per-project override for the display/reorder position of checklist items within their
-- step — same shape and convention as step_order (a flat string[] of item ids; null means
-- "use the template's own order"). One flat array covering every step's items, since items
-- only ever reorder within their own step, never across steps.
alter table projects add column if not exists item_order jsonb;
