-- PC sum schedule, R20: phases, supplier quotes, and awards.
--
--  * phase: when on site the item has to be decided, so the schedule can be worked through
--    in construction order. Null = not sorted into a phase yet.
--  * pc_sum_quotes: the 2–3 supplier proposals put to the client for each item, one of
--    which can be starred as our recommendation. Replaces pc_sums.supplier, which is
--    carried over below as each row's first quote and no longer read by the app.
--  * awarded_quote_id / awarded_amount: who the item was finally awarded to and for how
--    much, so the awarded sum can be checked against the allowance.
--
-- Run this BEFORE deploying R20: the app reads these columns and the new table on every
-- project load.

alter table pc_sums add column if not exists phase text
  check (phase in ('structure', 'firstFix', 'envelope', 'finishes', 'fitout'));
alter table pc_sums add column if not exists awarded_amount numeric(12, 2);  -- S$, null = not awarded yet

create table if not exists pc_sum_quotes (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  pc_sum_id    uuid not null references pc_sums(id) on delete cascade,
  supplier     text not null default '',
  brand        text not null default '',     -- brand / model proposed
  amount       numeric(12, 2),               -- quoted S$, null = no figure yet
  note         text not null default '',
  recommended  boolean not null default false,
  sort_order   integer not null default 0
);

create index if not exists pc_sum_quotes_project_idx on pc_sum_quotes (project_id);
create index if not exists pc_sum_quotes_pc_sum_idx on pc_sum_quotes (pc_sum_id);

alter table pc_sum_quotes enable row level security;

drop policy if exists "authenticated_all" on pc_sum_quotes;
create policy "authenticated_all" on pc_sum_quotes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter table pc_sums add column if not exists awarded_quote_id uuid
  references pc_sum_quotes(id) on delete set null;

-- Carry each row's single supplier over as its first quote (once: skip rows that already
-- have quotes, so rerunning this file is harmless).
insert into pc_sum_quotes (project_id, pc_sum_id, supplier, recommended, sort_order)
select s.project_id, s.id, s.supplier, s.selection = 'recommended', 0
from pc_sums s
where trim(s.supplier) <> ''
  and not exists (select 1 from pc_sum_quotes q where q.pc_sum_id = s.id);

-- Sort existing rows into phases by title: the R19a standard list, and the original R17
-- list older projects were seeded with. Anything else stays unsorted.
update pc_sums s set phase = m.phase
from (values
  ('Vertical Transportation', 'structure'),
  ('Swimming Pool System', 'structure'),
  ('Water Feature System (including ponds)', 'structure'),
  ('Sump Pump Systems', 'structure'),
  ('Flood Barrier System', 'structure'),
  ('Rainwater Harvesting System', 'structure'),
  ('Emergency Backup Generators', 'structure'),
  ('Wine Cellar', 'structure'),
  ('Spa & Sauna', 'structure'),
  ('Air-Conditioning & Mechanical Ventilation', 'firstFix'),
  ('Water Heaters', 'firstFix'),
  ('Fire Alarm Systems', 'firstFix'),
  ('CCTV, Security & Intercom', 'firstFix'),
  ('Integrated Home Automation System', 'firstFix'),
  ('Audio Visual System', 'firstFix'),
  ('Electrical Switches & Power Points', 'firstFix'),
  ('Light Fittings & Fans', 'firstFix'),
  ('Solar Panels', 'firstFix'),
  ('EV Charging Point(s) (32A 3-Phase)', 'firstFix'),
  ('Acoustic Treatments', 'firstFix'),
  ('Glazing (windows, glass doors, shower, skylights)', 'envelope'),
  ('External Façade', 'envelope'),
  ('Metalworks', 'envelope'),
  ('Floor Finishes — Tiles', 'finishes'),
  ('Floor Finishes — Stone', 'finishes'),
  ('Floor Finishes — Timber', 'finishes'),
  ('Wall Finishes', 'finishes'),
  ('Ceiling Finishes', 'finishes'),
  ('Sanitary Wares & Fittings', 'finishes'),
  ('Ironmongery & Locksets', 'finishes'),
  ('Built-In Cabinetry (kitchen, bathroom, wardrobes, carpentry, interior design finishes)', 'fitout'),
  ('Kitchen Equipment & Appliances', 'fitout'),
  ('Curtains & Motorised Blinds', 'fitout'),
  ('Landscaping', 'fitout'),
  ('Automatic Sliding Gates', 'fitout'),
  -- R17 list
  ('Home lift', 'structure'),
  ('Swimming pool equipment & finishes', 'structure'),
  ('Air-conditioning units', 'firstFix'),
  ('Water heaters (storage / heat pump)', 'firstFix'),
  ('Decorative lighting fittings', 'firstFix'),
  ('Smart home / ELV (CCTV, intercom, alarm, Wi-Fi)', 'firstFix'),
  ('Solar PV system', 'firstFix'),
  ('Sanitary wares & fittings (WCs, basins, taps, showers)', 'finishes'),
  ('Shower screens & vanity mirrors', 'finishes'),
  ('Floor & wall tiles', 'finishes'),
  ('Natural stone (marble / granite)', 'finishes'),
  ('Timber / engineered timber flooring', 'finishes'),
  ('Door ironmongery & digital locks', 'finishes'),
  ('Kitchen cabinets & countertops', 'fitout'),
  ('Kitchen appliances (hob, hood, oven, fridge)', 'fitout'),
  ('Wardrobes & built-in carpentry', 'fitout'),
  ('Main gate & autogate system', 'fitout'),
  ('Landscaping & softscape', 'fitout')
) as m(item, phase)
where s.item = m.item and s.phase is null;
