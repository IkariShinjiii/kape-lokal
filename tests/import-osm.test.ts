import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectChains,
  isNotCafe,
  pickAddress,
  registerSpot,
  sqlText,
} from "../scripts/import-osm.ts";

const el = (id: number, name: string, tags: Record<string, string> = {}) => ({
  type: "node" as const,
  id,
  lat: 10.7,
  lon: 122.5,
  tags: { name, ...tags },
});

test("sqlText escapes quotes and turns empty into null", () => {
  assert.equal(sqlText("Sailor's Cafe"), "'Sailor''s Cafe'");
  assert.equal(sqlText(""), "null");
  assert.equal(sqlText(null), "null");
});

test("isNotCafe catches non-cafes but not real ones", () => {
  assert.equal(isNotCafe("Toykits Internet Cafe"), true);
  assert.equal(isNotCafe("Love and Kisses Pizza"), true);
  assert.equal(isNotCafe("Madge Cafe"), false);
});

test("registerSpot rejects the same name within 15 m, even across a rounding boundary", () => {
  const seen = new Map();
  assert.equal(registerSpot(seen, "Coffee Break Nxt", 10.7128544, 122.5516902), true);
  // About 5 m away, and it rounds to a different 4-decimal bucket.
  assert.equal(registerSpot(seen, "coffee break nxt", 10.71290, 122.5516902), false);
  // Same name far away is a different branch.
  assert.equal(registerSpot(seen, "Coffee Break Nxt", 10.7200, 122.5516902), true);
  // Different name at the same spot is a different cafe.
  assert.equal(registerSpot(seen, "Other Cafe", 10.7128544, 122.5516902), true);
});

test("detectChains flags known chains, brand-tagged and repeated names, not local cafes", () => {
  const chains = detectChains([
    el(1, "Starbucks"),
    el(2, "Some Brand", { "brand:wikidata": "Q1" }),
    el(3, "Branchy"),
    el(4, "Branchy"),
    el(5, "Branchy"),
    el(6, "Madge Cafe"),
    el(7, "Madge Cafe"),
    el(8, "Local Roasters"),
  ]);
  assert.deepEqual(
    [...chains].sort(),
    ["node/1", "node/2", "node/3", "node/4", "node/5"],
  );
});

test("pickAddress builds a short address from OSM tags", () => {
  assert.equal(
    pickAddress({ "addr:housenumber": "19", "addr:street": "Jalandoni Street" }),
    "19 Jalandoni Street",
  );
  assert.equal(pickAddress({}), null);
});
