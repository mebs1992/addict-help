-- ============================================================================
-- Migration 0003: Storage bucket for Future Self / goal images (Feature 6)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('future-self', 'future-self', true)
on conflict (id) do nothing;

-- Anyone can read (bucket is public); only owners can write to their folder.
-- Convention: objects are stored under "<user_id>/<filename>".
create policy "future_self_read"
  on storage.objects for select
  using (bucket_id = 'future-self');

create policy "future_self_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'future-self'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "future_self_update_own"
  on storage.objects for update
  using (
    bucket_id = 'future-self'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "future_self_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'future-self'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
