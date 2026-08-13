create policy bootstrap_config_no_client_access
on public.bootstrap_config
for all
to authenticated
using (false)
with check (false);
