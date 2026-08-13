create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  name text not null,
  role text not null check (role in ('employee','clubManager','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_username_lower_uidx on public.profiles (lower(username));

create table public.partners (
  id text primary key default gen_random_uuid()::text,
  type text not null check (type in ('firma','verein')),
  name text not null,
  contact_name text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  studio text not null default '',
  closed_by text not null default '',
  last_contact date,
  contract_url text not null default '',
  terms jsonb not null default '[]'::jsonb,
  has_transponder_fee boolean not null default false,
  has_service_fee boolean not null default false,
  conditions text not null default '',
  notes text not null default '',
  status text not null default 'aktiv' check (status in ('aktiv','offen','kritisch')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partners_type_idx on public.partners(type);
create index partners_studio_idx on public.partners(studio);
create index partners_status_idx on public.partners(status);
create index partners_name_lower_idx on public.partners(lower(name));

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger partners_set_updated_at
before update on public.partners
for each row execute function private.set_updated_at();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_name text;
  v_role text;
begin
  v_username := lower(coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(new.email, '@', 1)));
  v_name := coalesce(nullif(new.raw_user_meta_data->>'name',''), v_username);
  v_role := coalesce(nullif(new.raw_app_meta_data->>'role',''), 'employee');
  if v_role not in ('employee','clubManager','admin') then
    v_role := 'employee';
  end if;

  insert into public.profiles (id, username, name, role)
  values (new.id, v_username, v_name, v_role)
  on conflict (id) do update
    set username = excluded.username,
        name = excluded.name,
        role = excluded.role,
        updated_at = now();
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.partners enable row level security;

revoke all on public.profiles from anon;
revoke all on public.partners from anon;

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.partners to authenticated;

create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
  or coalesce((select auth.jwt()->'app_metadata'->>'role'), '') = 'admin'
);

create policy partners_select_by_role
on public.partners
for select
to authenticated
using (
  status = 'aktiv'
  or coalesce((select auth.jwt()->'app_metadata'->>'role'), '') in ('clubManager','admin')
);

create policy partners_insert_manager
on public.partners
for insert
to authenticated
with check (
  coalesce((select auth.jwt()->'app_metadata'->>'role'), '') in ('clubManager','admin')
);

create policy partners_update_manager
on public.partners
for update
to authenticated
using (
  coalesce((select auth.jwt()->'app_metadata'->>'role'), '') in ('clubManager','admin')
)
with check (
  coalesce((select auth.jwt()->'app_metadata'->>'role'), '') in ('clubManager','admin')
);

create policy partners_delete_manager
on public.partners
for delete
to authenticated
using (
  coalesce((select auth.jwt()->'app_metadata'->>'role'), '') in ('clubManager','admin')
);

insert into public.partners (
  id, type, name, contact_name, contact_phone, contact_email, studio, closed_by, last_contact,
  conditions, notes, status
) values
('p-1001','firma','Bosch GmbH','Mara Schneider','+49 711 811-4200','mara.schneider@bosch.com','Echterdingen','Clubleitung Echterdingen','2026-06-12','Firmenfitness 1 Monat 39 EUR, keine Startgebühr bei Mitarbeiterausweis.','Nachweis über Bosch Mitarbeiterausweis oder digitale Beschäftigungsbestätigung erforderlich.','aktiv'),
('p-1002','firma','Daimler Truck AG','Thomas Keller','+49 711 8485-233','fitness@daimlertruck.com','Leinfelden','Regionalleitung','2026-05-28','Firmenfitness Premium 12 Monate, 15 % Rabatt, Startpaket inklusive.','Quartalsweise Auswertung der aktiven Mitgliedschaften an HR senden.','aktiv'),
('p-1003','firma','Festo SE & Co. KG','Julia Berger','+49 711 347-0','j.berger@festo.com','Nürtingen','Studioleitung Nürtingen','2026-04-18','Firmenfitness Classic, 8 % Rabatt, Probemonat nach HR-Freigabe.','Kooperation soll im Juli 2026 neu bewertet werden.','offen'),
('p-1004','verein','VfL Pfullingen','Sven Maier','+49 7121 78033','geschaeftsstelle@vfl-pfullingen.de','Reutlingen','Clubleitung Reutlingen','2026-06-03','Vereinsfitness 12 % Rabatt, Team-Screening nach Terminvereinbarung.','Gilt für Mitglieder mit aktueller Vereinsbestätigung. Mannschaftsaktionen separat abstimmen.','aktiv'),
('p-1005','verein','TSV Leinfelden','Nadine Roth','+49 711 754240','info@tsv-leinfelden.de','Leinfelden','Studioleitung Leinfelden','2026-03-21','Vereinsfitness 10 % auf Laufzeitverträge, keine Aufnahmegebühr bei Vereinsnachweis.','Jugendliche nur mit regulärer Einverständniserklärung und Beratungstermin.','aktiv'),
('p-1006','verein','SV Salamander Kornwestheim','Patrick Braun','+49 7154 20245','partner@svkornwestheim.de','Kornwestheim','Clubleitung Kornwestheim','2026-02-15','Vereinskondition offen, Bestandstarif bis Neuverhandlung gültig.','Ansprechpartner wechselt im Sommer. Vertrag vor Verlängerung prüfen.','kritisch')
on conflict (id) do nothing;
