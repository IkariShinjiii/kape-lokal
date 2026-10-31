# Kape Lokal: Plan

Status: live at https://kape-lokal.vercel.app with 184 verified cafes (2026-10-31). See "Status" below.

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

## Supabase project (created 2026-10-24)

- Project: `kape-lokal`, ref `gfwnhqvcmqqobptrvcfd`, region ap-southeast-1 (Singapore), free plan.
- The free plan allows 2 active projects, so the existing `acua` project was paused to make room. Restore it from the Supabase dashboard if needed, which will require pausing another.
- Schema and access rules are applied. Security advisor is clean.
- Connection settings live in `.env.local` (git-ignored). `.env.example` lists the names.

## OSM import (milestone 3, done 2026-10-24)

- Script: `npm run import:osm` ([scripts/import-osm.ts](../scripts/import-osm.ts)). It fetches Iloilo City cafes from Overpass, saves the raw snapshot to `data/osm-iloilo.json` and writes `supabase/seed/osm_cafes.sql`.
- Loaded 143 named cafes as unpublished drafts: 105 local, 38 chains. 4 OSM entries had no name and were skipped.
- Re-running is safe. It only refreshes OSM-sourced fields on rows whose source is `osm`. Publish state, descriptions, tags, menus and the chain flag are never overwritten.
- Chain detection: a list of known chains, OSM brand tags, or a name repeated 3 or more times. Locally owned multi-branch cafes (Madge Café, Kurukape, Bluejay) are not flagged. The admin page will let you flip the flag.
- Known gaps to fix in review: some entries are not cafes (an internet cafe, a pizza place, a bakery), a few are duplicates (two "Coffee Break Nxt" at the same spot), and no cafe has a specialty or matcha tag yet. Specialty cafes like NuWave may be missing from OSM, so the admin page needs an "add cafe" form.

## Later: protect the "report wrong info" button

The `edit_flags` table lets anyone insert a report, so it can be spammed. Before launch, add: a per-visitor rate limit, a hidden honeypot field, a hard cap on note length (already 1,000 characters in the database), and a way for you to bulk-resolve junk. Scheduled for the admin page milestone (6).

## Still open
- Map tile provider: pick from the table above. Recommended: Protomaps.
- App domain and hosting plan (Vercel free tier is fine to start).

## Milestones
Status as of 2026-10-31 (evening):

- **Live:** at kape-lokal.vercel.app, deployed automatically from the GitHub main branch.
- **Cafes:** 186 published. The data comes from:
  - OpenStreetMap
  - Overture Maps open data (`scripts/overture/`)
  - a district-by-district Google Maps sweep
  
  Every published cafe was checked open on Google. Closed ones are excluded, never deleted. All 41 exclusions for closure were re-checked on 2026-10-31 (two were wrong and are now live); see `docs/overture-verification-2026-10-30.md`, Round 3.
- **Tags:**
  - 10 specialty cafes and 2 matcha cafes, each with a source in `docs/google-maps-reference.md`.
  - Chains are hidden unless "Include chains" is on.
- **Map:**
  - street and district labels, pin clusters
  - a district jump menu, a live "in view" count, zoom and show-all buttons
  - a pulsing location dot, a bean, leaf or cup pin per cafe, and a hover preview
- **Finding cafes:**
  - search by name or address
  - Open now, Saved (on the device), Specialty, Matcha, Has menu and chains filters
  - readable hours with a live Open now / Closed status in Philippine time
- **Logos:** each cafe's Facebook profile picture, served through `/api/logo` so visitors' browsers don't contact Facebook. 178 cafes have a Facebook page. Pages that Facebook only shows as a grey silhouette without a login return 404, so those cards show the initial.
- **Languages:** English, Filipino, Hiligaynon. Both translations need a native-speaker review.
- **SEO and sharing:**
  - sitemap and robots files
  - language alternates
  - schema.org data on cafe pages
  - generated link-preview images for the home page and each cafe
- **Admin:** photo uploads shrink pictures in the browser, so phone photos work. The public forms have a honeypot, a too-fast check, a link limit and database rate limits.
- **Open items:**
  - 34 cafes have no hours on Google; 47 have no phone.
  - Leads not yet published: Bluejay Coffee and Deli (location unclear), Gee's Cafe, Dulgies Desserts & Cafe.
  - Owner claim portal.
  - Sponsor slot: built, empty (`src/lib/sponsors.ts`).
  - Custom domain (set `NEXT_PUBLIC_SITE_URL` once connected).

Status as of 2026-10-24 (history):

1. Design tokens: **done** (Tailwind theme in `globals.css`).
2. Scaffold, Supabase project, schema, row-level security, language routing: **done**.
3. OSM import for Iloilo City as drafts: **done**. Data gaps fixed (see below).
4. Map home, list view, filters, Protomaps dark map: **done and checked in a browser**.
5. Cafe detail with menu, mini map and Directions link: **done and checked in a browser** (Filipino version).
6. Admin page (drafts, publish, tags, menus, photos, add cafe, suggestions, reports): **built, not yet exercised**, because it needs your sign-in. See "Admin setup".
7. Filipino translation: **done, needs a native-speaker review**. Strings live in `src/app/[lang]/dictionaries/fil.json`. Admin screens are English only.
8. Deploy and test on real phones around Iloilo: **needs you** (Vercel account, domain, Supabase redirect URL). This is the launch.
9. After launch: owner claim flow and owner editing page. (The light theme toggle is done: tokens in `globals.css`, a saved choice applied before first paint, and a light Protomaps style. Motion animations use the `motion` package.)

### Admin setup (one step from you)

Nobody is an admin until an email is on the allow-list. Run this once in the Supabase SQL editor with your email, then sign in at `/en/admin/login`. The sign-in link is emailed, so the Supabase project needs email sending, which is on by default with a low hourly limit.

```sql
insert into private.admin_emails (email) values ('you@example.com');
```

If you already signed in before adding it, also run the second statement from `supabase/migrations/20261024000400_admin_allowlist_and_cafe_coordinates.sql`.

For a deployed site, add its address under Supabase > Authentication > URL Configuration (Site URL and Redirect URLs), or the sign-in link will point at localhost.

### How the data gaps were fixed

| Gap | Fix |
|---|---|
| Entries that are not cafes (internet cafe, pizza place, food house, cake stall) | `is_excluded` flag. Import script skips known non-cafe names, and the 4 already loaded are excluded, never deleted. Admin can exclude more. |
| Duplicate OSM nodes | Import script drops the same name within 15 m. The one duplicate already loaded is excluded. |
| Tea and matcha shops filed as `shop=tea` | Import query now includes `shop=tea` and `shop=coffee`. Added Mostly Matcha with its matcha tag. |
| No specialty or matcha tags | The admin list shows a dashed "Maybe Specialty" hint when a name suggests it (roastery, espresso, matcha). Tags are only saved when you tick them. |
| Cafes missing from OSM, like NuWave | Public "Know a cafe we're missing?" form (rate limited, with a honeypot) plus an admin "Add cafe" form. A suggestion becomes a cafe in one click. NuWave could not be found online, so it is not added. |

### Known limits

- Map labels and icons load from the free Protomaps asset host on GitHub Pages. The map tiles themselves are our own file.
- The 3 test rows from earlier are still in the database. The admin page can exclude them, or run the delete SQL given earlier.
- Overlapping access policies cause a performance notice in Supabase. It does not matter at this size.
- Report spam limit: the visitor id comes from the request IP in our server code, so someone calling the database API directly can vary it. The overall cap of 60 per hour per table still bounds the damage.
