"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_HOME, ADMIN_LOGIN, assertAdmin } from "@/lib/admin";
import { slugify } from "@/lib/slug";
import { createServerSupabase } from "@/lib/supabase/server";
import { CAFE_TAGS, type CafeTag } from "@/lib/tags";

const text = (v: FormDataEntryValue | null) =>
  typeof v === "string" ? v.trim() : "";
const orNull = (v: FormDataEntryValue | null) => text(v) || null;
const back = (path: string, params: Record<string, string>) =>
  redirect(`${path}?${new URLSearchParams(params)}`);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Sign-in -------------------------------------------------------------

export async function signIn(formData: FormData) {
  const email = text(formData.get("email")).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) back(ADMIN_LOGIN, { error: "email" });

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${proto}://${host}/auth/callback?next=${ADMIN_HOME}`,
    },
  });
  if (error) back(ADMIN_LOGIN, { error: "send" });
  back(ADMIN_LOGIN, { sent: "1" });
}

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect(ADMIN_LOGIN);
}

// Cafes ---------------------------------------------------------------

export async function saveCafe(formData: FormData) {
  const { supabase } = await assertAdmin();

  const id = text(formData.get("id"));
  const name = text(formData.get("name"));
  const lat = Number(text(formData.get("lat")));
  const lng = Number(text(formData.get("lng")));
  const editPath = id ? `${ADMIN_HOME}/cafes/${id}` : `${ADMIN_HOME}/cafes/new`;

  if (!name) back(editPath, { error: "Name is required." });
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    back(editPath, { error: "Latitude and longitude must be valid numbers." });
  }

  const isExcluded = formData.get("is_excluded") === "on";
  const row = {
    name,
    slug: slugify(text(formData.get("slug")) || name) || "cafe",
    address: orNull(formData.get("address")),
    description_en: orNull(formData.get("description_en")),
    description_fil: orNull(formData.get("description_fil")),
    phone: orNull(formData.get("phone")),
    website: orNull(formData.get("website")),
    facebook: orNull(formData.get("facebook")),
    instagram: orNull(formData.get("instagram")),
    opening_hours_osm: orNull(formData.get("opening_hours")),
    is_chain: formData.get("is_chain") === "on",
    is_excluded: isExcluded,
    exclusion_reason: isExcluded ? orNull(formData.get("exclusion_reason")) : null,
    // An excluded cafe can never be public.
    is_published: !isExcluded && formData.get("is_published") === "on",
    location: `SRID=4326;POINT(${lng} ${lat})`,
  };

  let cafeId = id;
  if (id) {
    const { error } = await supabase.from("cafes").update(row).eq("id", id);
    if (error) back(editPath, { error: error.message });
  } else {
    const { data, error } = await supabase
      .from("cafes")
      .insert({ ...row, source: "manual" })
      .select("id")
      .single();
    if (error) {
      back(editPath, {
        error: error.code === "23505" ? "That web address (slug) is already used." : error.message,
      });
    }
    cafeId = data!.id;
  }

  // Replace tags with exactly what was ticked.
  const tags = formData.getAll("tags").filter((t): t is CafeTag =>
    (CAFE_TAGS as readonly string[]).includes(String(t)),
  );
  await supabase.from("cafe_tags").delete().eq("cafe_id", cafeId);
  if (tags.length > 0) {
    await supabase
      .from("cafe_tags")
      .insert(tags.map((tag) => ({ cafe_id: cafeId, tag })));
  }

  // A suggestion that became a cafe is done.
  const suggestionId = text(formData.get("suggestion_id"));
  if (suggestionId) {
    await supabase.from("cafe_suggestions").update({ status: "added" }).eq("id", suggestionId);
  }

  updateTag("cafes");
  redirect(`${ADMIN_HOME}/cafes/${cafeId}?saved=1`);
}

// Menu ----------------------------------------------------------------

export async function addMenuItem(cafeId: string, formData: FormData) {
  const { supabase } = await assertAdmin();
  const path = `${ADMIN_HOME}/cafes/${cafeId}`;
  const name = text(formData.get("name"));
  if (!name) back(path, { error: "Menu item needs a name." });

  const rawPrice = text(formData.get("price_php"));
  const price = rawPrice === "" ? null : Number(rawPrice);
  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    back(path, { error: "Price must be a positive number." });
  }

  const { error } = await supabase.from("menu_items").insert({
    cafe_id: cafeId,
    name,
    category: orNull(formData.get("category")),
    description: orNull(formData.get("description")),
    price_php: price,
    is_available: formData.get("is_available") === "on",
  });
  if (error) back(path, { error: error.message });

  updateTag("cafes");
  redirect(`${path}?saved=1#menu`);
}

export async function deleteMenuItem(cafeId: string, itemId: string) {
  const { supabase } = await assertAdmin();
  await supabase.from("menu_items").delete().eq("id", itemId).eq("cafe_id", cafeId);
  updateTag("cafes");
  redirect(`${ADMIN_HOME}/cafes/${cafeId}?saved=1#menu`);
}

// Photos --------------------------------------------------------------

async function uploadImage(cafeId: string, folder: "menus" | "covers", formData: FormData) {
  const { supabase } = await assertAdmin();
  const path = `${ADMIN_HOME}/cafes/${cafeId}`;
  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) back(path, { error: "Choose an image first." });
  const image = file as File;
  if (!/^image\/(jpeg|png|webp)$/.test(image.type)) back(path, { error: "Use a JPG, PNG or WebP image." });
  if (image.size > MAX_IMAGE_BYTES) back(path, { error: "Image must be under 5 MB." });

  const ext = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${folder}/${cafeId}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("cafe-media")
    .upload(storagePath, image, { contentType: image.type });
  if (error) back(path, { error: error.message });

  const { error: dbError } =
    folder === "covers"
      ? await supabase.from("cafes").update({ cover_image_path: storagePath }).eq("id", cafeId)
      : await supabase.from("menu_images").insert({ cafe_id: cafeId, image_path: storagePath });
  if (dbError) back(path, { error: dbError.message });

  updateTag("cafes");
  redirect(`${path}?saved=1${folder === "menus" ? "#menu" : ""}`);
}

export async function uploadMenuImage(cafeId: string, formData: FormData) {
  return uploadImage(cafeId, "menus", formData);
}

export async function uploadCoverImage(cafeId: string, formData: FormData) {
  return uploadImage(cafeId, "covers", formData);
}

export async function deleteMenuImage(cafeId: string, imageId: string, imagePath: string) {
  const { supabase } = await assertAdmin();
  await supabase.storage.from("cafe-media").remove([imagePath]);
  await supabase.from("menu_images").delete().eq("id", imageId).eq("cafe_id", cafeId);
  updateTag("cafes");
  redirect(`${ADMIN_HOME}/cafes/${cafeId}?saved=1#menu`);
}

// Reports and suggestions ---------------------------------------------

export async function resolveFlag(flagId: string) {
  const { supabase } = await assertAdmin();
  await supabase.from("edit_flags").update({ resolved: true }).eq("id", flagId);
  redirect(`${ADMIN_HOME}?view=reports`);
}

export async function resolveAllFlags() {
  const { supabase } = await assertAdmin();
  await supabase.from("edit_flags").update({ resolved: true }).eq("resolved", false);
  redirect(`${ADMIN_HOME}?view=reports`);
}

export async function dismissSuggestion(suggestionId: string) {
  const { supabase } = await assertAdmin();
  await supabase.from("cafe_suggestions").update({ status: "dismissed" }).eq("id", suggestionId);
  redirect(`${ADMIN_HOME}?view=suggestions`);
}
