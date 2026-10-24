-- Kape Lokal initial schema.
-- Applied to the kape-lokal Supabase project (gfwnhqvcmqqobptrvcfd) on 2026-10-24.

create extension if not exists postgis with schema extensions;

-- Roles ---------------------------------------------------------------

create type public.app_role as enum ('admin', 'owner');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'owner',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

-- Cafes ---------------------------------------------------------------

create table public.cafes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description_en text,
  description_fil text,
  address text,
  city text not null default 'Iloilo City',
  location extensions.geography(point, 4326) not null,
  phone text,
  website text,
  facebook text,
  instagram text,
  opening_hours jsonb,           -- structured hours; shape decided with the admin form
  opening_hours_osm text,        -- raw OSM string, kept as the source of truth for imports
  cover_image_path text,
  is_chain boolean not null default false,
  is_published boolean not null default false,
  source text not null default 'manual' check (source in ('manual', 'osm', 'owner')),
  osm_id text unique,            -- e.g. 'node/123456'; null for hand-added cafes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cafes_location_idx on public.cafes using gist (location);
create index cafes_published_idx on public.cafes (is_published, is_chain);

create type public.cafe_tag as enum ('specialty_coffee', 'matcha', 'pastry', 'work_friendly', 'pet_friendly');

create table public.cafe_tags (
  cafe_id uuid not null references public.cafes (id) on delete cascade,
  tag public.cafe_tag not null,
  primary key (cafe_id, tag)
);

-- Menu ----------------------------------------------------------------

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes (id) on delete cascade,
  category text,
  name text not null,
  description text,
  price_php numeric(8, 2) check (price_php >= 0),
  is_available boolean not null default true,
  sort_order int not null default 0
);
create index menu_items_cafe_idx on public.menu_items (cafe_id);

create table public.menu_images (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes (id) on delete cascade,
  image_path text not null,
  sort_order int not null default 0
);
create index menu_images_cafe_idx on public.menu_images (cafe_id);

-- Owner claims and edit flags (used after launch) ---------------------

create type public.claim_status as enum ('pending', 'approved', 'rejected');

create table public.cafe_owners (
  user_id uuid not null references auth.users (id) on delete cascade,
  cafe_id uuid not null references public.cafes (id) on delete cascade,
  status public.claim_status not null default 'pending',
  created_at timestamptz not null default now(),
  primary key (user_id, cafe_id)
);
create index cafe_owners_cafe_idx on public.cafe_owners (cafe_id);

create table public.edit_flags (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes (id) on delete cascade,
  note text not null check (char_length(note) between 1 and 1000),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index edit_flags_cafe_idx on public.edit_flags (cafe_id);

-- Nearby search -------------------------------------------------------
-- Published cafes within p_radius_m meters, nearest first. Chains are
-- excluded unless p_include_chains is true.

create or replace function public.nearby_cafes(
  p_lat double precision,
  p_lng double precision,
  p_radius_m integer default 5000,
  p_include_chains boolean default false
)
returns table (
  id uuid,
  slug text,
  name text,
  lat double precision,
  lng double precision,
  distance_m double precision,
  is_chain boolean,
  tags public.cafe_tag[],
  has_menu boolean
)
language sql
stable
set search_path = ''
as $$
  select
    c.id,
    c.slug,
    c.name,
    extensions.st_y(c.location::extensions.geometry) as lat,
    extensions.st_x(c.location::extensions.geometry) as lng,
    extensions.st_distance(
      c.location,
      extensions.st_makepoint(p_lng, p_lat)::extensions.geography
    ) as distance_m,
    c.is_chain,
    coalesce(
      (select array_agg(t.tag) from public.cafe_tags t where t.cafe_id = c.id),
      '{}'
    ) as tags,
    (
      exists (select 1 from public.menu_items m where m.cafe_id = c.id)
      or exists (select 1 from public.menu_images i where i.cafe_id = c.id)
    ) as has_menu
  from public.cafes c
  where c.is_published
    and (p_include_chains or not c.is_chain)
    and extensions.st_dwithin(
      c.location,
      extensions.st_makepoint(p_lng, p_lat)::extensions.geography,
      p_radius_m
    )
  order by distance_m;
$$;

-- Row-level security --------------------------------------------------
-- Visitors read published data only. Admins can do everything. Owner
-- editing policies come with the owner portal after launch.

alter table public.profiles enable row level security;
alter table public.cafes enable row level security;
alter table public.cafe_tags enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_images enable row level security;
alter table public.cafe_owners enable row level security;
alter table public.edit_flags enable row level security;

create policy "own profile is readable" on public.profiles
  for select using (user_id = (select auth.uid()) or public.is_admin());
create policy "admins manage profiles" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

create policy "published cafes are public" on public.cafes
  for select using (is_published or public.is_admin());
create policy "admins manage cafes" on public.cafes
  for all using (public.is_admin()) with check (public.is_admin());

create policy "tags of published cafes are public" on public.cafe_tags
  for select using (
    exists (select 1 from public.cafes c where c.id = cafe_id and c.is_published)
    or public.is_admin()
  );
create policy "admins manage tags" on public.cafe_tags
  for all using (public.is_admin()) with check (public.is_admin());

create policy "menu items of published cafes are public" on public.menu_items
  for select using (
    exists (select 1 from public.cafes c where c.id = cafe_id and c.is_published)
    or public.is_admin()
  );
create policy "admins manage menu items" on public.menu_items
  for all using (public.is_admin()) with check (public.is_admin());

create policy "menu images of published cafes are public" on public.menu_images
  for select using (
    exists (select 1 from public.cafes c where c.id = cafe_id and c.is_published)
    or public.is_admin()
  );
create policy "admins manage menu images" on public.menu_images
  for all using (public.is_admin()) with check (public.is_admin());

create policy "owners see own claims" on public.cafe_owners
  for select using (user_id = (select auth.uid()) or public.is_admin());
create policy "admins manage claims" on public.cafe_owners
  for all using (public.is_admin()) with check (public.is_admin());

-- Anyone may report wrong info. Only admins read and resolve reports.
create policy "anyone can flag" on public.edit_flags
  for insert with check (true);
create policy "admins read and resolve flags" on public.edit_flags
  for select using (public.is_admin());
create policy "admins update flags" on public.edit_flags
  for update using (public.is_admin()) with check (public.is_admin());

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cafes_touch_updated_at
  before update on public.cafes
  for each row execute function public.touch_updated_at();
