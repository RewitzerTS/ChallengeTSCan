alter table public.partners
  add column if not exists archived_at timestamptz null,
  add column if not exists archived_reason text null,
  add column if not exists archived_status text null;

create table if not exists public.partner_contact_history (
  id bigint generated always as identity primary key,
  partner_id text not null references public.partners(id) on delete cascade,
  contacted_at timestamptz not null default now(),
  contact_type text not null default 'other' check (contact_type in ('phone','email','personal','other')),
  note text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists partner_contact_history_partner_contacted_idx on public.partner_contact_history(partner_id, contacted_at desc);
alter table public.partner_contact_history enable row level security;

grant select, insert, update, delete on public.partner_contact_history to authenticated;
grant select, insert, update, delete on public.partner_contact_history to service_role;
grant usage, select on sequence public.partner_contact_history_id_seq to authenticated, service_role;

create policy "partner_contact_history_select_manager" on public.partner_contact_history for select to authenticated using (coalesce((select auth.jwt()->'app_metadata'->>'role'),'') = any(array['clubManager','admin']));
create policy "partner_contact_history_insert_manager" on public.partner_contact_history for insert to authenticated with check (coalesce((select auth.jwt()->'app_metadata'->>'role'),'') = any(array['clubManager','admin']) and created_by = (select auth.uid()));
create policy "partner_contact_history_update_manager" on public.partner_contact_history for update to authenticated using (coalesce((select auth.jwt()->'app_metadata'->>'role'),'') = any(array['clubManager','admin'])) with check (coalesce((select auth.jwt()->'app_metadata'->>'role'),'') = any(array['clubManager','admin']));
create policy "partner_contact_history_delete_manager" on public.partner_contact_history for delete to authenticated using (coalesce((select auth.jwt()->'app_metadata'->>'role'),'') = any(array['clubManager','admin']));

drop policy if exists partners_select_by_role on public.partners;
create policy "partners_select_by_role" on public.partners for select to authenticated using (
  archived_at is null and (
    status = 'aktiv'
    or coalesce((select auth.jwt()->'app_metadata'->>'role'),'') = any(array['clubManager','admin'])
    or created_by = (select auth.uid())
  )
  or (archived_at is not null and coalesce((select auth.jwt()->'app_metadata'->>'role'),'') = 'admin')
);
