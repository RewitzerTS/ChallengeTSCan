create table public.partner_details (
  partner_id text primary key references public.partners(id) on delete cascade,
  contact_name text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  closed_by text not null default '',
  last_contact date,
  contract_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.partner_details (
  partner_id, contact_name, contact_phone, contact_email, closed_by, last_contact, contract_url, notes
)
select id, contact_name, contact_phone, contact_email, closed_by, last_contact, contract_url, notes
from public.partners
on conflict (partner_id) do nothing;

alter table public.partner_details enable row level security;

grant select, insert, update, delete on public.partner_details to authenticated;
grant select, insert, update, delete on public.partner_details to service_role;

create policy partner_details_select_manager
on public.partner_details
for select
to authenticated
using (coalesce((select auth.jwt()->'app_metadata'->>'role'), '') in ('clubManager','admin'));

create policy partner_details_insert_manager
on public.partner_details
for insert
to authenticated
with check (coalesce((select auth.jwt()->'app_metadata'->>'role'), '') in ('clubManager','admin'));

create policy partner_details_update_manager
on public.partner_details
for update
to authenticated
using (coalesce((select auth.jwt()->'app_metadata'->>'role'), '') in ('clubManager','admin'))
with check (coalesce((select auth.jwt()->'app_metadata'->>'role'), '') in ('clubManager','admin'));

create policy partner_details_delete_manager
on public.partner_details
for delete
to authenticated
using (coalesce((select auth.jwt()->'app_metadata'->>'role'), '') in ('clubManager','admin'));

create trigger partner_details_set_updated_at
before update on public.partner_details
for each row execute function private.set_updated_at();

alter table public.partners
  drop column contact_name,
  drop column contact_phone,
  drop column contact_email,
  drop column closed_by,
  drop column last_contact,
  drop column contract_url,
  drop column notes;
