import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // The admin pages exist under every language prefix.
    rules: { userAgent: "*", allow: "/", disallow: [...locales.map((l) => `/${l}/admin`), "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
