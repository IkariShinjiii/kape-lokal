export const CAFE_TAGS = [
  "specialty_coffee",
  "matcha",
  "pastry",
  "work_friendly",
  "pet_friendly",
] as const;
export type CafeTag = (typeof CAFE_TAGS)[number];

// Admin helper: tags worth a look based on the cafe's name. These are suggestions only.
// A tag is never saved without the admin confirming it.
const HINTS: { tag: CafeTag; words: string[] }[] = [
  {
    tag: "specialty_coffee",
    words: ["roaster", "roastery", "espresso", "specialty", "pour over", "brew", "single origin", "coffee lab"],
  },
  { tag: "matcha", words: ["matcha"] },
  { tag: "pastry", words: ["pastry", "pastries", "bakery", "bake", "dessert"] },
];

export function suggestTags(name: string): CafeTag[] {
  const lower = name.toLowerCase();
  return HINTS.filter((h) => h.words.some((w) => lower.includes(w))).map((h) => h.tag);
}
