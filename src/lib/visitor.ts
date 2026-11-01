import { createHash } from "node:crypto";
import { headers } from "next/headers";

/**
 * One stable, non-reversible id per visitor per day, from the request IP and a
 * salt. The database uses it only for rate limits (forms, search log); the IP
 * itself is never stored.
 */
export async function visitorHash(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${ip}|${day}|${process.env.REPORT_SALT ?? "kape-lokal"}`)
    .digest("hex")
    .slice(0, 32);
}
