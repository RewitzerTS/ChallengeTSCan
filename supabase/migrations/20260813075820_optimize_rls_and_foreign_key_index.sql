create index if not exists partners_created_by_idx on public.partners(created_by);

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
  or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);

drop policy if exists partners_select_by_role on public.partners;
create policy partners_select_by_role
on public.partners
for select
to authenticated
using (
  status = 'aktiv'
  or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') in ('clubManager','admin')
);

drop policy if exists partners_insert_manager on public.partners;
create policy partners_insert_manager
on public.partners
for insert
to authenticated
with check (
  coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') in ('clubManager','admin')
);

drop policy if exists partners_update_manager on public.partners;
create policy partners_update_manager
on public.partners
for update
to authenticated
using (
  coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') in ('clubManager','admin')
)
with check (
  coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') in ('clubManager','admin')
);

drop policy if exists partners_delete_manager on public.partners;
create policy partners_delete_manager
on public.partners
for delete
to authenticated
using (
  coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') in ('clubManager','admin')
);

drop policy if exists partner_details_select_manager on public.partner_details;
create policy partner_details_select_manager
on public.partner_details
for select
to authenticated
using (
  coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') in ('clubManager','admin')
);

drop policy if exists partner_details_insert_manager on public.partner_details;
create policy partner_details_insert_manager
on public.partner_details
for insert
to authenticated
with check (
  coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') in ('clubManager','admin')
);

drop policy if exists partner_details_update_manager on public.partner_details;
create policy partner_details_update_manager
on public.partner_details
for update
to authenticated
using (
  coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') in ('clubManager','admin')
)
with check (
  coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') in ('clubManager','admin')
);

drop policy if exists partner_details_delete_manager on public.partner_details;
create policy partner_details_delete_manager
on public.partner_details
for delete
to authenticated
using (
  coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'role'), '') in ('clubManager','admin')
);
