-- What visitors search for, so menus get added where people look first and
-- searches that find nothing show what is missing. No personal data: the text,
-- how many cafes matched, the site language, and a visitor hash that the app
-- server derives from the IP and a salt and that changes every day. The hash is
-- only used for the rate limit below.
create table public.search_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  query text not null check (char_length(query) between 1 and 60),
  results int not null check (results between 0 and 1000),
  menu_results int not null default 0 check (menu_results between 0 and 1000),
  action text not null check (action in ('typed', 'see_all', 'pick')),
  lang text not null check (lang in ('en', 'fil', 'hil')),
  visitor_hash text not null check (char_length(visitor_hash) = 32)
);
create index search_events_created_idx on public.search_events (created_at desc);
alter table public.search_events enable row level security;

-- 60 searches per visitor per hour and 3000 per hour overall.
create or replace function private.search_log_allowed(p_hash text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare per_visitor int; overall int;
begin
  select count(*) filter (where visitor_hash = p_hash), count(*)
    into per_visitor, overall
    from public.search_events where created_at > now() - interval '1 hour';
  return p_hash is not null and per_visitor < 60 and overall < 3000;
end;
$$;

create policy "visitors log searches within limits" on public.search_events
  for insert to anon, authenticated
  with check (private.search_log_allowed(visitor_hash));
create policy "admins read searches" on public.search_events
  for select to authenticated
  using (private.is_admin());
