import { cacheLife, cacheTag } from "next/cache";
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
  coverImagePath: string | null;
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
};

const toCafe = (r: ListRow): Cafe => ({
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
});

// All published cafes, chains included. The client hides chains unless asked.
export async function getCafes(): Promise<Cafe[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("cafes");

  const { data, error } = await createPublicClient().rpc("list_cafes");
  if (error) throw new Error(`list_cafes failed: ${error.message}`);
  return (data as ListRow[]).map(toCafe);
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
    coverImagePath: data.cover_image_path,
    menuItems,
    menuImages,
  };
}
