-- PC sum schedule: a fourth selection, 'contract' — the item is fully specified in the
-- contract documents and priced within the contract sum, so it carries no PC sum allowance
-- (R19). The inline check from 0007 got Postgres's default name, pc_sums_selection_check.
--
-- Run this BEFORE deploying R19: picking "Specified in contract" fails until it's applied.

alter table pc_sums drop constraint if exists pc_sums_selection_check;
alter table pc_sums add constraint pc_sums_selection_check
  check (selection in ('tbc', 'client', 'recommended', 'contract'));
