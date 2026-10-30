import { cacheLife, cacheTag } from "next/cache";
import { logoUrl } from "@/lib/logo";
import { createPublicClient } from "@/lib/supabase/public";
import type { CafeTag } from "@/lib/tags";

export type Cafe = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  isChain: boolean;
  hours: string | null;
  tags: CafeTag[];
  hasMenu: boolean;
  coverImagePath: string | null;
  /** The cafe's Facebook profile picture, via /api/logo. */
  logoUrl: string | null;
};

export type MenuItem = {
  id: string;
  category: string | null;
  name: string;
  description: string | null;
  price_php: number | null;
  is_available: boolean;
  sort_order: number;
};

export type CafeDetail = Cafe & {
  descriptionEn: string | null;
  descriptionFil: string | null;
  phone: string | null;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  menuItems: MenuItem[];
  menuImages: { id: string; image_path: string }[];
};

type ListRow = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  is_chain: boolean;
  opening_hours_osm: string | null;
  tags: CafeTag[];
  has_menu: boolean;
  // Missing until the cover-image migration has been applied.
  cover_image_path?: string | null;
};

const toCafe = (r: ListRow, facebook: string | null): Cafe => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  address: r.address,
  lat: r.lat,
  lng: r.lng,
  isChain: r.is_chain,
  hours: r.opening_hours_osm,
  tags: r.tags ?? [],
  hasMenu: r.has_menu,
  coverImagePath: r.cover_image_path ?? null,
  logoUrl: logoUrl(facebook),
});

// All published cafes, chains included. The client hides chains unless asked.
export async function getCafes(): Promise<Cafe[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("cafes");

  const client = createPublicClient();
  const [list, links] = await Promise.all([
    client.rpc("list_cafes"),
    // Facebook pages for the logos. Optional: the map works without them.
    client.from("cafes").select("id, facebook").eq("is_published", true).not("facebook", "is", null),
  ]);
  if (list.error) throw new Error(`list_cafes failed: ${list.error.message}`);
  const facebook = new Map((links.data ?? []).map((r) => [r.id as string, r.facebook as string]));
  return (list.data as ListRow[]).map((r) => toCafe(r, facebook.get(r.id) ?? null));
}

export async function getCafeBySlug(slug: string): Promise<CafeDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("cafes");

  const base = (await getCafes()).find((c) => c.slug === slug);
  if (!base) return null;

  const { data, error } = await createPublicClient()
    .from("cafes")
    .select(
      "description_en, description_fil, phone, website, facebook, instagram, cover_image_path, menu_items(id, category, name, description, price_php, is_available, sort_order), menu_images(id, image_path, sort_order)",
    )
    .eq("id", base.id)
    .single();
  if (error) throw new Error(`cafe detail failed: ${error.message}`);

  const menuItems = [...(data.menu_items ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const menuImages = [...(data.menu_images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return {
    ...base,
    descriptionEn: data.description_en,
    descriptionFil: data.description_fil,
    phone: data.phone,
    website: data.website,
    facebook: data.facebook,
    instagram: data.instagram,
    coverImagePath: data.cover_image_path ?? base.coverImagePath,
    menuItems,
    menuImages,
  };
}
