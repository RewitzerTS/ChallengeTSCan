alter table public.partners drop constraint if exists partners_status_check;
update public.partners set status = 'ausstehend' where status = 'offen';
update public.partners set status = 'aktiv' where status = 'kritisch';
alter table public.partners add constraint partners_status_check check (status = any (array['aktiv'::text, 'offen'::text, 'ausstehend'::text]));
alter table public.partners alter column created_by set default auth.uid();

grant select, insert, update, delete on table public.partners to authenticated;
grant select, insert, update, delete on table public.partner_details to authenticated;

drop policy if exists partners_select_by_role on public.partners;
create policy partners_select_by_role on public.partners for select to authenticated
using (
  status = 'aktiv'
  or coalesce((select auth.jwt() -> 'app_metadata' ->> 'role'), '') = any (array['clubManager'::text, 'admin'::text])
  or (status = 'offen' and created_by = (select auth.uid()))
);