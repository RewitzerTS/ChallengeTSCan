create or replace function public.set_partner_creator()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.created_by is null and (select auth.uid()) is not null then
    new.created_by := (select auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists set_partner_creator_before_insert on public.partners;
create trigger set_partner_creator_before_insert
before insert on public.partners
for each row execute function public.set_partner_creator();
