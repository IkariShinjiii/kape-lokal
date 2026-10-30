// A cafe's logo is its Facebook page's profile picture, served through our own
// /api/logo route so visitors' browsers never talk to Facebook directly.

const KEY = /^[A-Za-z0-9.]{2,80}$/;

/** The Facebook page id or username in a stored facebook value, or null. */
export function facebookKey(facebook: string | null | undefined): string | null {
  if (!facebook) return null;
  const v = facebook.trim();
  let key: string | null = null;
  if (/^https?:\/\//i.test(v)) {
    try {
      const url = new URL(v);
      if (!/(^|\.)facebook\.com$/i.test(url.hostname)) return null;
      key = url.searchParams.get("id") ?? url.pathname.split("/").filter(Boolean)[0] ?? null;
      if (key === "profile.php") key = null;
    } catch {
      return null;
    }
  } else {
    key = v.replace(/^@/, "");
  }
  return key && KEY.test(key) ? key : null;
}

export function logoUrl(facebook: string | null | undefined): string | null {
  const key = facebookKey(facebook);
  return key ? `/api/logo/${encodeURIComponent(key)}` : null;
}

export const isLogoKey = (key: string) => KEY.test(key);
