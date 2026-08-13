alter table public.partners drop constraint if exists partners_status_check;
update public.partners set status = 'ausstehend' where status = 'offen';
update public.partners set status = 'aktiv' where status = 'kritisch';
alter table public.partners add constraint partners_status_check check (status = any (array['aktiv'::text, 'offen'::text, 'ausstehend'::text]));
alter table public.partners alter column created_by set default auth.uid();