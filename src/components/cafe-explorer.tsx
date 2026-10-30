"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Cafe } from "@/lib/cafes";
import { t } from "@/lib/format";
import { distanceMeters, ILOILO_CENTER, type LatLng } from "@/lib/geo";
import type { Locale } from "@/lib/i18n";
import { useFavorites } from "@/lib/favorites";
import { openState } from "@/lib/hours";
import { CafeCard } from "./cafe-card";
import { CafePreview } from "./cafe-preview";
import { CafeSearch, searchText } from "./cafe-search";
import { LanguageSwitch } from "./language-switch";
import { DISTRICT_ZOOM, DISTRICTS } from "@/lib/map-extras";
import { MapView, type HoverInfo, type MapApi, type ViewBounds } from "./map-view";
import { ThemeToggle } from "./theme-toggle";

type TagFilter = "all" | "specialty_coffee" | "matcha";
type GeoState = "idle" | "locating" | "ok" | "denied" | "unavailable";

// Visitors farther than this from Iloilo get the whole-city view instead.
const MAX_DISTANCE_FROM_ILOILO_M = 40_000;
const SHEET_HEIGHT = 215;
// The hover preview is 256px wide and about 230px tall.
const PREVIEW_HALF_WIDTH = 136;
const PREVIEW_FLIP_BELOW_Y = 270;

// 40px tall: a comfortable thumb target.
const pillBase =
  "grid min-h-10 shrink-0 place-items-center whitespace-nowrap rounded-full border px-4 text-sm font-semibold shadow-sm backdrop-blur transition duration-200 active:scale-95";
// Keeps the controls clear of the notch and the screen edges.
const safeX = "pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]";
// On/off filters: outlined when on, so solid orange only ever marks the chosen
// option inside a segmented group.
const pillClass = (on: boolean) =>
  `${pillBase} bg-crema/90 ${
    on ? "border-ember text-ember" : "border-line text-foam hover:border-ember"
  }`;
// A 40px rounded frame holding pick-one options (Map/List, All/Specialty/Matcha).
const segmentGroup =
  "box-border flex h-10 shrink-0 gap-0.5 rounded-full border border-line bg-crema/90 p-[3px] shadow-sm backdrop-blur";

// Round 40px buttons on the map's right edge, centred icons (no side padding).
const railButton =
  "grid size-10 place-items-center rounded-full border border-line bg-crema/90 text-foam shadow-sm backdrop-blur transition duration-200 hover:border-ember hover:text-ember active:scale-95";
const railStackButton =
  "grid size-10 place-items-center text-foam transition-colors duration-200 hover:text-ember active:bg-roast/40";

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
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [userPos, setUserPos] = useState<LatLng | null>(null);
  const [geo, setGeo] = useState<GeoState>("idle");
  const [bounds, setBounds] = useState<ViewBounds | null>(null);
  const [districtsOpen, setDistrictsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  // The clock behind "Open now", moved on every minute while that filter is on.
  const [now, setNow] = useState(() => Date.now());
  const { ids: savedIds } = useFavorites();
  const mapApi = useRef<MapApi | null>(null);
  const districtsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openOnly) return;
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [openOnly]);

  // The district menu closes on a click outside it or on Escape.
  useEffect(() => {
    if (!districtsOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (!districtsRef.current?.contains(e.target as Node)) setDistrictsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDistrictsOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [districtsOpen]);

  const visible = useMemo(() => {
    const q = searchText(query.trim());
    const at = new Date(now);
    const filtered = cafes.filter(
      (c) =>
        (includeChains || !c.isChain) &&
        (tagFilter === "all" || c.tags.includes(tagFilter)) &&
        (!menuOnly || c.hasMenu) &&
        (!openOnly || openState(c.hours, at)?.open === true) &&
        (!savedOnly || savedIds.includes(c.id)) &&
        (!q || searchText(`${c.name} ${c.address ?? ""}`).includes(q)),
    );
    const withDistance = filtered.map((cafe) => ({
      cafe,
      distance: userPos ? distanceMeters(userPos, cafe) : undefined,
    }));
    // While searching, names that start with the text come first.
    const starts = (c: Cafe) => (q && searchText(c.name).startsWith(q) ? 0 : 1);
    return withDistance.sort(
      (a, b) =>
        starts(a.cafe) - starts(b.cafe) ||
        (a.distance !== undefined && b.distance !== undefined
          ? a.distance - b.distance
          : rank(a.cafe) - rank(b.cafe) || a.cafe.name.localeCompare(b.cafe.name)),
    );
  }, [cafes, includeChains, tagFilter, menuOnly, openOnly, savedOnly, savedIds, query, now, userPos]);

  const visibleCafes = useMemo(() => visible.map((v) => v.cafe), [visible]);
  const selected = visible.find((v) => v.cafe.id === selectedId) ?? null;
  // The sheet already shows the selected cafe, so only other pins get a preview.
  const hovered =
    hover && hover.id !== selectedId
      ? (visible.find((v) => v.cafe.id === hover.id)?.cafe ?? null)
      : null;

  function select(id: string | null) {
    setSelectedId(id);
    setHover(null);
  }

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
  const mapMode = view === "map";
  // How many of the filtered cafes are on screen right now.
  const inView = bounds
    ? visibleCafes.filter(
        (c) => c.lng >= bounds[0] && c.lat >= bounds[1] && c.lng <= bounds[2] && c.lat <= bounds[3],
      ).length
    : visible.length;
  const mapCount =
    visible.length === 0
      ? dict.home.noResults
      : inView < visible.length
        ? t(dict.home.inView, { count: inView, total: visible.length })
        : count;

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative flex h-dvh flex-col">
      {/* On the map the controls float over it, so the map gets the whole screen. */}
      <header
        className={
          mapMode
            ? `pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 ${safeX}`
            : `flex flex-col gap-2 border-b border-line pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 ${safeX}`
        }
      >
        <div className="relative flex items-center justify-between gap-2">
          <h1 className="pointer-events-auto grid min-h-10 place-items-center whitespace-nowrap rounded-full border border-line bg-crema/90 px-4 font-display text-xl font-bold uppercase leading-none tracking-wide shadow-sm backdrop-blur">
            {dict.meta.title}
          </h1>
          <div className="pointer-events-auto flex items-center gap-2">
            <CafeSearch
              query={query}
              onQuery={(q) => {
                setQuery(q);
                setSelectedId(null);
              }}
              matches={visibleCafes}
              onPick={(id) => {
                setQuery("");
                setSearchOpen(false);
                setView("map");
                select(id);
              }}
              strings={{
                placeholder: dict.home.search,
                clear: dict.home.searchClear,
                open: dict.home.search,
                noMatch: dict.home.noResults,
              }}
              mobileOpen={searchOpen}
              onMobileOpen={setSearchOpen}
            />
            {/* Icon only on phones so the header stays on one row. */}
            <button
              type="button"
              onClick={locate}
              disabled={geo === "locating"}
              aria-label={dict.home.nearMe}
              // Not pillBase: its side padding would push the icon off-centre in the
              // 40px circle used on phones.
              className="grid h-10 min-w-10 shrink-0 place-items-center rounded-full border border-line bg-crema/90 text-sm font-semibold text-ember shadow-sm backdrop-blur transition duration-200 hover:border-ember active:scale-95 disabled:opacity-60 sm:px-4"
            >
              <span
                aria-hidden
                className={`flex items-center gap-1.5 ${geo === "locating" ? "animate-pulse" : ""}`}
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
                <span className="hidden sm:inline">
                  {geo === "locating" ? dict.home.locating : dict.home.nearMe}
                </span>
              </span>
            </button>
            <ThemeToggle toLight={dict.theme.toLight} toDark={dict.theme.toDark} />
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
          // Scrolls sideways; the right edge fades out to hint that there is more.
          className={`pointer-events-auto -mx-3 flex items-center gap-2 overflow-x-auto px-3 pb-1 pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            mapMode ? "[mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)]" : ""
          }`}
        >
          <div
            role="group"
            aria-label={dict.view.label}
            className={segmentGroup}
          >
            {(["map", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`relative h-full rounded-full px-4 font-display text-sm font-bold uppercase tracking-widest transition-colors duration-200 ${
                  view === v ? "text-roast" : "text-mute"
                }`}
              >
                {view === v && (
                  <motion.span
                    layoutId="view-pill"
                    className="absolute inset-0 rounded-full bg-ember"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative">{dict.view[v]}</span>
              </button>
            ))}
          </div>
          {/* Pick-one filters share the Map/List segmented style, so every solid
              orange marker in the row is the same size. */}
          <div className={segmentGroup}>
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
                className={`relative h-full whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors duration-200 ${
                  tagFilter === key ? "text-roast" : "text-foam hover:text-ember"
                }`}
              >
                {tagFilter === key && (
                  <motion.span
                    layoutId="tag-pill"
                    className="absolute inset-0 rounded-full bg-ember"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative">{label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={openOnly}
            onClick={() => {
              setNow(Date.now());
              setOpenOnly((v) => !v);
            }}
            className={`${pillClass(openOnly)} grid-flow-col gap-1.5`}
          >
            <span aria-hidden className={`size-1.5 rounded-full ${openOnly ? "bg-leaf" : "bg-mute"}`} />
            {dict.filters.openNow}
          </button>
          <button
            type="button"
            aria-pressed={savedOnly}
            onClick={() => setSavedOnly((v) => !v)}
            className={`${pillClass(savedOnly)} grid-flow-col gap-1.5`}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill={savedOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
              <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z" />
            </svg>
            {dict.filters.saved}
            {savedIds.length > 0 && <span className="tabular-nums text-mute">{savedIds.length}</span>}
          </button>
          <button
            type="button"
            aria-pressed={menuOnly}
            onClick={() => setMenuOnly((v) => !v)}
            className={pillClass(menuOnly)}
          >
            {dict.filters.menu}
          </button>
          <button
            type="button"
            aria-pressed={includeChains}
            onClick={() => setIncludeChains((v) => !v)}
            className={pillClass(includeChains)}
          >
            {dict.filters.chains}
          </button>
          {!mapMode && (
            <p className="shrink-0 pl-1 text-sm text-mute" aria-live="polite">
              {count}
            </p>
          )}
        </div>
        {geoMessage && (
          <p className="pointer-events-auto w-fit rounded-full border border-line bg-crema/90 px-3 py-1 text-sm text-mute shadow-sm backdrop-blur">
            {geoMessage}
          </p>
        )}
      </header>

      {/* The map stays mounted while the list is showing, so switching back is
          instant instead of rebuilding the map. */}
      <div className={mapMode ? "absolute inset-0" : "hidden"}>
        <MapView
          className="map-floating absolute inset-0"
          cafes={visibleCafes}
          selectedId={selectedId}
          onSelect={select}
          onHover={setHover}
          onBoundsChange={setBounds}
          apiRef={mapApi}
          userPos={userPos}
          bottomPadding={selected ? SHEET_HEIGHT : 0}
        />

        <AnimatePresence>
          {hovered && hover && (
            <motion.div
              key={hovered.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="pointer-events-none absolute z-10"
              style={{
                left: Math.min(
                  Math.max(hover.x, PREVIEW_HALF_WIDTH),
                  hover.width - PREVIEW_HALF_WIDTH,
                ),
                translateX: "-50%",
                ...(hover.y > PREVIEW_FLIP_BELOW_Y
                  ? { bottom: hover.height - hover.y + 18 }
                  : { top: hover.y + 20 }),
              }}
            >
              <CafePreview cafe={hovered} dict={dict} lang={lang} />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!selected && (
            <motion.div
              key="map-footer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-none absolute bottom-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.5rem))] left-[max(0.75rem,env(safe-area-inset-left))] z-10 flex max-w-[calc(100%-8.5rem)] flex-col items-start gap-2"
            >
              <p
                aria-live="polite"
                className="pointer-events-auto grid min-h-9 place-items-center rounded-full border border-line bg-crema/90 px-3.5 text-xs font-semibold shadow-sm backdrop-blur"
              >
                {mapCount}
              </p>
              <Link
                href={`/${lang}/suggest`}
                className="pointer-events-auto grid min-h-9 place-items-center rounded-full border border-line bg-crema/90 px-3.5 text-xs text-mute shadow-sm backdrop-blur transition-colors hover:text-foam"
              >
                {dict.home.suggest}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map controls: a rail above the map credit. Zoom buttons are for mouse
            users; phones pinch, so they only get districts and show-all. */}
        <AnimatePresence>
          {!selected && (
            <motion.div
              key="map-rail"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-[calc(max(1.25rem,calc(env(safe-area-inset-bottom)+0.5rem))+2.25rem)] right-[max(0.75rem,env(safe-area-inset-right))] z-10 flex flex-col items-end gap-2"
            >
              <div ref={districtsRef} className="relative">
                <button
                  type="button"
                  aria-label={dict.home.districts}
                  aria-expanded={districtsOpen}
                  aria-haspopup="menu"
                  onClick={() => setDistrictsOpen((o) => !o)}
                  className={`${railButton} ${districtsOpen ? "border-ember text-ember" : ""}`}
                >
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5L9 4Z" />
                    <path d="M9 4v13.5M15 6.5V20" />
                  </svg>
                </button>
                <AnimatePresence>
                  {districtsOpen && (
                      <motion.div
                        role="menu"
                        aria-label={dict.home.districts}
                        initial={{ opacity: 0, x: 8, scale: 0.97 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 8, scale: 0.97 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="absolute bottom-0 right-12 z-10 flex w-44 origin-bottom-right flex-col gap-0.5 rounded-2xl border border-line bg-crema/95 p-1.5 shadow-lg backdrop-blur"
                      >
                        <p className="px-3 pb-1 pt-1.5 font-display text-xs font-bold uppercase tracking-widest text-mute">
                          {dict.home.districts}
                        </p>
                        {DISTRICTS.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setDistrictsOpen(false);
                              mapApi.current?.flyTo([...d.center], DISTRICT_ZOOM);
                            }}
                            className="min-h-10 rounded-xl px-3 text-left text-sm font-semibold text-foam transition-colors duration-150 hover:bg-roast/60 hover:text-ember"
                          >
                            {d.name}
                          </button>
                        ))}
                      </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="hidden flex-col overflow-hidden rounded-full border border-line bg-crema/90 shadow-sm backdrop-blur sm:flex">
                <button type="button" aria-label={dict.home.zoomIn} onClick={() => mapApi.current?.zoomIn()} className={railStackButton}>
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
                </button>
                <span aria-hidden className="mx-2.5 h-px bg-line" />
                <button type="button" aria-label={dict.home.zoomOut} onClick={() => mapApi.current?.zoomOut()} className={railStackButton}>
                  <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M5 12h14" /></svg>
                </button>
              </div>
              <button
                type="button"
                aria-label={dict.home.showAll}
                onClick={() => mapApi.current?.showAll()}
                className={railButton}
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden until a pin is picked, so the map has the whole screen. */}
        <AnimatePresence>
          {selected && (
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.8 }}
              className={`absolute inset-x-0 bottom-0 z-20 rounded-t-3xl border-t border-line bg-roast/95 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.25)] backdrop-blur ${safeX}`}
            >
              {/* Grab handle: the sheet reads as something you can dismiss. */}
              <span
                aria-hidden
                className="absolute left-1/2 top-1.5 h-1 w-9 -translate-x-1/2 rounded-full bg-line"
              />
              <button
                type="button"
                onClick={() => select(null)}
                aria-label={dict.home.close}
                className="absolute -top-13 right-3 grid size-10 place-items-center rounded-full border border-line bg-crema/90 text-foam shadow-sm backdrop-blur transition duration-200 hover:border-ember active:scale-95"
              >
                ✕
              </button>
              <motion.div
                key={selected.cafe.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
              >
                <CafeCard
                  sheet
                  cafe={selected.cafe}
                  distance={selected.distance}
                  lang={lang}
                  dict={dict}
                />
              </motion.div>
              <p className="mt-2 flex items-center justify-between gap-3 text-xs text-mute">
                <Link href={`/${lang}/suggest`} className="underline">
                  {dict.home.suggest}
                </Link>
                <span>{dict.footer.osmCredit}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {view === "list" && (
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-y-auto px-4 pb-8"
        >
          {visible.length === 0 ? (
            <p className="py-10 text-center text-mute">{dict.home.noResults}</p>
          ) : (
            <ul className="relative mt-3 flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {visible.map(({ cafe, distance }, i) => (
                  <motion.li
                    key={cafe.id}
                    // Cards glide to their new place when a filter or sort changes.
                    // With a long list that is too much to animate, so skip it.
                    layout={visible.length <= 40 ? "position" : false}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 32,
                      // Only the first screenful staggers; the rest appear together.
                      delay: Math.min(i, 8) * 0.035,
                    }}
                  >
                    <CafeCard cafe={cafe} distance={distance} lang={lang} dict={dict} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
          <p className="mt-6 flex flex-col gap-1 text-xs text-mute">
            <Link href={`/${lang}/suggest`} className="underline">
              {dict.home.suggest}
            </Link>
            <span>{dict.footer.osmCredit}</span>
          </p>
        </motion.main>
      )}
    </div>
    </MotionConfig>
  );
}
