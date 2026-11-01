// A menu item as read from a photo or edited in the admin review list, before
// it is saved. Shared by the server actions and the admin page.

export type ReadItem = {
  category: string | null;
  name: string;
  price_php: number | null;
  description: string | null;
};

const MAX_ITEMS = 300;

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim().slice(0, max);
  return t || null;
};

const price = (v: unknown): number | null => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v.replace(/[₱,\s]/g, "")) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n < 100_000
    ? Math.round(n * 100) / 100
    : null;
};

/** Keeps only well-formed items: a name is required, everything else may be empty. */
export function cleanMenuItems(raw: unknown): ReadItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ReadItem[] = [];
  for (const r of raw.slice(0, MAX_ITEMS)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const name = str(o.name, 120);
    if (!name) continue;
    out.push({
      name,
      category: str(o.category, 60),
      price_php: price(o.price_php),
      description: str(o.description, 200),
    });
  }
  return out;
}
