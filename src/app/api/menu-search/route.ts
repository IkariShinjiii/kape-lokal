import type { NextRequest } from "next/server";
import { getMenuEntries } from "@/lib/cafes";
import { searchMenus } from "@/lib/menu-search";

// Which cafes have a drink or food item on their menu, e.g. ?q=caramel macchiato.
// The menu list itself is cached on the server; the CDN keeps each answer for
// five minutes, so popular searches cost almost nothing.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 60);
  const hits = searchMenus(q, await getMenuEntries());
  return Response.json(
    { hits },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
  );
}
