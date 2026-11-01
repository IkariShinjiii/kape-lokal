import assert from "node:assert/strict";
import { test } from "node:test";
import { isMenuQuery, menuKey, searchMenus, type MenuEntry } from "../src/lib/menu-search.ts";

const entries: MenuEntry[] = [
  { cafeId: "a", name: "Caramel Macchiato", category: "Espresso", price: 150 },
  { cafeId: "a", name: "Iced Salted Caramel Macchiato", category: "Espresso", price: 175 },
  { cafeId: "a", name: "Americano", category: "Espresso", price: 110 },
  { cafeId: "b", name: "Iced Spanish Latte", category: null, price: 140 },
  { cafeId: "b", name: "Caramel", category: "Frappés", price: 160 },
  { cafeId: "c", name: "Cappuccino", category: "Hot Coffee", price: null },
  { cafeId: "d", name: "Matcha Latte", category: "Non-coffee", price: 165 },
];

test("menuKey: accents, case, punctuation and doubled letters", () => {
  assert.equal(menuKey("Frappé"), "frape");
  assert.equal(menuKey("CAPPUCCINO"), "capucino");
  assert.equal(menuKey("Café-Latte (16oz)"), "cafe late 16oz");
});

test("misspelled drink still matches", () => {
  const hits = searchMenus("caramel machiato", entries);
  assert.deepEqual(Object.keys(hits), ["a"]);
  // The closest name wins; the other macchiato is counted as one more.
  assert.deepEqual(hits.a, { item: "Caramel Macchiato", price: 150, more: 1 });
  assert.ok(searchMenus("capuccino", entries).c);
});

test("words match in any order and as prefixes", () => {
  assert.ok(searchMenus("latte iced", entries).b);
  assert.ok(searchMenus("span lat", entries).b);
});

test("a menu section counts toward the match", () => {
  const hits = searchMenus("frappe", entries);
  assert.equal(hits.b?.item, "Caramel");
  // But the item's own name ranks above a section match at the same cafe.
  assert.equal(searchMenus("caramel", entries).b?.item, "Caramel");
});

test("one hit per cafe, every typed word required", () => {
  const latte = searchMenus("latte", entries);
  assert.deepEqual(Object.keys(latte).sort(), ["b", "d"]);
  assert.deepEqual(searchMenus("matcha espresso", entries), {});
});

test("short queries don't search menus", () => {
  assert.equal(isMenuQuery("la"), false);
  assert.equal(isMenuQuery("lat"), true);
  assert.deepEqual(searchMenus("la", entries), {});
});
