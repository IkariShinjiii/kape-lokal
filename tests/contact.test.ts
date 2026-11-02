import assert from "node:assert/strict";
import { test } from "node:test";
import { facebookUrl, instagramHandle, telHref, websiteLabel, websiteUrl } from "../src/lib/contact.ts";

test("instagramHandle reads handles and full links", () => {
  assert.equal(instagramHandle("nuwavecoffeeph"), "nuwavecoffeeph");
  assert.equal(instagramHandle("@healthykitchencafe.ilo"), "healthykitchencafe.ilo");
  assert.equal(instagramHandle("https://www.instagram.com/kiirobyzarcreme/"), "kiirobyzarcreme");
  assert.equal(instagramHandle("instagram.com/kiirobyzarcreme?igsh=abc"), "kiirobyzarcreme");
  assert.equal(instagramHandle("https://example.com/kiiro"), null);
  assert.equal(instagramHandle(""), null);
});

test("facebookUrl builds a page link from any stored form", () => {
  assert.equal(facebookUrl("https://www.facebook.com/zarcremecoffee"), "https://www.facebook.com/zarcremecoffee");
  assert.equal(facebookUrl("@healthykitchencafe.ilo"), "https://www.facebook.com/healthykitchencafe.ilo");
  assert.equal(facebookUrl("HOUSEOFMONKEYSCAFE"), "https://www.facebook.com/HOUSEOFMONKEYSCAFE");
  assert.equal(facebookUrl("facebook.com/cafegloriaph"), "https://facebook.com/cafegloriaph");
  assert.equal(facebookUrl("not a page"), null);
});

test("websiteUrl adds https:// when it is missing", () => {
  assert.equal(websiteUrl("https://healthykitchen.com.ph"), "https://healthykitchen.com.ph");
  assert.equal(websiteUrl("www.example.ph"), "https://www.example.ph");
  assert.equal(websiteUrl("nonsense"), null);
  assert.equal(websiteLabel("https://www.healthykitchen.com.ph/"), "healthykitchen.com.ph");
});

test("telHref gives Philippine numbers the +63 code", () => {
  assert.equal(telHref("0917 621 1892"), "tel:+639176211892");
  assert.equal(telHref("(033) 501 6673"), "tel:+63335016673");
  assert.equal(telHref("+63 917 621 1892"), "tel:+639176211892");
  assert.equal(telHref("123"), null);
});
