import type { NextRequest } from "next/server";

// The map's label fonts and icon sheet, from Protomaps' public assets on GitHub
// Pages. Served through here so the CDN keeps a copy near the visitor: straight
// from GitHub they delayed the first map draw by 3 to 8 seconds. These files
// never change for a given path, so they are cached for a year.

const UPSTREAM = "https://protomaps.github.io/basemaps-assets";

// Only the fonts and icon sheets the map style uses, so this is not an open proxy.
const FONT = /^fonts\/Noto Sans (Regular|Medium|Italic)\/\d{1,5}-\d{1,5}\.pbf$/;
const SPRITE = /^sprites\/v4\/(dark|light)(@2x)?\.(json|png)$/;

const TYPES: Record<string, string> = {
  pbf: "application/x-protobuf",
  json: "application/json",
  png: "image/png",
};

export async function GET(_req: NextRequest, ctx: RouteContext<"/map-assets/[...path]">) {
  const { path } = await ctx.params;
  const rel = path.map((p) => decodeURIComponent(p)).join("/");
  if (!FONT.test(rel) && !SPRITE.test(rel)) return new Response(null, { status: 404 });

  let res: Response;
  try {
    res = await fetch(`${UPSTREAM}/${rel.split("/").map(encodeURIComponent).join("/")}`, {
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
  // A font range Noto Sans doesn't cover is a 404 upstream; the map skips those
  // characters. Cache that answer for a day.
  if (!res.ok) {
    return new Response(null, {
      status: res.status === 404 ? 404 : 502,
      headers: { "Cache-Control": res.status === 404 ? "public, s-maxage=86400" : "no-store" },
    });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": TYPES[rel.split(".").pop() ?? ""] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=604800, s-maxage=31536000, stale-while-revalidate=31536000, immutable",
    },
  });
}
