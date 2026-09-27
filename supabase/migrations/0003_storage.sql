-- FORM Phase 1 — private reference-photo storage.
-- Bucket: reference-photos (PRIVATE — public must stay false).
-- Path convention (enforced here by policy, in the Edge Function, and by the
-- src/types helper):  {user_id}/{reference_image_id}/{filename}
-- Users may upload/read/update/delete only objects whose FIRST path segment
-- equals their auth.uid(). Access to another user's prefix is impossible.

-- 50 MiB cap per source photo; only camera-photo MIME types allowed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reference-photos',
  'reference-photos',
  false,
  52428800, -- 50 MiB in bytes
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public            = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- storage.foldername(name) returns the path segments; segment [1] is the user
-- id prefix. Comparing it to auth.uid() makes cross-user paths unreadable,
-- unwritable, and undeletable — including via signed-URL requests.

create policy "reference_photos_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'reference-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "reference_photos_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'reference-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "reference_photos_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'reference-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'reference-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "reference_photos_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'reference-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
