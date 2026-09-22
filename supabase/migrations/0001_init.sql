-- ENA Submissions Register — initial schema.
-- See docs/plan (or the conversation that produced this repo) for the normalize-vs-JSONB
-- rationale: normalize anything that needs ordering, is a plausible cross-project rollup
-- query, or is a natural Realtime unit; keep small single-object per-project settings as
-- JSONB on the `projects` row itself.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------------------
create table projects (
  id                      uuid primary key default gen_random_uuid(),
  reference               text not null,               -- "ENA-21207"
  title                   text not null default '',
  address                 text not null default '',
  initialism              text not null default '',
  bca_ref                 text not null default '',
  contract_period_months  integer,
  contract_sum            text not null default '',    -- free-text in the prototype (e.g. "S$34,000,000.00")
  current_stage           text not null default 'pre-design',

  -- Single cohesive settings objects, edited wholesale via one form/panel each — see
  -- schema rationale above for why these stay JSONB rather than their own tables.
  project_dates           jsonb not null default '{
    "contractStart": "", "practicalCompletion": "", "practicalCompletionNote": "",
    "contractSigned": "", "loaSigned": "", "loaBasisType": "months", "loaBasisMonths": "3",
    "startAiRef": "", "eot": []
  }'::jsonb,
  pp_validity_months      text not null default '',
  list_presets            jsonb not null default '{}'::jsonb,       -- Record<stepKey, string[]>
  step_order              jsonb,                                    -- string[] | null (null = template default order)
  overview_section_order  jsonb,                                    -- string[] | null (null = template default order)
  step_stage              jsonb not null default '{}'::jsonb,       -- Record<stepKey, stageId> overrides
  stage_duration_weeks    jsonb not null default '{}'::jsonb,       -- Record<stageId, number>
  assignments_locked      boolean not null default false,

  archived                boolean not null default false,
  created_at              timestamptz not null default now(),
  created_by              uuid references auth.users(id)
);

create index projects_reference_idx on projects (reference);

-- ---------------------------------------------------------------------------------------
-- checklist_items — the unit almost everything else keys on.
-- ---------------------------------------------------------------------------------------
create table checklist_items (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  item_key    text not null,        -- "bca__ST__0" — derived from the template, stable
  step_key    text not null,        -- "bca__ST" — denormalized for cheap per-step queries
  agency_id   text not null,        -- denormalized for a firm-wide "by agency" view
  status      text not null default 'pending' check (status in ('pending','progress','submitted','cleared')),
  na          boolean not null default false,
  updated_at  timestamptz not null default now(),
  unique (project_id, item_key)
);

create index checklist_items_project_idx on checklist_items (project_id);
create index checklist_items_status_idx on checklist_items (status) where not na;
create index checklist_items_agency_idx on checklist_items (agency_id);

-- Sparse checkbox state for items with a nested `checklist: string[]`.
create table item_subchecks (
  item_id        uuid not null references checklist_items(id) on delete cascade,
  checklist_idx  integer not null,
  checked        boolean not null default true,
  primary key (item_id, checklist_idx)
);

-- Responsible-party assignments: multiple per item, each with its own note.
create table item_responsible (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references checklist_items(id) on delete cascade,
  role_id     uuid not null,        -- references project_roles(id) — see below; no FK across
                                     -- tables created in the same migration to keep ordering
                                     -- simple, added as a constraint after project_roles exists.
  note        text not null default '',
  sort_order  integer not null default 0
);

create index item_responsible_item_idx on item_responsible (item_id);

-- ---------------------------------------------------------------------------------------
-- milestones — the "submission log" entries per step (PP Submitted -> WP Granted, etc.)
-- ---------------------------------------------------------------------------------------
create table milestones (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  step_key    text not null,
  type        text not null,
  date        date,
  note        text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index milestones_project_step_idx on milestones (project_id, step_key);

-- ---------------------------------------------------------------------------------------
-- project_roles — reorder/rename/recolor only, no delete (enforced at the app layer).
-- ---------------------------------------------------------------------------------------
create table project_roles (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  color       text not null,
  sort_order  integer not null default 0
);

create index project_roles_project_idx on project_roles (project_id);

alter table item_responsible
  add constraint item_responsible_role_fk foreign key (role_id) references project_roles(id);

-- ---------------------------------------------------------------------------------------
-- consultants — flat ordered list, referencing this project's own roles.
-- ---------------------------------------------------------------------------------------
create table consultants (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  company      text not null default '',
  role_id      uuid references project_roles(id),
  date_signed  date,
  note         text not null default '',
  sort_order   integer not null default 0
);

create index consultants_project_idx on consultants (project_id);

-- ---------------------------------------------------------------------------------------
-- timeline_plan — planned {start,end} window per curated Timeline-tab step.
-- ---------------------------------------------------------------------------------------
create table timeline_plan (
  project_id  uuid not null references projects(id) on delete cascade,
  step_key    text not null,
  start_date  date,
  end_date    date,
  primary key (project_id, step_key)
);

-- ---------------------------------------------------------------------------------------
-- Files — metadata only; bytes live in Supabase Storage (buckets created separately,
-- see supabase/migrations/0002_storage.sql).
-- ---------------------------------------------------------------------------------------
create table item_files (
  item_id       uuid primary key references checklist_items(id) on delete cascade,
  link          text,
  storage_path  text,
  file_name     text,
  file_type     text,
  file_size     bigint,
  updated_at    timestamptz not null default now()
);

-- Global (not per-project) office template/form documents, keyed by the template's own
-- item_key — not an FK to checklist_items, since it must exist independent of any project.
create table template_files (
  item_key      text primary key,
  storage_path  text not null,
  file_name     text not null,
  file_type     text,
  file_size     bigint,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users(id)
);

create table milestone_files (
  milestone_id  uuid primary key references milestones(id) on delete cascade,
  storage_path  text not null,
  file_name     text not null,
  file_type     text,
  file_size     bigint
);

-- ---------------------------------------------------------------------------------------
-- Row Level Security — firm-staff-only, flat policy (no per-project ACLs for v1).
-- Any authenticated user can read/write any row. Tightening to per-project ACLs later is
-- additive: add a project_members table and swap these policies for a join-based check.
-- ---------------------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'projects', 'checklist_items', 'item_subchecks', 'item_responsible', 'milestones',
    'project_roles', 'consultants', 'timeline_plan', 'item_files', 'template_files',
    'milestone_files'
  ])
  loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'create policy "authenticated_all" on %I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'');',
      t
    );
  end loop;
end $$;
