"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";

export type FormState = {
  status: "idle" | "success" | "error" | "limit" | "empty";
};

// One stable, non-reversible id per visitor per day. The database enforces
// 3 submissions per visitor per hour and 60 per hour overall.
async function visitorHash(): Promise<string> {
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

const clean = (v: FormDataEntryValue | null, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

// Signs of an automated post: sent within 2.5 s of the form appearing (only when
// the browser recorded the time), or more than two links. Treated as success so
// bots get no signal.
function looksAutomated(formData: FormData, ...texts: string[]): boolean {
  const started = Number(formData.get("started"));
  if (started && Date.now() - started < 2500) return true;
  const links = texts.join(" ").match(/https?:\/\/|www\./gi)?.length ?? 0;
  return links > 2;
}

// Postgres raises 42501 when a row-level security check rejects the insert.
const isLimit = (code: string | undefined) => code === "42501";

export async function reportCafe(
  cafeId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Hidden field that real visitors never fill. Bots do.
  if (clean(formData.get("website_url"), 100)) return { status: "success" };

  const note = clean(formData.get("note"), 1000);
  if (!note) return { status: "empty" };
  if (looksAutomated(formData, note)) return { status: "success" };

  const { error } = await createPublicClient()
    .from("edit_flags")
    .insert({ cafe_id: cafeId, note, reporter_hash: await visitorHash() });

  if (!error) return { status: "success" };
  return { status: isLimit(error.code) ? "limit" : "error" };
}

export async function suggestCafe(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (clean(formData.get("website_url"), 100)) return { status: "success" };

  const name = clean(formData.get("name"), 120);
  if (!name) return { status: "empty" };
  if (looksAutomated(formData, name, clean(formData.get("note"), 1000))) return { status: "success" };

  const { error } = await createPublicClient()
    .from("cafe_suggestions")
    .insert({
      name,
      address: clean(formData.get("address"), 200) || null,
      link: clean(formData.get("link"), 300) || null,
      note: clean(formData.get("note"), 1000) || null,
      reporter_hash: await visitorHash(),
    });

  if (!error) return { status: "success" };
  return { status: isLimit(error.code) ? "limit" : "error" };
}
