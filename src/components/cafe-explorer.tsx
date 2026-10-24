"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Cafe } from "@/lib/cafes";
import { t } from "@/lib/format";
import { distanceMeters, ILOILO_CENTER, type LatLng } from "@/lib/geo";
import type { Locale } from "@/lib/i18n";
import { CafeCard } from "./cafe-card";
import { LanguageSwitch } from "./language-switch";
import { MapView } from "./map-view";

type TagFilter = "all" | "specialty_coffee" | "matcha";
type GeoState = "idle" | "locating" | "ok" | "denied" | "unavailable";

// Visitors farther than this from Iloilo get the whole-city view instead.
const MAX_DISTANCE_FROM_ILOILO_M = 40_000;
const SHEET_HEIGHT = 230;

const chipClass = (on: boolean) =>
  `shrink-0 rounded border px-3 py-1.5 text-sm font-semibold ${
    on
      ? "border-ember bg-ember text-roast"
      : "border-line bg-crema text-foam hover:border-ember"
  }`;

// With no location, local specialty cafes come first, then other local cafes, then chains.
function rank(c: Cafe): number {
  if (c.isChain) return 2;
  return c.tags.includes("specialty_coffee") ? 0 : 1;
}

export function CafeExplorer({
  cafes,
  lang,
  dict,
}: {
  cafes: Cafe[];
  lang: Locale;
  dict: Dictionary;
}) {
  const [view, setView] = useState<"map" | "list">("map");
  const [tagFilter, setTagFilter] = useState<TagFilter>("all");
  const [menuOnly, setMenuOnly] = useState(false);
  const [includeChains, setIncludeChains] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [geo, setGeo] = useState<GeoState>("idle");

  const visible = useMemo(() => {
    const filtered = cafes.filter(
      (c) =>
        (includeChains || !c.isChain) &&
        (tagFilter === "all" || c.tags.includes(tagFilter)) &&
        (!menuOnly || c.hasMenu),
    );
    const withDistance = filtered.map((cafe) => ({
      cafe,
      distance: userPos ? distanceMeters(userPos, cafe) : undefined,
    }));
    return withDistance.sort((a, b) =>
      a.distance !== undefined && b.distance !== undefined
        ? a.distance - b.distance
        : rank(a.cafe) - rank(b.cafe) || a.cafe.name.localeCompare(b.cafe.name),
    );
  }, [cafes, includeChains, tagFilter, menuOnly, userPos]);

  const visibleCafes = useMemo(() => visible.map((v) => v.cafe), [visible]);
  const selected = visible.find((v) => v.cafe.id === selectedId) ?? null;

  function locate() {
    if (!navigator.geolocation) {
      setGeo("unavailable");
      return;
    }
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        if (distanceMeters(pos, ILOILO_CENTER) > MAX_DISTANCE_FROM_ILOILO_M) {
          setGeo("unavailable");
          return;
        }
        setUserPos(pos);
        setGeo("ok");
      },
      (err) => setGeo(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const geoMessage =
    geo === "denied"
      ? dict.home.locationDenied
      : geo === "unavailable"
        ? dict.home.locationUnavailable
        : null;
  const count =
    visible.length === 1
      ? dict.home.resultsOne
      : t(dict.home.results, { count: visible.length });

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex h-dvh flex-col">
      <header className="flex flex-col gap-3 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold uppercase leading-none">
            {dict.meta.title}
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={locate}
              disabled={geo === "locating"}
              className="rounded border border-line bg-crema px-3 py-1 text-sm font-semibold text-ember hover:border-ember disabled:opacity-60"
            >
              ◎ {geo === "locating" ? dict.home.locating : dict.home.nearMe}
            </button>
            <LanguageSwitch
              current={lang}
              label={dict.language.label}
              names={{ en: dict.language.en, fil: dict.language.fil }}
            />
          </div>
        </div>

        <div
          role="group"
          aria-label={dict.filters.label}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        >
          {(
            [
              ["all", dict.filters.all],
              ["specialty_coffee", dict.filters.specialty],
              ["matcha", dict.filters.matcha],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={tagFilter === key}
              onClick={() => setTagFilter(key)}
              className={chipClass(tagFilter === key)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={menuOnly}
            onClick={() => setMenuOnly((v) => !v)}
            className={chipClass(menuOnly)}
          >
            {dict.filters.menu}
          </button>
          <button
            type="button"
            aria-pressed={includeChains}
            onClick={() => setIncludeChains((v) => !v)}
            className={chipClass(includeChains)}
          >
            {dict.filters.chains}
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div
            role="group"
            aria-label={dict.view.label}
            className="grid grid-cols-2 overflow-hidden rounded border border-line"
          >
            {(["map", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`px-5 py-1.5 font-display text-sm font-bold uppercase tracking-widest ${
                  view === v ? "bg-crema text-foam" : "text-mute"
                }`}
              >
                {dict.view[v]}
              </button>
            ))}
          </div>
          <p className="text-sm text-mute" aria-live="polite">
            {count}
          </p>
        </div>
        {geoMessage && <p className="text-sm text-mute">{geoMessage}</p>}
      </header>

      {view === "map" ? (
        <div className="relative flex-1">
          <MapView
            className="absolute inset-0"
            cafes={visibleCafes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            userPos={userPos}
            bottomPadding={SHEET_HEIGHT}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-roast/95 p-3 pb-5 backdrop-blur">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selected ? selected.cafe.id : "hint"}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {selected ? (
                  <CafeCard
                    sheet
                    cafe={selected.cafe}
                    distance={selected.distance}
                    lang={lang}
                    dict={dict}
                  />
                ) : (
                  <p className="py-6 text-center text-mute">
                    {visible.length === 0
                      ? dict.home.noResults
                      : dict.home.selectHint}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
            <p className="mt-2 flex items-center justify-between gap-3 text-xs text-mute">
              <Link href={`/${lang}/suggest`} className="underline">
                {dict.home.suggest}
              </Link>
              <span>{dict.footer.osmCredit}</span>
            </p>
          </div>
        </div>
      ) : (
        <main className="flex-1 overflow-y-auto px-4 pb-8">
          {visible.length === 0 ? (
            <p className="py-10 text-center text-mute">{dict.home.noResults}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map(({ cafe, distance }, i) => (
                <motion.li
                  key={cafe.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  // Only the first screenful staggers; the rest appear together.
                  transition={{ duration: 0.25, ease: "easeOut", delay: Math.min(i, 8) * 0.04 }}
                >
                  <CafeCard cafe={cafe} distance={distance} lang={lang} dict={dict} />
                </motion.li>
              ))}
            </ul>
          )}
          <p className="mt-6 flex flex-col gap-1 text-xs text-mute">
            <Link href={`/${lang}/suggest`} className="underline">
              {dict.home.suggest}
            </Link>
            <span>{dict.footer.osmCredit}</span>
          </p>
        </main>
      )}
    </div>
    </MotionConfig>
  );
}
