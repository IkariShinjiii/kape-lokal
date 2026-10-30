import type { NextRequest } from "next/server";
import { isLogoKey } from "@/lib/logo";

// A cafe's Facebook profile picture, fetched by the server so visitors' browsers
// never contact Facebook. The CDN keeps a copy for a week, so a slow or broken
// Facebook link does not slow the map down.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/logo/[key]">) {
  const { key } = await ctx.params;
  if (!isLogoKey(key)) return new Response(null, { status: 400 });

  let res: Response;
  try {
    res = await fetch(
      `https://graph.facebook.com/${encodeURIComponent(key)}/picture?type=large&width=256&height=256`,
      { redirect: "follow", signal: AbortSignal.timeout(6000) },
    );
  } catch {
    return new Response(null, { status: 502 });
  }
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.startsWith("image/")) {
    // Short cache on failures so a fixed page shows up again soon.
    return new Response(null, { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } });
  }

  return new Response(res.body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
    },
  });
}
