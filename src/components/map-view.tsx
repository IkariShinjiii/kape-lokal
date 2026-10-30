"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as maplibregl from "maplibre-gl";
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import { layers, namedFlavor } from "@protomaps/basemaps";
import type { Cafe } from "@/lib/cafes";
import { ILOILO_CENTER, type LatLng } from "@/lib/geo";
import { prefersReducedMotion, pulsingDot } from "@/lib/map-extras";
import { PIN_KINDS, PIN_SIZE, PIN_Z, PIXEL_RATIO, drawPin, pinImageId, pinKind } from "@/lib/pin-icons";
import { PIN_COLORS, type Theme } from "@/lib/theme";
import { useTheme } from "./use-theme";

/** A pin under the mouse: where it sits inside the map, and the map's size. */
export type HoverInfo = { id: string; x: number; y: number; width: number; height: number };

/** The part of the map on screen: [west, south, east, north]. */
export type ViewBounds = [number, number, number, number];

/** Camera controls for buttons outside the map. */
export type MapApi = {
  zoomIn: () => void;
  zoomOut: () => void;
  flyTo: (center: [number, number], zoom: number) => void;
  showAll: () => void;
};

type Props = {
  cafes: Cafe[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onHover?: (hover: HoverInfo | null) => void;
  onBoundsChange?: (bounds: ViewBounds) => void;
  apiRef?: RefObject<MapApi | null>;
  userPos?: LatLng | null;
  /** A small, fixed map (cafe detail page). */
  interactive?: boolean;
  /** Pixels at the bottom covered by UI, so selected pins stay visible. */
  bottomPadding?: number;
  className?: string;
};

// Greater Iloilo. The tile file only covers this area.
const BOUNDS: [[number, number], [number, number]] = [
  [122.4, 10.58],
  [122.7, 10.86],
];

// Pins group into numbered bubbles up to this zoom; past it every cafe shows.
const CLUSTER_MAX_ZOOM = 13;
// Zooming to a selected cafe goes at least this far, so it is never inside a bubble.
const SELECT_MIN_ZOOM = 14.5;

// Labels that help find your way: districts, barangays, streets, water. Business
// icons and the rest are left out so the cafe pins are the only markers.
const HIDDEN_LAYERS = new Set([
  "pois",
  "address_label",
  "roads_shields",
  "roads_oneway",
  "places_country",
  "places_region",
  "water_label_ocean",
]);

let protocolAdded = false;
function ensureProtocol() {
  if (protocolAdded) return;
  maplibregl.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
  maplibregl.addProtocol("pmtiles", new Protocol().tile);
  protocolAdded = true;
}

function toGeoJson(cafes: Cafe[], selectedId: string | null | undefined) {
  return {
    type: "FeatureCollection" as const,
    features: cafes.map((c) => {
      const kind = pinKind(c);
      const selected = c.id === selectedId;
      return {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] },
        properties: {
          id: c.id,
          icon: pinImageId(kind),
          specialty: kind === "bean" ? 1 : 0,
          // The selected pin grows; chains are drawn smaller.
          size: PIN_SIZE[kind] * (selected ? 1.3 : 1),
          z: selected ? 10 : PIN_Z[kind],
          selected: selected ? 1 : 0,
        },
      };
    }),
  };
}

function buildStyle(theme: Theme, withLabels: boolean): StyleSpecification {
  const base = layers("protomaps", namedFlavor(theme), withLabels ? { lang: "en" } : undefined);
  return {
    version: 8,
    glyphs:
      "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
    sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/${theme}`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${window.location.origin}/tiles/iloilo.pmtiles`,
        attribution:
          '<a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>',
      },
    },
    layers: base.filter((l) => !HIDDEN_LAYERS.has(l.id)),
  };
}

function boundsOf(map: MapLibreMap): ViewBounds {
  const b = map.getBounds();
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
}

export function MapView({
  cafes,
  selectedId,
  onSelect,
  onHover,
  onBoundsChange,
  apiRef,
  userPos,
  interactive = true,
  bottomPadding = 0,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  const onBoundsRef = useRef(onBoundsChange);
  const cafesRef = useRef(cafes);
  const paddingRef = useRef(bottomPadding);
  const fittedRef = useRef(false);
  // Where the visitor was looking, kept across a theme change (the map is
  // rebuilt with the other style).
  const viewRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { theme } = useTheme();
  const colors = PIN_COLORS[theme];

  useEffect(() => {
    onSelectRef.current = onSelect;
    onHoverRef.current = onHover;
    onBoundsRef.current = onBoundsChange;
    cafesRef.current = cafes;
    paddingRef.current = bottomPadding;
  }, [onSelect, onHover, onBoundsChange, cafes, bottomPadding]);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    ensureProtocol();

    const saved = viewRef.current;
    if (saved) fittedRef.current = true;
    const map = new maplibregl.Map({
      container: containerRef.current,
      // The small detail-page map stays a plain backdrop without labels.
      style: buildStyle(theme, interactive),
      center: saved?.center ?? [ILOILO_CENTER.lng, ILOILO_CENTER.lat],
      zoom: saved?.zoom ?? 12.5,
      minZoom: 10,
      maxZoom: 18,
      maxBounds: BOUNDS,
      interactive,
      attributionControl: false,
      // Smooth, settled camera moves rather than snapping.
      fadeDuration: 200,
    });
    mapRef.current = map;
    // Bottom right: the filters float over the top of the map.
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    // The container can get its final size after the map starts (flex layouts,
    // streaming). Keep the canvas in step with it.
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    map.on("error", (e) => console.error("[map]", e.error?.message ?? e));
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __kapeMap?: MapLibreMap }).__kapeMap = map;
    }

    const motion = (ms: number) => (prefersReducedMotion() ? 0 : ms);
    if (apiRef) {
      apiRef.current = {
        zoomIn: () => map.zoomIn({ duration: motion(250) }),
        zoomOut: () => map.zoomOut({ duration: motion(250) }),
        flyTo: (center, zoom) =>
          map.flyTo({ center, zoom, speed: 1.4, curve: 1.5, essential: false, duration: prefersReducedMotion() ? 0 : undefined }),
        showAll: () => {
          const list = cafesRef.current;
          if (list.length === 0) return;
          const b = new maplibregl.LngLatBounds();
          list.forEach((c) => b.extend([c.lng, c.lat]));
          map.fitBounds(b, {
            padding: { top: 120, left: 40, right: 40, bottom: 40 + paddingRef.current },
            maxZoom: 14,
            duration: motion(700),
          });
        },
      };
    }

    map.on("load", () => {
      for (const kind of PIN_KINDS) {
        map.addImage(pinImageId(kind), drawPin(kind, colors), { pixelRatio: PIXEL_RATIO });
      }
      map.addImage("me-pulse", pulsingDot(map, colors.me, colors.outline), { pixelRatio: 2 });
      map.addSource("cafes", {
        type: "geojson",
        data: toGeoJson([], null),
        cluster: interactive,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterRadius: 44,
        // Bubbles holding a specialty cafe get an orange ring.
        clusterProperties: { specialty: ["+", ["get", "specialty"]] },
      });
      map.addSource("me", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "cafes",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": colors.clusterFill,
          "circle-opacity": 0.94,
          "circle-radius": ["step", ["get", "point_count"], 15, 8, 18, 20, 22, 40, 26],
          "circle-stroke-width": 2.5,
          "circle-stroke-color": [
            "case",
            [">", ["get", "specialty"], 0],
            colors.specialty,
            colors.clusterText,
          ],
          "circle-stroke-opacity": ["case", [">", ["get", "specialty"], 0], 1, 0.35],
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "cafes",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Medium"],
          "text-size": 13,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: { "text-color": colors.clusterText },
      });
      map.addLayer({
        id: "cafes-halo",
        type: "circle",
        source: "cafes",
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "selected"], 1]],
        paint: {
          "circle-radius": 24,
          "circle-color": colors.specialty,
          "circle-opacity": 0.3,
        },
      });
      map.addLayer({
        id: "cafes",
        type: "symbol",
        source: "cafes",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["get", "icon"],
          // Small when the whole city is in view, full size up close, so pins
          // don't pile on top of each other on a phone.
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10, ["*", ["get", "size"], 0.5],
            13, ["*", ["get", "size"], 0.75],
            15, ["*", ["get", "size"], 1],
            17, ["*", ["get", "size"], 1.2],
          ],
          // Where pins overlap, specialty beans and the selected pin draw on top.
          "symbol-sort-key": ["get", "z"],
          // Every cafe stays visible, even where pins crowd together.
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
      map.addLayer({
        id: "me",
        type: "symbol",
        source: "me",
        layout: {
          "icon-image": "me-pulse",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      if (interactive) {
        map.on("click", "cafes", (e) => {
          const id = e.features?.[0]?.properties?.id as string | undefined;
          if (id) onSelectRef.current?.(id);
        });
        // A bubble opens up: zoom to where its cafes separate.
        map.on("click", "clusters", async (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const source = map.getSource("cafes") as GeoJSONSource;
          const zoom = await source.getClusterExpansionZoom(f.properties.cluster_id as number);
          map.easeTo({
            center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: Math.min(zoom + 0.25, 18),
            duration: motion(500),
          });
        });
        map.on("click", (e) => {
          const hit = map.queryRenderedFeatures(e.point, { layers: ["cafes", "clusters"] });
          if (hit.length === 0) onSelectRef.current?.(null);
        });
        // Hover preview. Anchored to the pin, not the mouse, so it stays put while
        // the mouse moves across the pin.
        let hoveredId: string | null = null;
        const clearHover = () => {
          if (hoveredId === null) return;
          hoveredId = null;
          onHoverRef.current?.(null);
        };
        map.on("mousemove", "cafes", (e) => {
          const f = e.features?.[0];
          const id = f?.properties?.id as string | undefined;
          if (!f || !id || id === hoveredId) return;
          hoveredId = id;
          const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
          const p = map.project([lng, lat]);
          const box = map.getContainer();
          onHoverRef.current?.({
            id,
            x: p.x,
            y: p.y,
            width: box.clientWidth,
            height: box.clientHeight,
          });
        });
        for (const layer of ["cafes", "clusters"]) {
          map.on("mouseenter", layer, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layer, () => {
            map.getCanvas().style.cursor = "";
            clearHover();
          });
        }
        map.on("movestart", clearHover);
        map.on("moveend", () => onBoundsRef.current?.(boundsOf(map)));
      }
      setLoaded(true);
    });

    return () => {
      // Keep the view only once it has been framed. A rebuild right after mount
      // (the theme settling) would otherwise save the default view and skip the fit.
      if (fittedRef.current) {
        const c = map.getCenter();
        viewRef.current = { center: [c.lng, c.lat], zoom: map.getZoom() };
      }
      if (apiRef) apiRef.current = null;
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      setLoaded(false);
    };
    // colors derives from theme; the map is rebuilt when either changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, theme]);

  // Keep pins in step with filters and selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    // After a theme change the rebuilt map exists before its sources do.
    const cafesSource = map.getSource("cafes") as GeoJSONSource | undefined;
    if (!cafesSource) return;
    cafesSource.setData(toGeoJson(cafes, selectedId));

    // First fit: frame the cafes, or center on the only one (detail page).
    if (!fittedRef.current && cafes.length > 0) {
      fittedRef.current = true;
      if (cafes.length === 1) {
        map.jumpTo({ center: [cafes[0].lng, cafes[0].lat], zoom: 16 });
      } else if (!userPos) {
        const b = new maplibregl.LngLatBounds();
        cafes.forEach((c) => b.extend([c.lng, c.lat]));
        map.fitBounds(b, {
          padding: { top: 120, left: 40, right: 40, bottom: 40 + bottomPadding },
          maxZoom: 14,
          duration: 0,
        });
      }
    }
    onBoundsRef.current?.(boundsOf(map));
  }, [cafes, selectedId, loaded, userPos, bottomPadding]);

  // Show the visitor and fly to them when they share their location.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const meSource = map.getSource("me") as GeoJSONSource | undefined;
    if (!meSource) return;
    meSource.setData({
      type: "FeatureCollection",
      features: userPos
        ? [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [userPos.lng, userPos.lat] },
              properties: {},
            },
          ]
        : [],
    });
    if (userPos) {
      fittedRef.current = true;
      map.flyTo({
        center: [userPos.lng, userPos.lat],
        zoom: 15,
        padding: { bottom: bottomPadding },
        duration: prefersReducedMotion() ? 0 : undefined,
      });
    }
  }, [userPos, loaded, bottomPadding]);

  // Bring a selected cafe into view above the bottom sheet, close enough that it
  // is out of any bubble.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !selectedId || !interactive) return;
    const cafe = cafes.find((c) => c.id === selectedId);
    if (cafe) {
      map.easeTo({
        center: [cafe.lng, cafe.lat],
        zoom: Math.max(map.getZoom(), SELECT_MIN_ZOOM),
        padding: { bottom: bottomPadding },
        duration: prefersReducedMotion() ? 0 : 450,
      });
    }
    // Only re-center when the selection changes, not on every filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // The ring around the selected pin breathes, so it is easy to spot again.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !selectedId || !interactive || prefersReducedMotion()) return;
    let frame = 0;
    // The map may have been removed (theme change, leaving the page) before this stops.
    const alive = () => mapRef.current === map && !!map.getLayer("cafes-halo");
    const tick = () => {
      if (!alive()) return;
      const t = (performance.now() % 1600) / 1600;
      map.setPaintProperty("cafes-halo", "circle-radius", 18 + 14 * t);
      map.setPaintProperty("cafes-halo", "circle-opacity", 0.4 * (1 - t));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      if (alive()) {
        map.setPaintProperty("cafes-halo", "circle-radius", 24);
        map.setPaintProperty("cafes-halo", "circle-opacity", 0.3);
      }
    };
  }, [selectedId, loaded, interactive]);

  // MapLibre's stylesheet sets position: relative on the map element, so the
  // sizing classes go on a wrapper and the map just fills it.
  return (
    <div className={className}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
