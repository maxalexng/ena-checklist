-- One step order shared by every project, while the office settles on a standard sequence.
-- Until now each project kept its own step_order/step_stage; from here the Checklist tab
-- reads and writes this single row instead, so a step moved on one project moves on all of
-- them. The per-project columns are left untouched (no longer read) so per-project ordering
-- can come back if needed. Once the order is final it gets baked into STEP_ORDER in
-- src/template/stepOrder.ts and this row can go.
--
-- Seeded from the 2 Astrid Hill project (ENA-21207, the long-titled one) — the order being
-- adopted as the starting point for everyone.
--
-- Run this BEFORE deploying: the app reads this table on every project load.

create table if not exists shared_settings (
  id          text primary key default 'global' check (id = 'global'),  -- single row
  step_order  jsonb,                                  -- string[] | null (null = template default order)
  step_stage  jsonb not null default '{}'::jsonb,     -- Record<stepKey, stageId> overrides
  updated_at  timestamptz not null default now()
);

alter table shared_settings enable row level security;

create policy "authenticated_all" on shared_settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

insert into shared_settings (id, step_order, step_stage)
select 'global', step_order, step_stage
from projects
where id = '541da629-8db4-4d57-b6d4-7062e44d3da9'
on conflict (id) do update
  set step_order = excluded.step_order, step_stage = excluded.step_stage, updated_at = now();

-- Still create the row if that project is gone, so the app always has one to read/write.
insert into shared_settings (id) values ('global') on conflict (id) do nothing;
