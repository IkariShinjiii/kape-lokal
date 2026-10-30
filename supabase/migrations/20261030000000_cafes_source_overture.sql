-- Allow cafes imported from Overture Maps places (open data: Meta CDLA-Permissive-2.0,
-- Foursquare Apache-2.0). These come in as unpublished drafts; osm_id holds 'overture/<id>'.
alter table public.cafes drop constraint cafes_source_check;
alter table public.cafes add constraint cafes_source_check
  check (source = any (array['manual', 'osm', 'owner', 'overture']));
