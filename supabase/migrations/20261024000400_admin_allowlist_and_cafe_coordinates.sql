-- Applied to the kape-lokal Supabase project on 2026-10-24.
--
-- Admins are people whose confirmed email is in private.admin_emails. The table starts
-- empty, so nobody is an admin until the owner adds their email:
--   insert into private.admin_emails (email) values ('you@example.com');
-- If that person has already signed in, also run:
--   insert into public.profiles (user_id, role)
--   select id, 'admin' from auth.users where lower(email) = lower('you@example.com')
--   on conflict (user_id) do update set role = 'admin';

create table private.admin_emails (email text primary key);
alter table private.admin_emails enable row level security;

create or replace function private.sync_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null
     and exists (select 1 from private.admin_emails a where lower(a.email) = lower(new.email)) then
    insert into public.profiles (user_id, role) values (new.id, 'admin')
    on conflict (user_id) do update set role = 'admin';
  end if;
  return new;
end;
$$;

create trigger on_auth_user_admin_sync
  after insert or update of email_confirmed_at on auth.users
  for each row execute function private.sync_admin_profile();

-- Readable coordinates for the admin form.
alter table public.cafes
  add column lat double precision generated always as (extensions.st_y(location::extensions.geometry)) stored,
  add column lng double precision generated always as (extensions.st_x(location::extensions.geometry)) stored;
