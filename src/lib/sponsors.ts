// Paid placements. A sponsored cafe is listed first in the list view and always
// carries a visible "Sponsored" label, so visitors can tell ads from the rest.
// Add an entry when a cafe pays, with the last day of the deal; it switches off
// by itself after that date. Empty means no sponsors and nothing changes.
export type Sponsorship = {
  slug: string;
  /** Last day shown, YYYY-MM-DD, in Philippine time. */
  until: string;
};

export const SPONSORSHIPS: Sponsorship[] = [];

/** Slugs of the sponsorships running today. */
export function activeSponsorSlugs(now: Date = new Date()): Set<string> {
  const today = new Date(now.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
  return new Set(SPONSORSHIPS.filter((s) => s.until >= today).map((s) => s.slug));
}
