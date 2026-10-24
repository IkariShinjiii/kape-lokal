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
| Validation and forms | Zod + React Hook Form | For the admin and owner forms. |
| Translations | Next.js built-in pattern: `proxy.ts` locale redirect + JSON dictionaries | English main, Filipino option. No extra library, which suits this Next.js version's `cacheComponents` mode. |
| Data import | Overpass API script (Node/TypeScript) | Seeds Iloilo City cafes from OpenStreetMap. |
| Testing | Vitest (logic), Playwright (key flows) | Small, focused set. |

## Data model (draft)

- `cafes`: id, slug, name, description, address, city, location (geography point), phone, social links, hours (jsonb), cover image, is_published.
- `cafe_tags`: cafe_id, tag. Tags start as `specialty_coffee` and `matcha`, and are open to more (pastry, work-friendly, pet-friendly).
- `menu_items`: id, cafe_id, category, name, price, description, is_available.
- `menu_images`: cafe_id, image path. Fallback when a cafe only has a photo of its menu board.
- A cafe's menu is "available" when it has either menu items or menu images.

## Launch area and cafe data (decided)

Launch area: **Iloilo City**. Data comes from public internet sources, then gets cleaned up by you and the cafe owners.

Checked on 2026-10-24: OpenStreetMap has **147 cafes** tagged `amenity=cafe` inside Iloilo City. 143 have names. Only 26 have opening hours, 53 have a cuisine tag, and 18 have a website, phone or Facebook link. So OSM gives us names and pins, and little else. It also includes chains (Starbucks, Dunkin', Coffee Break) that you may not want in a "local" app.

Sources, in order of use:
1. **OpenStreetMap via Overpass.** Free, and the data may be stored. Requires an "© OpenStreetMap contributors" credit in the app. This is the seed.
2. **Cafe-submitted and owner-edited data.** Fills in hours, menus, photos and the specialty and matcha tags.
3. **Your own hand verification** of the first batch, especially specialty and matcha.

Not planned: copying from Google Maps, Facebook or Instagram. Scraping them breaks their terms, and Google Places data can't be stored long term. Owners can paste their own menu photos instead. If we want Google's data later, we'd use the paid Places API and follow its storage rules.

Cleanup steps for the seed:
- Import all 147 as unpublished drafts.
- Add a `is_chain` flag and hide chains by default.
- Publish a cafe only after it has at least a name, location and one verified detail.
- Re-run the import monthly and merge new cafes without overwriting owner edits.

## Owners and admin (decided)

You maintain the data at launch. Owners get their own editing access later, after launch. The database roles and row-level security are built from the start so the owner portal is an addition, not a rework.

- **Roles:** `admin` (you) and `owner` (one or more cafes each). Everyone else is an anonymous visitor.
- **Claim flow:** an owner finds their cafe, taps "Claim this cafe", signs in by email, and you approve the claim in the admin page. Approval is manual because there's no other way to prove ownership.
- **Owners can edit:** description, hours, photos, tags, menu items and menu photos.
- **Only admin can edit:** name, location, chain flag, publish state.
- **Security:** Supabase row-level security enforces this in the database, not just in the UI.
- **Suggest an edit:** visitors can flag wrong info on unclaimed cafes. Flags go to your review queue.

Data model additions: `profiles` (user, role), `cafe_owners` (user, cafe, status: pending/approved), `edit_flags` (cafe, note, status), `source` and `osm_id` on `cafes`, and `is_chain`.

## Languages (decided)

English is the main language, with a Filipino option. Language switch lives in the settings and defaults to English.

- Library: `next-intl`, with routes like `/en/...` and `/fil/...`.
- UI text is translated. Cafe names, menus and owner descriptions are left as the owner wrote them.
- Owners can add an optional Filipino description. If missing, the English one shows.
- Dates, hours and prices (₱) use the locale formatters.
- Filipino strings should be reviewed by a native speaker before launch.

## Design direction (decided)

Option 1 "Barako" colors on option 4 "Mapa" layout. Mockups: [design-direction.html](design-direction.html). Earlier options: [design-options.html](design-options.html).

- Map is the home screen, with a Map / List switch and the same filter chips on both.
- Palette: roast `#1a1411`, crema `#251c17`, ember `#e8742c` (specialty, actions), leaf `#b5d98f` (matcha), foam `#f1e6d8` (text).
- Type: Barlow Condensed for headings and labels, Barlow for body.
- Pins use the tag colors, so the filter chips act as the legend.
- Needs a dark map tile style. Candidates: MapTiler, Protomaps.

## Theme (decided)

Dark first. A light theme comes later as a toggle, mainly for reading the map in bright sun. Build with color tokens from the start so adding light is a token swap, not a rewrite. The map needs a light tile style at that point too.

## Chains (decided)

The goal is to promote local cafes, especially specialty coffee places such as NuWave. Chains (Starbucks, Dunkin', Coffee Break) are not removed. They stay hidden by default, and show on the map and list only when the visitor turns on an "Include chains" filter. Chain pins use a muted gray so local cafes stand out. Chains never appear in the default "Nearby" ranking.

## Map tile provider (options researched 2026-10-24)

| Option | Cost | Pros | Cons |
|---|---|---|---|
| Protomaps, self-hosted | Storage only. A cut-out for Iloilo is small, so cents per month | No per-view fees and no usage cap. No API key to leak. Built on OpenStreetMap, which we already use. Open source. Ships dark and light themes, so the later toggle is easy | Most setup work: extract the region, host the file, tune the style. We own updates. Needs "© OpenStreetMap contributors" credit |
| MapTiler Cloud | Free: 5k map sessions per month, then service pauses. Paid from $30 per month | Hosted, quick to set up. Many ready-made styles. Good docs | The free plan page says "personal or non-commercial use". Free cap is low if the app grows. Needs an API key in the browser |
| Stadia Maps | Free: 200k credits per month. Paid from $20 per month | Hosted, with dark styles. Cheapest paid step | The free plan says commercial use is not allowed, so a paid plan is likely needed at launch. API key needed |
| Mapbox | Free: 50k map loads per month, then $5 per 1,000 | Polished styles and tools. Biggest free allowance of the hosted options | Costs rise quickly past the free tier. Uses its own SDK and terms. Account and token management |

Notes: the Protomaps dark theme and region extract size come from its documentation and my own knowledge. I haven't downloaded the Iloilo extract yet, so its exact size is unconfirmed. Whether MapTiler's free plan fits a free community app is a question for MapTiler, not something I can settle.

Decided: **Protomaps, self-hosted.** It costs almost nothing, never hits a usage cap, and keeps the dark and later light themes under our control. The extra setup is a one-time cost in milestone 4. Self-hosting also means no provider terms stop us from running ads.

## Making the project pay for itself (decided in principle)

You are putting money in, so the app should earn at least its running costs. Goal: cover hosting, the database and map storage with a small amount of advertising, without turning the app into an ad wall or hurting the local-cafe mission.

Ground rules:
- Few ad slots. One small banner in the list view and one on the cafe detail page. No ads over the map and none that cover the Directions button.
- Anything paid is labeled "Sponsored". A paid placement never changes the honest ranking of the normal Nearby list.
- Local first: prefer local sponsors over generic ad networks.

Options, from simplest to most work:
1. **Ad network banner (for example Google AdSense).** Quick to add, low income at first, and the ads are not under our control. Needs a privacy notice and cookie consent.
2. **Local sponsor slot.** A cafe or local business pays a flat monthly fee for a labeled "Featured" spot at the top of the list or a banner. Fits the mission and pays better per slot, but needs you to sell it.
3. **Cafe owner perks, after owner accounts exist.** Optional paid extras such as more photos or a highlighted pin.

Starting plan: build a single reusable `<AdSlot>` component with a placeholder, launch without ads, and turn on option 2 and then option 1 once there is real traffic. Costs to cover are estimated at launch: domain (yearly), Supabase and Vercel free tiers (likely $0 at first), and map file storage (cents).

## Still open
- Map tile provider: pick from the table above. Recommended: Protomaps.
- App domain and hosting plan (Vercel free tier is fine to start).

## Milestones
1. Lock design tokens (done in the plan, to be coded as Tailwind theme).
2. Project scaffold, Supabase project, schema with roles and row-level security, `next-intl` set up.
3. OSM import script for Iloilo City, loaded as drafts. You review and publish the first 20 to 30 cafes.
4. Map home, list view and filters.
5. Cafe detail with menu and Directions link.
6. Admin page: review drafts, edit cafes and menus, handle edit flags.
7. Filipino translation pass.
8. Deploy, then test on real phones around Iloilo. **This is the launch.**
9. After launch: owner claim flow and owner editing page, then the light theme toggle.
