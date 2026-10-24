import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDistance, directionsUrl, distanceMeters } from "../src/lib/geo.ts";
import { t } from "../src/lib/format.ts";
import { suggestTags } from "../src/lib/tags.ts";
import { slugify } from "../src/lib/slug.ts";

test("distanceMeters: two points about 1 km apart", () => {
  const a = { lat: 10.72, lng: 122.562 };
  const b = { lat: 10.729, lng: 122.562 };
  const d = distanceMeters(a, b);
  assert.ok(d > 990 && d < 1010, `got ${d}`);
});

test("distanceMeters: same point is zero", () => {
  const p = { lat: 10.72, lng: 122.562 };
  assert.equal(distanceMeters(p, p), 0);
});

test("formatDistance switches from meters to kilometers", () => {
  assert.equal(formatDistance(347), "350 m");
  assert.equal(formatDistance(999), "1.0 km");
  assert.equal(formatDistance(1000), "1.0 km");
  assert.equal(formatDistance(1349), "1.3 km");
});

test("directionsUrl hands off to Google Maps with coordinates", () => {
  assert.equal(
    directionsUrl({ lat: 10.7202, lng: 122.5621 }),
    "https://www.google.com/maps/dir/?api=1&destination=10.7202,122.5621",
  );
});

test("t fills placeholders and leaves unknown ones", () => {
  assert.equal(t("{count} cafes", { count: 5 }), "5 cafes");
  assert.equal(t("{a} and {b}", { a: "x" }), "x and {b}");
});

test("suggestTags only suggests from the name", () => {
  assert.deepEqual(suggestTags("Chapter Coffee Roastery & Cafe"), ["specialty_coffee"]);
  assert.deepEqual(suggestTags("Mostly Matcha"), ["matcha"]);
  assert.deepEqual(suggestTags("Madge Cafe"), []);
});

test("slugify strips accents and symbols", () => {
  assert.equal(slugify("Café Año"), "cafe-ano");
  assert.equal(slugify("Kofi & Kompany"), "kofi-and-kompany");
  assert.equal(slugify("  --Hello!!  "), "hello");
});
