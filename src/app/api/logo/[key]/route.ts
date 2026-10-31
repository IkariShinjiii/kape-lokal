import type { NextRequest } from "next/server";
import { isLogoKey } from "@/lib/logo";

// A cafe's Facebook profile picture, fetched by the server so visitors' browsers
// never contact Facebook. The CDN keeps a copy for a week, so a slow or broken
// Facebook link does not slow the map down.

const notFound = (maxAge: number) =>
  new Response(null, { status: 404, headers: { "Cache-Control": `public, s-maxage=${maxAge}` } });

type Picture = { data?: { url?: string; is_silhouette?: boolean } };

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/logo/[key]">) {
  const { key } = await ctx.params;
  if (!isLogoKey(key)) return new Response(null, { status: 400 });

  // Ask for the picture's details first: Facebook serves a grey silhouette for
  // pages it won't show without a login, and the card's initial looks better.
  let pic: Picture;
  try {
    const res = await fetch(
      `https://graph.facebook.com/${encodeURIComponent(key)}/picture?type=large&width=256&height=256&redirect=0`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return notFound(3600);
    pic = (await res.json()) as Picture;
  } catch {
    return new Response(null, { status: 502 });
  }
  if (pic.data?.is_silhouette) return notFound(86400);

  const src = pic.data?.url;
  let host = "";
  try {
    host = src ? new URL(src).hostname : "";
  } catch {}
  // Only follow links to Facebook's own image servers.
  if (!src || !/(^|\.)fbcdn\.net$/.test(host)) return notFound(3600);

  let img: Response;
  try {
    img = await fetch(src, { signal: AbortSignal.timeout(6000) });
  } catch {
    return new Response(null, { status: 502 });
  }
  const type = img.headers.get("content-type") ?? "";
  // Short cache on failures so a fixed page shows up again soon.
  if (!img.ok || !type.startsWith("image/")) return notFound(3600);

  return new Response(img.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
    },
  });
}
