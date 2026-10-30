// The public address of the site. Set NEXT_PUBLIC_SITE_URL when a custom domain
// is connected; until then the Vercel address is used.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://kape-lokal.vercel.app").replace(/\/$/, "");
