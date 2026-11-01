import type { NextRequest } from "next/server";
import { locales } from "@/lib/i18n";
import { createPublicClient } from "@/lib/supabase/public";
import { visitorHash } from "@/lib/visitor";

// Records what a visitor searched for and how many cafes matched (see the
// search_events migration). The browser sends it with navigator.sendBeacon and
// never waits for it, so this always answers 204, even when a row is rejected.
const ACTIONS = new Set(["typed", "see_all", "pick"]);

const count = (v: unknown) =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 1000 ? v : null;

export async function POST(req: NextRequest) {
  // Only the site's own pages log searches.
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new Response(null, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  const query =
    typeof body.q === "string" ? body.q.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 60) : "";
  const results = count(body.results);
  const menuResults = count(body.menuResults);
  const action = typeof body.action === "string" && ACTIONS.has(body.action) ? body.action : null;
  const lang = (locales as readonly string[]).includes(body.lang as string) ? (body.lang as string) : null;
  if (query.length < 2 || results === null || menuResults === null || !action || !lang) {
    return new Response(null, { status: 400 });
  }

  await createPublicClient()
    .from("search_events")
    .insert({ query, results, menu_results: menuResults, action, lang, visitor_hash: await visitorHash() });
  return new Response(null, { status: 204 });
}
