-- Corrections from the 2026-10-25 Google Maps audit.
-- APPLIED on 2026-10-26 through the Supabase SQL editor (28 published afterwards).
-- Kept for the record; do not run again.
-- Pins are Google Maps place coordinates; every one is within 150 m of the OSM
-- point except where a comment says otherwise. Hours are in OSM format, which is
-- what the app displays.

begin;

-- 1. Chapter Coffee: Google's pin matches the La Paz row (afa10c9b), not the
--    Prime Estate row (c4ff0332, 485 m away, already unpublished).
update public.cafes set is_excluded = true,
  exclusion_reason = 'Duplicate of Chapter Coffee La Paz (Google Maps pin is 485 m away)'
where left(id::text, 8) = 'c4ff0332';
update public.cafes set
  address = 'Commercial Avenue, Block 4 Lot 2, Prime Estates, La Paz',
  phone = '0966 216 3412', website = 'https://chaptercoffee.shop',
  opening_hours_osm = 'Mo-Fr 11:00-21:00; Sa,Su 07:00-21:00',
  location = ST_SetSRID(ST_MakePoint(122.5601457, 10.7027174), 4326)::geography,
  is_published = true
where left(id::text, 8) = 'afa10c9b';

-- 2. Kai Royal Cafe: the OSM pin was 4 km off (in Jaro); Google has it in Molo.
--    Currently unpublished. Hours run past midnight.
update public.cafes set
  location = ST_SetSRID(ST_MakePoint(122.5544433, 10.6983385), 4326)::geography,
  opening_hours_osm = 'Mo-Su 08:00-02:30', is_published = true
where left(id::text, 8) = 'e4d22a54';

-- 3. Pins and hours for cafes already published.
update public.cafes set location = ST_SetSRID(ST_MakePoint(122.5673279, 10.6977086), 4326)::geography,
  opening_hours_osm = 'Mo-Sa 09:00-18:00' where left(id::text, 8) = 'b5bbd10e';            -- Cicada
update public.cafes set location = ST_SetSRID(ST_MakePoint(122.5594245, 10.7204615), 4326)::geography,
  opening_hours_osm = 'Mo-Su 07:30-22:00' where left(id::text, 8) = '2542a993';            -- Coffee Brewtherhood
update public.cafes set location = ST_SetSRID(ST_MakePoint(122.5517585, 10.6961753), 4326)::geography,
  opening_hours_osm = 'Mo-Fr 09:00-19:00; Sa 10:00-17:00',
  address = 'Timawa Street, Molo', phone = '0962 347 7248' where left(id::text, 8) = '35217c2f'; -- D' Cupp
update public.cafes set location = ST_SetSRID(ST_MakePoint(122.5497537, 10.7086171), 4326)::geography,
  opening_hours_osm = 'Mo-Sa 10:00-20:00',
  address = 'Donato Pison Avenue, San Rafael, Mandurriao', phone = '(033) 321 5229' where left(id::text, 8) = '6908875a'; -- Dessert in the Sky
update public.cafes set location = ST_SetSRID(ST_MakePoint(122.5705277, 10.6949916), 4326)::geography,
  opening_hours_osm = 'Mo-Su 06:00-21:30' where left(id::text, 8) = '75532584';            -- Harbor Town Cafe
update public.cafes set location = ST_SetSRID(ST_MakePoint(122.5444654, 10.718136), 4326)::geography,
  address = '45 Q. Abeto Street, Mandurriao', phone = '0945 978 6995',
  website = 'https://healthykitchen.com.ph' where left(id::text, 8) = '00e2fe2b';          -- Healthy Kitchen Cafe
update public.cafes set location = ST_SetSRID(ST_MakePoint(122.5486563, 10.7069894), 4326)::geography,
  opening_hours_osm = 'Mo-Su 06:00-21:00',
  address = 'Unit 8 & 9, Shops at Atria, Donato Pison Avenue, Mandurriao',
  phone = '0917 148 6141' where left(id::text, 8) = 'b39523fb';                              -- House of Monkeys
update public.cafes set location = ST_SetSRID(ST_MakePoint(122.5245856, 10.6883231), 4326)::geography,
  opening_hours_osm = 'Mo-Su 08:00-20:00' where left(id::text, 8) = 'c9630b04';            -- Iloilo Coffee House
update public.cafes set location = ST_SetSRID(ST_MakePoint(122.5157308, 10.6820493), 4326)::geography
  where left(id::text, 8) = 'a68a497b';                                                     -- Kabuki Cafe (133 m)
update public.cafes set location = ST_SetSRID(ST_MakePoint(122.5487874, 10.7064908), 4326)::geography,
  opening_hours_osm = 'Mo-Su 10:00-21:00',
  address = 'Shops at Atria, Donato Pison Avenue, San Rafael, Mandurriao',
  phone = '(033) 501 6673' where left(id::text, 8) = '889f9940';                            -- Madge Cafe (Atria)
update public.cafes set location = ST_SetSRID(ST_MakePoint(122.5549466, 10.7273372), 4326)::geography,
  opening_hours_osm = 'Tu-Fr 14:00-19:00; Sa 13:00-19:00; Su 14:00-19:00',
  address = 'CPBC Building, Fajardo Street, Jaro' where left(id::text, 8) = '235812a2';     -- Mostly Matcha
update public.cafes set location = ST_SetSRID(ST_MakePoint(122.5566468, 10.7264123), 4326)::geography,
  opening_hours_osm = 'Mo-Su 08:00-18:00',
  address = 'Lopez Jaena Street, Democracia, Jaro', phone = '0917 890 5761'
  where left(id::text, 8) = '6e4ee9e3';                                                     -- Superhouse Cafe

commit;
