// Opening hours are stored in OpenStreetMap's compact format, for example
// "Mo-Su 08:00-22:00" or "Mo-Fr 07:00-17:00; Sa 09:00-14:00; Su off".
// This turns them into readable text and works out whether a cafe is open now.
// Only the common forms are understood; anything else is shown as stored.

export type Locale = "en" | "fil";

const CODES = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const SHORT: Record<Locale, string[]> = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  fil: ["Lun", "Mar", "Miy", "Huw", "Biy", "Sab", "Lin"],
};
const DAILY: Record<Locale, string> = { en: "Daily", fil: "Araw-araw" };
const CLOSED: Record<Locale, string> = { en: "Closed", fil: "Sarado" };
const ALL_DAY: Record<Locale, string> = { en: "Open 24 hours", fil: "Bukas 24 oras" };
const NOT_LISTED: Record<Locale, string> = { en: "not listed", fil: "walang nakalista" };

/** Minutes from midnight; an end of 24:00 is 1440. */
type Range = [number, number];
/** Monday first. null = not stated. [] = closed that day. */
export type Week = (Range[] | null)[];

const toMin = (t: string) => {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const v = +m[1] * 60 + +m[2];
  return v <= 1440 ? v : null;
};

function parseDays(spec: string): number[] | null {
  const out: number[] = [];
  for (const part of spec.split(",")) {
    if (part === "PH") continue; // public holidays: ignored
    const [a, b] = part.split("-");
    const i = CODES.indexOf(a as (typeof CODES)[number]);
    if (i < 0) return null;
    if (b === undefined) {
      out.push(i);
      continue;
    }
    const j = CODES.indexOf(b as (typeof CODES)[number]);
    if (j < 0) return null;
    for (let k = i; ; k = (k + 1) % 7) {
      out.push(k);
      if (k === j) break;
    }
  }
  return out;
}

function parseRanges(spec: string): Range[] | null {
  if (spec === "off" || spec === "closed") return [];
  if (spec === "24/7") return [[0, 1440]];
  const out: Range[] = [];
  for (const part of spec.split(",")) {
    const [a, b] = part.split("-");
    const s = toMin(a ?? "");
    const e = toMin(b ?? "");
    if (s === null || e === null) return null;
    out.push([s, e]);
  }
  return out;
}

/** The week's hours, or null if the text is in a form we don't understand. */
export function parseHours(osm: string | null | undefined): Week | null {
  if (!osm) return null;
  const text = osm.trim();
  if (text === "24/7") return Array.from({ length: 7 }, () => [[0, 1440]] as Range[]);
  const week: Week = Array(7).fill(null);
  for (const rule of text.split(/\s*;\s*/).filter(Boolean)) {
    const m = rule.match(/^(?:([A-Za-z,-]+)\s+)?(.+)$/);
    if (!m) return null;
    const days = m[1] ? parseDays(m[1]) : [0, 1, 2, 3, 4, 5, 6];
    const ranges = parseRanges(m[2].trim());
    if (!days || !ranges) return null;
    for (const d of days) week[d] = ranges;
  }
  return week;
}

/** "8 AM", "8:30 PM", "12 MN" style clock times. */
export function clock(min: number): string {
  const m = min % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const ap = h < 12 ? "AM" : "PM";
  return mm ? `${h12}:${String(mm).padStart(2, "0")} ${ap}` : `${h12} ${ap}`;
}

const rangeText = (r: Range[], locale: Locale) =>
  r.length === 0
    ? CLOSED[locale]
    : r.length === 1 && r[0][0] === 0 && r[0][1] === 1440
      ? ALL_DAY[locale]
      : r.map(([s, e]) => `${clock(s)}–${clock(e)}`).join(", ");

/**
 * Readable hours, e.g. "Daily 8 AM–10 PM" or "Mon–Fri 7 AM–5 PM · Sat 9 AM–2 PM".
 * Falls back to the stored text when it can't be read.
 */
export function formatHours(osm: string | null | undefined, locale: Locale = "en"): string | null {
  if (!osm) return null;
  const week = parseHours(osm);
  if (!week) return osm;
  const key = (r: Range[] | null) => (r === null ? "?" : JSON.stringify(r));
  // Days with no stated hours stay in the list as "not listed", so a gap is never
  // read as closed.
  const groups: { from: number; to: number; r: Range[] | null }[] = [];
  for (let i = 0; i < 7; i++) {
    const r = week[i];
    const last = groups[groups.length - 1];
    if (last && last.to === i - 1 && key(last.r) === key(r)) last.to = i;
    else groups.push({ from: i, to: i, r });
  }
  if (groups.every((g) => g.r === null)) return osm;
  if (groups.length === 1 && groups[0].r) {
    return `${DAILY[locale]} ${rangeText(groups[0].r, locale)}`;
  }
  const names = SHORT[locale];
  return groups
    .map(({ from, to, r }) => {
      const days = from === to ? names[from] : `${names[from]}–${names[to]}`;
      return `${days} ${r ? rangeText(r, locale) : NOT_LISTED[locale]}`;
    })
    .join(" · ");
}

export type OpenState =
  | { open: true; closesAt: number | null } // null: open all day
  | { open: false; opensAt: number | null; opensDay: number | null };

/** Day (Monday = 0) and minute of the day in the Philippines, whatever the visitor's clock. */
export function manilaNow(now: Date = new Date()): { day: number; min: number } {
  const shifted = new Date(now.getTime() + 8 * 3600_000); // UTC+8, no daylight saving
  return { day: (shifted.getUTCDay() + 6) % 7, min: shifted.getUTCHours() * 60 + shifted.getUTCMinutes() };
}

/** Whether the cafe is open at this moment, or null when its hours aren't known for today. */
export function openState(osm: string | null | undefined, now: Date = new Date()): OpenState | null {
  const week = parseHours(osm);
  if (!week) return null;
  const { day, min } = manilaNow(now);
  const today = week[day];
  const yesterday = week[(day + 6) % 7];
  if (today === null) return null;

  // Still inside last night's late shift (e.g. 18:00-02:00).
  for (const [s, e] of yesterday ?? []) {
    if (e < s && min < e) return { open: true, closesAt: e };
  }
  for (const [s, e] of today) {
    if (s === 0 && e === 1440) return { open: true, closesAt: null };
    const end = e <= s ? e + 1440 : e;
    if (min >= s && min < end) return { open: true, closesAt: e % 1440 };
  }
  // Closed: find the next opening, today or within the week.
  const later = today.filter(([s]) => s > min).sort((a, b) => a[0] - b[0])[0];
  if (later) return { open: false, opensAt: later[0], opensDay: null };
  for (let k = 1; k <= 7; k++) {
    const d = (day + k) % 7;
    const r = week[d];
    if (r && r.length) return { open: false, opensAt: r[0][0], opensDay: d };
  }
  return { open: false, opensAt: null, opensDay: null };
}

export const dayName = (d: number, locale: Locale) => SHORT[locale][d];
