import assert from "node:assert/strict";
import { test } from "node:test";
import { formatHours, manilaNow, openState, parseHours } from "../src/lib/hours.ts";

// 2026-11-04 is a Wednesday. Manila is UTC+8.
const manila = (iso: string) => new Date(`${iso}+08:00`);

test("formatHours: same hours every day", () => {
  assert.equal(formatHours("Mo-Su 08:00-22:00"), "Daily 8 AM–10 PM");
  assert.equal(formatHours("09:00-18:00"), "Daily 9 AM–6 PM");
  assert.equal(formatHours("Mo-Su 00:00-24:00"), "Daily Open 24 hours");
});

test("formatHours: groups days and keeps closed days", () => {
  assert.equal(
    formatHours("Mo-Fr 07:30-17:00; Sa 09:00-14:00; Su off"),
    "Mon–Fri 7:30 AM–5 PM · Sat 9 AM–2 PM · Sun Closed",
  );
  assert.equal(
    formatHours("Tu-Su 10:00-14:00,17:00-22:00", "fil"),
    "Lun walang nakalista · Mar–Lin 10 AM–2 PM, 5 PM–10 PM",
  );
});

test("formatHours: days without hours are marked, not hidden", () => {
  assert.equal(formatHours("Mo-Sa 09:00-22:00"), "Mon–Sat 9 AM–10 PM · Sun not listed");
  assert.equal(
    formatHours("Tu-Sa 07:00-22:00"),
    "Mon not listed · Tue–Sat 7 AM–10 PM · Sun not listed",
  );
});

test("formatHours: unknown formats are shown as stored", () => {
  assert.equal(formatHours("sunrise-sunset"), "sunrise-sunset");
  assert.equal(formatHours(null), null);
});

test("parseHours: public holiday marker is ignored", () => {
  const w = parseHours("Mo-Su,PH 10:00-22:00");
  assert.ok(w);
  assert.deepEqual(w![0], [[600, 1320]]);
});

test("manilaNow uses Philippine time", () => {
  assert.deepEqual(manilaNow(new Date("2026-11-04T01:30:00Z")), { day: 2, min: 9 * 60 + 30 });
});

test("openState: open, closed and opening later", () => {
  const h = "Mo-Su 08:00-22:00";
  assert.deepEqual(openState(h, manila("2026-11-04T09:00:00")), { open: true, closesAt: 1320 });
  assert.deepEqual(openState(h, manila("2026-11-04T07:00:00")), { open: false, opensAt: 480, opensDay: null });
  assert.deepEqual(openState(h, manila("2026-11-04T23:00:00")), { open: false, opensAt: 480, opensDay: 3 });
});

test("openState: late-night hours run past midnight", () => {
  const h = "Mo-Su 18:00-02:00";
  assert.deepEqual(openState(h, manila("2026-11-04T23:30:00")), { open: true, closesAt: 120 });
  assert.deepEqual(openState(h, manila("2026-11-05T01:00:00")), { open: true, closesAt: 120 });
});

test("openState: closed day and unknown day", () => {
  assert.deepEqual(openState("Mo-Tu 08:00-17:00; We off; Th-Fr 08:00-17:00", manila("2026-11-04T10:00:00")), {
    open: false,
    opensAt: 480,
    opensDay: 3,
  });
  assert.equal(openState("Mo-Tu 08:00-17:00", manila("2026-11-04T10:00:00")), null);
  assert.deepEqual(openState("Mo-Su 00:00-24:00", manila("2026-11-04T03:00:00")), { open: true, closesAt: null });
});
