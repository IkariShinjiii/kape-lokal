# Kape Lokal: Plan

Status: planning. No application code yet.

## Product

A local cafe finder. A visitor sees cafes near them and can tell at a glance whether a cafe serves specialty coffee or matcha. Each cafe has a detail page with its menu (when available) and a map location. The Directions button opens Google Maps, so the app does no routing itself.

### MVP scope
- Nearby cafes, sorted by distance, using the browser location (fallback: pick a city/area).
- Filters: Specialty coffee, Matcha, Has menu, Open now.
- Cafe detail: photos, hours, address, tags, menu, mini map, Directions button.
- Map view with pins for all nearby cafes.
- Directions: a plain link to `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`. No Google API key, no billing, nothing to maintain.

### Later
- Cafe owner login to edit their own listing and menu.
- Visitor favorites (saved on device first, accounts later).
- Reviews, only if moderation is affordable.
- PWA install, offline cafe list.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | One codebase for pages and API, good SEO for cafe pages, easy Vercel deploy. |
| Styling | Tailwind CSS | Fast to iterate on whichever design is picked. |
| Database | Supabase Postgres + PostGIS | "Cafes near me" is one distance query. Free tier is enough to start. |
| Auth | Supabase Auth | Only needed for admin and, later, cafe owners. |
| Images and menu photos | Supabase Storage | Same dashboard, same access rules. |
| Map | MapLibre GL JS or Leaflet, with OpenStreetMap-based tiles | No Google Maps JS billing. Tile provider (MapTiler or Protomaps) is a free-tier decision to make. |
| Geolocation | Browser Geolocation API | Free, no server work. Ask only when the visitor taps "Near me". |
| Directions | Deep link to Google Maps | Decided: Google does the routing. |
| Hosting | Vercel | Matches Next.js. |
| Validation and forms | Zod + React Hook Form | For the admin forms. |
| Testing | Vitest (logic), Playwright (key flows) | Small, focused set. |

## Data model (draft)

- `cafes`: id, slug, name, description, address, city, location (geography point), phone, social links, hours (jsonb), cover image, is_published.
- `cafe_tags`: cafe_id, tag. Tags start as `specialty_coffee` and `matcha`, and are open to more (pastry, work-friendly, pet-friendly).
- `menu_items`: id, cafe_id, category, name, price, description, is_available.
- `menu_images`: cafe_id, image path. Fallback when a cafe only has a photo of its menu board.
- A cafe's menu is "available" when it has either menu items or menu images.

## Where cafe data comes from

This is the biggest open risk. Options:
1. Seed from OpenStreetMap (Overpass API), then curate by hand. Free and legal, but sparse in some areas.
2. Enter cafes by hand, starting with one city. Highest quality, slowest.
3. Google Places API. Rich data, but costs money and its terms limit storing the data.

Recommendation: option 1 plus 2. Seed from OSM, then hand-verify the specialty and matcha tags and menus.

## Decisions needed
- Which city or area launches first.
- Who maintains the data: you alone, or cafe owners too.
- Which of the 5 designs to build.
- Language: English only, or English and Filipino.

## Milestones
1. Pick a design and lock tokens (colors, type).
2. Project scaffold, Supabase project, schema, seed 20 to 30 cafes.
3. Nearby list and filters.
4. Cafe detail with menu and Directions link.
5. Map view.
6. Admin editing.
7. Deploy, then test on real phones.
