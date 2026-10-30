import type { MetadataRoute } from "next";
import { getCafes } from "@/lib/cafes";
import { locales } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

// Every page in each language, with the other languages listed as alternates.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cafes = await getCafes();
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}/en${path}`,
    changeFrequency: "weekly",
    priority,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
  });
  return [page("", 1), page("/suggest", 0.3), ...cafes.map((c) => page(`/cafes/${c.slug}`, 0.7))];
}
