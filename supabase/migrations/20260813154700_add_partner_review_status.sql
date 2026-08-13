alter table public.partners drop constraint if exists partners_status_check;
alter table public.partners add constraint partners_status_check check (status = any (array['aktiv'::text,'offen'::text,'pruefung'::text,'ausstehend'::text]));
