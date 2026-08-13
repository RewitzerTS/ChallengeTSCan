drop trigger if exists on_auth_user_metadata_updated on auth.users;

create trigger on_auth_user_metadata_updated
after update of email, raw_user_meta_data, raw_app_meta_data on auth.users
for each row
when (
  old.email is distinct from new.email
  or old.raw_user_meta_data is distinct from new.raw_user_meta_data
  or old.raw_app_meta_data is distinct from new.raw_app_meta_data
)
execute function private.handle_new_user();

insert into public.profiles (id, username, name, role)
select
  u.id,
  lower(coalesce(nullif(u.raw_user_meta_data->>'username',''), split_part(u.email, '@', 1))),
  coalesce(
    nullif(u.raw_user_meta_data->>'name',''),
    lower(coalesce(nullif(u.raw_user_meta_data->>'username',''), split_part(u.email, '@', 1)))
  ),
  case
    when u.raw_app_meta_data->>'role' in ('employee','clubManager','admin') then u.raw_app_meta_data->>'role'
    else 'employee'
  end
from auth.users u
where u.email like '%@challenge.topsports.fitness'
on conflict (id) do update
set username = excluded.username,
    name = excluded.name,
    role = excluded.role,
    updated_at = now();
