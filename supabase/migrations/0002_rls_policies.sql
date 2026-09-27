-- FORM Phase 1 — Row Level Security.
-- Default rule: an authenticated user may SELECT/INSERT/UPDATE/DELETE only rows
-- whose owner is auth.uid(). Anonymous/public principals get no policies at all,
-- so with RLS enabled they can see zero rows. No service_role policies —
-- the service role bypasses RLS at the platform level for trusted server code.

alter table public.profiles              enable row level security;
alter table public.style_preferences     enable row level security;
alter table public.user_reference_images enable row level security;
alter table public.user_events           enable row level security;

-- profiles: the row's primary key IS the owner (profiles.id = auth.users.id),
-- so the same predicate covers USING (existing rows) and WITH CHECK (writes
-- cannot create or move ownership to another user).
create policy "profiles_all_own"
  on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Dependent tables: user_id must equal auth.uid() on every operation.
-- WITH CHECK also blocks re-parenting a row to another user via UPDATE.
create policy "style_preferences_all_own"
  on public.style_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_reference_images_all_own"
  on public.user_reference_images
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_events_all_own"
  on public.user_events
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
