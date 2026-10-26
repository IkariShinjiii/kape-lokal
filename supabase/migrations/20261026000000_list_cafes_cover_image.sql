-- The map's hover preview shows the cafe's cover photo, so list_cafes returns it too.
-- The return type changes, so the function is recreated (existing callers ignore the
-- extra column).
drop function if exists public.list_cafes();

create function public.list_cafes()
returns table(
  id uuid, slug text, name text, address text,
  lat double precision, lng double precision,
  is_chain boolean, opening_hours_osm text,
  tags cafe_tag[], has_menu boolean, cover_image_path text
)
language sql
stable
set search_path to ''
as $$
  select
    c.id, c.slug, c.name, c.address,
    extensions.st_y(c.location::extensions.geometry),
    extensions.st_x(c.location::extensions.geometry),
    c.is_chain,
    c.opening_hours_osm,
    coalesce((select array_agg(t.tag) from public.cafe_tags t where t.cafe_id = c.id), '{}'),
    (exists (select 1 from public.menu_items m where m.cafe_id = c.id)
     or exists (select 1 from public.menu_images i where i.cafe_id = c.id)),
    c.cover_image_path
  from public.cafes c
  where c.is_published and not c.is_excluded
  order by c.name;
$$;

grant execute on function public.list_cafes() to anon, authenticated, service_role;
