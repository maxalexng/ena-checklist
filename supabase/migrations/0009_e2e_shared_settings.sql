-- A second shared_settings row for the browser tests. They run against this same database,
-- and specs that move steps or need the template's default order used to reset and restore
-- the 'global' row. Real projects saw their steps jump around for the length of a test run,
-- and a step moved during a run was undone when the tests put the saved order back.
-- The app now reads the 'e2e' row only in a session carrying the test cookie
-- (src/hooks/useProjectData.ts sharedSettingsId); everyone else keeps using 'global'.

alter table shared_settings drop constraint if exists shared_settings_id_check;
alter table shared_settings add constraint shared_settings_id_check check (id in ('global', 'e2e'));

insert into shared_settings (id) values ('e2e') on conflict (id) do nothing;
