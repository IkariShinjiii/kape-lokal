-- Applied to the kape-lokal Supabase project on 2026-10-24.
-- Adds: cafe exclusion (non-cafes, duplicates), the public list_cafes() function,
-- rate-limited reports and cafe suggestions, and the public cafe-media bucket.

alter table public.cafes
  add column is_excluded boolean not null default false,
  add column exclusion_reason text,
  add constraint cafes_excluded_not_published check (not (is_excluded and is_published));

create or replace function public.list_cafes()
returns table (
  id uuid,
  slug text,
  name text,
  address text,
  lat double precision,
  lng double precision,
  is_chain boolean,
  opening_hours_osm text,
  tags public.cafe_tag[],
  has_menu boolean
)
language sql
stable
set search_path = ''
as $$
  select
    c.id, c.slug, c.name, c.address,
    extensions.st_y(c.location::extensions.geometry),
    extensions.st_x(c.location::extensions.geometry),
    c.is_chain,
    c.opening_hours_osm,
    coalesce((select array_agg(t.tag) from public.cafe_tags t where t.cafe_id = c.id), '{}'),
    (exists (select 1 from public.menu_items m where m.cafe_id = c.id)
     or exists (select 1 from public.menu_images i where i.cafe_id = c.id))
  from public.cafes c
  where c.is_published and not c.is_excluded
  order by c.name;
$$;

alter table public.edit_flags add column reporter_hash text;
create index edit_flags_reporter_idx on public.edit_flags (reporter_hash, created_at);

create table public.cafe_suggestions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  address text check (char_length(address) <= 200),
  link text check (char_length(link) <= 300),
  note text check (char_length(note) <= 1000),
  reporter_hash text,
  status text not null default 'new' check (status in ('new', 'added', 'dismissed')),
  created_at timestamptz not null default now()
);
create index cafe_suggestions_reporter_idx on public.cafe_suggestions (reporter_hash, created_at);
alter table public.cafe_suggestions enable row level security;

-- Limits: 3 per visitor per hour and 60 per hour overall, per table.
-- The visitor hash is computed by the app server from the request IP, so a caller
-- who talks to the API directly can vary it. The overall cap still bounds the damage.
create or replace function private.report_allowed(p_table text, p_hash text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare per_visitor int; overall int;
begin
  if p_table = 'edit_flags' then
    select count(*) filter (where reporter_hash = p_hash), count(*)
      into per_visitor, overall
      from public.edit_flags where created_at > now() - interval '1 hour';
  else
    select count(*) filter (where reporter_hash = p_hash), count(*)
      into per_visitor, overall
      from public.cafe_suggestions where created_at > now() - interval '1 hour';
  end if;
  return p_hash is not null and per_visitor < 3 and overall < 60;
end;
$$;

alter policy "anyone can flag" on public.edit_flags
  with check (private.report_allowed('edit_flags', reporter_hash));

create policy "visitors can suggest within limits" on public.cafe_suggestions
  for insert with check (private.report_allowed('cafe_suggestions', reporter_hash));
create policy "admins read suggestions" on public.cafe_suggestions
  for select using (private.is_admin());
create policy "admins update suggestions" on public.cafe_suggestions
  for update using (private.is_admin()) with check (private.is_admin());

insert into storage.buckets (id, name, public)
values ('cafe-media', 'cafe-media', true)
on conflict (id) do nothing;

create policy "admins upload cafe media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cafe-media' and private.is_admin());
create policy "admins update cafe media" on storage.objects
  for update to authenticated
  using (bucket_id = 'cafe-media' and private.is_admin());
create policy "admins delete cafe media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cafe-media' and private.is_admin());
