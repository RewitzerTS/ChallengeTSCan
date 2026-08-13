alter table public.partner_contact_history
  add column if not exists created_by_name text not null default '';
