-- Applied to the kape-lokal Supabase project on 2026-10-24 (data fixes after the first OSM import).

update public.cafes set is_excluded = true, exclusion_reason = 'Not a cafe'
where osm_id in ('node/3764685449', 'node/8903396536', 'way/398949664', 'node/10907545584');

update public.cafes set is_excluded = true, exclusion_reason = 'Duplicate of node/13979096052'
where osm_id = 'node/13979346001';

-- Mostly Matcha is filed under shop=tea in OSM, so the first import missed it.
insert into public.cafes (slug, name, address, location, instagram, osm_id, source)
values ('mostly-matcha', 'Mostly Matcha', 'Fajardo Street',
        extensions.st_makepoint(122.5548916, 10.7273038)::extensions.geography,
        'mostlymatcha_', 'node/12909126401', 'osm')
on conflict (osm_id) do nothing;

insert into public.cafe_tags (cafe_id, tag)
select id, 'matcha' from public.cafes where osm_id = 'node/12909126401'
on conflict do nothing;
