create table public.bootstrap_config (
  id boolean primary key default true check (id),
  setup_code_hash text not null,
  consumed_at timestamptz
);

alter table public.bootstrap_config enable row level security;
revoke all on public.bootstrap_config from anon, authenticated;
grant select, update on public.bootstrap_config to service_role;

insert into public.bootstrap_config (id, setup_code_hash)
values (true, 'ba4998fc7c3933956d2ee1c5281f4e4fa400e770851049f88d0bbbfee9ce3a96');
