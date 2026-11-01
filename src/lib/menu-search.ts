// Finds cafes whose menu has what the visitor typed, e.g. "caramel macchiato".
// Shared by the /api/menu-search route and its tests.

export type MenuEntry = {
  cafeId: string;
  name: string;
  category: string | null;
  price: number | null;
};

/** The best matching item at one cafe, plus how many other items also match. */
export type MenuHit = { item: string; price: number | null; more: number };

/** Queries shorter than this (letters and digits) don't search menus. */
export const MIN_MENU_QUERY = 3;

/**
 * Text for forgiving comparison: lowercase, no accents or punctuation, and
 * doubled letters collapsed, so common misspellings still match
 * ("machiato" / "macchiato", "capuccino" / "cappuccino", "frape" / "frappé").
 */
export function menuKey(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/([a-z])\1+/g, "$1")
    .trim();
}

export const isMenuQuery = (q: string) => menuKey(q).replace(/ /g, "").length >= MIN_MENU_QUERY;

const words = (s: string) => menuKey(s).split(" ").filter(Boolean);

/**
 * Every typed word must start a word of the item's name or its menu section,
 * so "iced latte" finds "Iced Spanish Latte", and "frappe" finds a "Caramel"
 * listed under "Frappés". Returns one hit per cafe, keyed by cafe id.
 */
export function searchMenus(query: string, entries: MenuEntry[]): Record<string, MenuHit> {
  if (!isMenuQuery(query)) return {};
  const want = words(query);
  const best = new Map<string, { score: number; entry: MenuEntry; count: number }>();

  for (const entry of entries) {
    const name = words(entry.name);
    const inName = want.every((w) => name.some((n) => n.startsWith(w)));
    if (!inName) {
      const all = entry.category ? [...name, ...words(entry.category)] : name;
      if (!want.every((w) => all.some((n) => n.startsWith(w)))) continue;
    }
    // Closest match first: every word in the item's own name, then the fewest
    // extra words ("Caramel Macchiato" before "Iced Salted Caramel Macchiato").
    const score = (inName ? 0 : 100) + name.length;
    const prev = best.get(entry.cafeId);
    if (!prev) best.set(entry.cafeId, { score, entry, count: 1 });
    else {
      prev.count += 1;
      if (score < prev.score) {
        prev.score = score;
        prev.entry = entry;
      }
    }
  }

  const hits: Record<string, MenuHit> = {};
  for (const [cafeId, { entry, count }] of best) {
    hits[cafeId] = { item: entry.name, price: entry.price, more: count - 1 };
  }
  return hits;
}
