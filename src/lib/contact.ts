// Contact details are stored the way they were found: a handle, "@handle" or a
// full link. These turn them into working links for the cafe page.

const IG_HANDLE = /^[A-Za-z0-9._]{1,30}$/;

/** The Instagram username in "kiiro", "@kiiro" or "https://instagram.com/kiiro/". */
export function instagramHandle(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  let handle = v.replace(/^@/, "");
  if (/^https?:\/\//i.test(v) || /^(www\.)?instagram\.com\//i.test(v)) {
    try {
      const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      if (!/(^|\.)instagram\.com$/i.test(url.hostname)) return null;
      handle = url.pathname.split("/").filter(Boolean)[0] ?? "";
    } catch {
      return null;
    }
  }
  return IG_HANDLE.test(handle) ? handle : null;
}

/** A Facebook page link from a stored link, "@handle" or page name. */
export function facebookUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.|m\.)?facebook\.com\//i.test(v)) return `https://${v}`;
  const handle = v.replace(/^@/, "");
  return /^[A-Za-z0-9.]{2,80}$/.test(handle) ? `https://www.facebook.com/${handle}` : null;
}

/** A website link that always opens the site, even when stored without https://. */
export function websiteUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    return new URL(url).hostname.includes(".") ? url : null;
  } catch {
    return null;
  }
}

/** The address without https:// and a trailing slash, for showing on the page. */
export const websiteLabel = (url: string) => url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

/**
 * A tap-to-call link for a Philippine number such as "0917 621 1892" or
 * "(033) 501 6673", in international form so it works from any phone.
 */
export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 13) return null;
  if (digits.startsWith("63")) return `tel:+${digits}`;
  if (digits.startsWith("0")) return `tel:+63${digits.slice(1)}`;
  return `tel:${digits}`;
}
