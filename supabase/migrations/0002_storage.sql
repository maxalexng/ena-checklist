-- Storage buckets for real file attachments, replacing the prototype's inline base64
-- dataURLs. All private (no public URL access) — files are fetched via signed URLs
-- generated server-side for authenticated staff only.
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('item-files', 'item-files', false, 6291456),        -- 6MB, matches the prototype's own cap
  ('template-files', 'template-files', false, 6291456),
  ('milestone-files', 'milestone-files', false, 6291456)
on conflict (id) do nothing;

-- Same flat "any authenticated staff member" policy as the table RLS in 0001_init.sql.
create policy "authenticated_all_item_files"
  on storage.objects for all
  using (bucket_id = 'item-files' and auth.role() = 'authenticated')
  with check (bucket_id = 'item-files' and auth.role() = 'authenticated');

create policy "authenticated_all_template_files"
  on storage.objects for all
  using (bucket_id = 'template-files' and auth.role() = 'authenticated')
  with check (bucket_id = 'template-files' and auth.role() = 'authenticated');

create policy "authenticated_all_milestone_files"
  on storage.objects for all
  using (bucket_id = 'milestone-files' and auth.role() = 'authenticated')
  with check (bucket_id = 'milestone-files' and auth.role() = 'authenticated');
