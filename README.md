# Kape Lokal

A local cafe finder for Iloilo City. See nearby cafes on a dark map, whether they serve specialty coffee or matcha, their menu when available, and where they are. The Directions button opens Google Maps.

Local cafes come first. Chains are hidden unless a visitor turns on "Include chains". The app is in English with a Filipino option.

Scope, tech stack, decisions and status are in [docs/PLAN.md](docs/PLAN.md). Design mockups are in [docs/design-direction.html](docs/design-direction.html).

## Run it locally

```bash
npm install            # also copies the MapLibre worker into public/vendor
cp .env.example .env.local   # then fill in the two Supabase values
npm run dev            # http://localhost:3000 (use port 3000 so the admin sign-in link works)
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm test` | Unit tests (Node's built-in runner) |
| `npm run lint` | ESLint |
| `npm run import:osm` | Pull Iloilo City cafes from OpenStreetMap and write `supabase/seed/osm_cafes.sql` |

## How it fits together

- **Next.js 16** with Cache Components, TypeScript and Tailwind.
- **Supabase** for the database (Postgres + PostGIS), sign-in and image storage. Schema is in `supabase/migrations/`.
- **MapLibre + Protomaps.** The map tiles for Iloilo are one file, `public/tiles/iloilo.pmtiles`, so there are no per-view map fees.
- **Languages:** `/en` and `/fil`, using JSON dictionaries in `src/app/[lang]/dictionaries/`.
- **Admin:** `/en/admin`, for admins on the email allow-list. Setup steps are in the plan.

Map data © OpenStreetMap contributors.
