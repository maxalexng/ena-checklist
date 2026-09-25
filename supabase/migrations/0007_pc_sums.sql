-- PC (Prime Cost) sum schedule: one row per PC sum item, run through with the client
-- before the tender set is produced (template step admin__PCSUMS, R17). Ordered and
-- per-project, so it gets its own table like consultants rather than a JSONB column.
-- New projects are seeded from src/template/pcSums.ts by createProject(); a project
-- created before this table existed starts empty and loads the same list on demand.
--
-- Run this BEFORE deploying R17: the app reads this table on every project load.

create table if not exists pc_sums (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references projects(id) on delete cascade,
  item              text not null default '',
  supplier          text not null default '',   -- brand / supplier / model agreed
  -- Who the selection comes from: still to discuss, the client's own pick, or ours.
  selection         text not null default 'tbc' check (selection in ('tbc', 'client', 'recommended')),
  amount            numeric(12, 2),              -- PC sum allowance in S$, null = not set yet
  client_confirmed  boolean not null default false,
  na                boolean not null default false,  -- not part of this project
  note              text not null default '',
  sort_order        integer not null default 0
);

create index if not exists pc_sums_project_idx on pc_sums (project_id);

alter table pc_sums enable row level security;

create policy "authenticated_all" on pc_sums for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
