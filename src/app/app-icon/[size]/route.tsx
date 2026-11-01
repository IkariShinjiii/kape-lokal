import type { NextRequest } from "next/server";
import { appIcon } from "@/lib/app-icon";

// Home-screen icons listed in the web app manifest (192 and 512 px).
const SIZES = new Set([192, 512]);

export async function GET(_req: NextRequest, ctx: RouteContext<"/app-icon/[size]">) {
  const size = Number((await ctx.params).size);
  if (!SIZES.has(size)) return new Response(null, { status: 404 });
  return appIcon(size);
}
