// Fetches cafes for Iloilo City from OpenStreetMap and writes:
//   data/osm-iloilo.json           raw snapshot (ODbL, credit "© OpenStreetMap contributors")
//   supabase/seed/osm_cafes.sql    idempotent upsert, loaded as unpublished drafts
//
// Run: node scripts/import-osm.ts
// Re-running is safe. Existing rows only get their OSM-sourced fields refreshed.
// Publish state, descriptions, tags, menus and the chain flag are never overwritten.

import { mkdirSync, writeFileSync } from "node:fs";

type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

// Cafes, plus tea and coffee shops (matcha places like Mostly Matcha are tagged shop=tea).
const QUERY = `[out:json][timeout:60];
area["name"="Iloilo City"]["boundary"="administrative"]->.a;
(
  nwr["amenity"="cafe"](area.a);
  nwr["shop"~"^(tea|coffee)$"](area.a);
);
out center tags;`;

// Entries tagged as cafes in OSM that are something else. Matched against the lowercased name.
const NOT_CAFES = ["internet cafe", "pizza", "food house", "kalacs"];

// Names that are chains in the Philippines. Matched against the lowercased name or brand.
const KNOWN_CHAINS = [
  "starbucks",
  "dunkin",
  "mcdonald",
  "mccafe",
  "jollibee",
  "tim hortons",
  "seattle's best",
  "bo's coffee",
  "coffee bean",
  "krispy kreme",
  "figaro",
  "yellow cab",
  "greenwich",
  "chowking",
  "kenny rogers",
  "j.co",
  "ministop",
  "7-eleven",
  "coffee break",
  "coffeebreak",
  "moonleaf",
  "tiger sugar",
  "macao imperial",
  "mister donut",
  "sharetea",
  "jd bakeshop",
  "pickup coffee",
];
// A name that shows up this many times is almost certainly a chain.
const REPEAT_THRESHOLD = 3;

const normalize = (s: string) => s.toLowerCase().trim();

export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sqlText(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "null";
  return `'${value.replace(/'/g, "''")}'`;
}

export function pickAddress(tags: Record<string, string>): string | null {
  const street = [tags["addr:housenumber"], tags["addr:street"]]
    .filter(Boolean)
    .join(" ");
  const parts = [street, tags["addr:suburb"] ?? tags["addr:neighbourhood"]].filter(
    Boolean,
  );
  return parts.length ? parts.join(", ") : (tags["addr:full"] ?? null);
}

export function detectChains(elements: OsmElement[]): Set<string> {
  const counts = new Map<string, number>();
  for (const el of elements) {
    const name = el.tags?.name;
    if (name) counts.set(normalize(name), (counts.get(normalize(name)) ?? 0) + 1);
  }
  const chains = new Set<string>();
  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = normalize(tags.name ?? "");
    const brand = normalize(tags.brand ?? "");
    const known = KNOWN_CHAINS.some((c) => name.includes(c) || brand.includes(c));
    const repeated = name !== "" && (counts.get(name) ?? 0) >= REPEAT_THRESHOLD;
    if (known || repeated || tags["brand:wikidata"]) {
      chains.add(`${el.type}/${el.id}`);
    }
  }
  return chains;
}

async function fetchCafes(): Promise<OsmElement[]> {
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "User-Agent": "KapeLokal-import/0.1 (Iloilo City cafe finder)",
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ data: QUERY }),
  });
  if (!res.ok) throw new Error(`Overpass responded ${res.status}`);
  const json = (await res.json()) as { elements: OsmElement[] };
  return json.elements;
}

export function isNotCafe(name: string): boolean {
  const lower = normalize(name);
  return NOT_CAFES.some((n) => lower.includes(n));
}

type Spot = { lat: number; lon: number };
const DUPLICATE_RADIUS_M = 15;

function metersBetween(a: Spot, b: Spot): number {
  const dLat = (b.lat - a.lat) * 111_320;
  const dLon = (b.lon - a.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

// The same name within 15 m of an earlier entry is a duplicate OSM node.
// Returns true for a new spot and remembers it, false for a duplicate.
export function registerSpot(
  seen: Map<string, Spot[]>,
  name: string,
  lat: number,
  lon: number,
): boolean {
  const key = normalize(name);
  const spots = seen.get(key) ?? [];
  if (spots.some((s) => metersBetween(s, { lat, lon }) <= DUPLICATE_RADIUS_M)) {
    return false;
  }
  seen.set(key, [...spots, { lat, lon }]);
  return true;
}

function toRow(
  el: OsmElement,
  isChain: boolean,
  usedSlugs: Set<string>,
  seen: Map<string, Spot[]>,
) {
  const tags = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  const name = tags.name?.trim();
  if (!name || lat === undefined || lon === undefined) return null;
  if (isNotCafe(name)) return null;
  if (!registerSpot(seen, name, lat, lon)) return null;

  const osmId = `${el.type}/${el.id}`;
  let slug = slugify(name) || "cafe";
  if (usedSlugs.has(slug)) slug = `${slug}-${el.id}`;
  usedSlugs.add(slug);

  return {
    osmId,
    slug,
    name,
    address: pickAddress(tags),
    lat,
    lon,
    phone: tags.phone ?? tags["contact:phone"] ?? null,
    website: tags.website ?? tags["contact:website"] ?? null,
    facebook: tags["contact:facebook"] ?? null,
    instagram: tags["contact:instagram"] ?? null,
    hours: tags.opening_hours ?? null,
    isChain,
  };
}

function toSql(rows: NonNullable<ReturnType<typeof toRow>>[]): string {
  const values = rows
    .map(
      (r) =>
        `  (${[
          sqlText(r.slug),
          sqlText(r.name),
          sqlText(r.address),
          `extensions.st_makepoint(${r.lon}, ${r.lat})::extensions.geography`,
          sqlText(r.phone),
          sqlText(r.website),
          sqlText(r.facebook),
          sqlText(r.instagram),
          sqlText(r.hours),
          r.isChain,
          sqlText(r.osmId),
          "'osm'",
        ].join(", ")})`,
    )
    .join(",\n");

  return `-- Generated by scripts/import-osm.ts from OpenStreetMap data.
-- Map data © OpenStreetMap contributors (ODbL).
-- Loads cafes as unpublished drafts. On re-run, only OSM-sourced fields are refreshed.
-- is_published, descriptions, tags, menus and the chain flag are left as they are.

insert into public.cafes
  (slug, name, address, location, phone, website, facebook, instagram, opening_hours_osm, is_chain, osm_id, source)
values
${values}
on conflict (osm_id) do update set
  name = excluded.name,
  address = excluded.address,
  location = excluded.location,
  phone = excluded.phone,
  website = excluded.website,
  facebook = excluded.facebook,
  instagram = excluded.instagram,
  opening_hours_osm = excluded.opening_hours_osm
where public.cafes.source = 'osm';
`;
}

async function main() {
  const elements = await fetchCafes();
  const chains = detectChains(elements);
  const usedSlugs = new Set<string>();
  const seen = new Map<string, Spot[]>();

  const rows = elements
    .map((el) => toRow(el, chains.has(`${el.type}/${el.id}`), usedSlugs, seen))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const sql = toSql(rows);

  mkdirSync("data", { recursive: true });
  mkdirSync("supabase/seed", { recursive: true });
  writeFileSync("data/osm-iloilo.json", JSON.stringify(elements, null, 1));
  writeFileSync("supabase/seed/osm_cafes.sql", sql);

  const chainRows = rows.filter((r) => r.isChain);
  console.log(`fetched ${elements.length}, usable ${rows.length}`);
  console.log(`flagged as chains (${chainRows.length}):`);
  for (const [name, n] of Object.entries(
    chainRows.reduce<Record<string, number>>((acc, r) => {
      acc[r.name] = (acc[r.name] ?? 0) + 1;
      return acc;
    }, {}),
  )) {
    console.log(`  ${name} x${n}`);
  }
}

// Only run when executed directly, so the helpers can be imported in tests.
if (process.argv[1]?.endsWith("import-osm.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
