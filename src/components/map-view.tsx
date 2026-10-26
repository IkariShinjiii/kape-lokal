"use client";

import { useEffect, useRef, useState } from "react";
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
import { PIN_COLORS, type Theme } from "@/lib/theme";
import { useTheme } from "./use-theme";

/** A pin under the mouse: where it sits inside the map, and the map's size. */
export type HoverInfo = { id: string; x: number; y: number; width: number; height: number };

type Props = {
  cafes: Cafe[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onHover?: (hover: HoverInfo | null) => void;
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

let protocolAdded = false;
function ensureProtocol() {
  if (protocolAdded) return;
  maplibregl.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
  maplibregl.addProtocol("pmtiles", new Protocol().tile);
  protocolAdded = true;
}

type Colors = (typeof PIN_COLORS)[Theme];

function pinColor(c: Cafe, colors: Colors): string {
  if (c.isChain) return colors.chain;
  if (c.tags.includes("specialty_coffee")) return colors.specialty;
  if (c.tags.includes("matcha")) return colors.matcha;
  return colors.other;
}

function toGeoJson(
  cafes: Cafe[],
  selectedId: string | null | undefined,
  colors: Colors,
) {
  return {
    type: "FeatureCollection" as const,
    features: cafes.map((c) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] },
      properties: {
        id: c.id,
        color: pinColor(c, colors),
        selected: c.id === selectedId ? 1 : 0,
      },
    })),
  };
}

function buildStyle(theme: Theme): StyleSpecification {
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
    layers: layers("protomaps", namedFlavor(theme)),
  };
}

export function MapView({
  cafes,
  selectedId,
  onSelect,
  onHover,
  userPos,
  interactive = true,
  bottomPadding = 0,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
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
  }, [onSelect, onHover]);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    ensureProtocol();

    const saved = viewRef.current;
    if (saved) fittedRef.current = true;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(theme),
      center: saved?.center ?? [ILOILO_CENTER.lng, ILOILO_CENTER.lat],
      zoom: saved?.zoom ?? 12.5,
      minZoom: 10,
      maxZoom: 18,
      maxBounds: BOUNDS,
      interactive,
      attributionControl: false,
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

    map.on("load", () => {
      map.addSource("cafes", { type: "geojson", data: toGeoJson([], null, colors) });
      map.addSource("me", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "cafes-halo",
        type: "circle",
        source: "cafes",
        filter: ["==", ["get", "selected"], 1],
        paint: {
          "circle-radius": 17,
          "circle-color": colors.specialty,
          "circle-opacity": 0.3,
        },
      });
      map.addLayer({
        id: "cafes",
        type: "circle",
        source: "cafes",
        paint: {
          "circle-radius": ["case", ["==", ["get", "selected"], 1], 10, 7],
          "circle-color": ["get", "color"],
          "circle-stroke-width": 2,
          "circle-stroke-color": colors.outline,
          // Pins ease between sizes when one is selected.
          "circle-radius-transition": { duration: 200, delay: 0 },
        },
      });
      map.addLayer({
        id: "me",
        type: "circle",
        source: "me",
        paint: {
          "circle-radius": 7,
          "circle-color": colors.me,
          "circle-stroke-width": 3,
          "circle-stroke-color": colors.outline,
        },
      });

      if (interactive) {
        map.on("click", "cafes", (e) => {
          const id = e.features?.[0]?.properties?.id as string | undefined;
          if (id) onSelectRef.current?.(id);
        });
        map.on("click", (e) => {
          const hit = map.queryRenderedFeatures(e.point, { layers: ["cafes"] });
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
        map.on("mouseenter", "cafes", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "cafes", () => {
          map.getCanvas().style.cursor = "";
          clearHover();
        });
        map.on("movestart", clearHover);
      }
      setLoaded(true);
    });

    return () => {
      const c = map.getCenter();
      viewRef.current = { center: [c.lng, c.lat], zoom: map.getZoom() };
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
    cafesSource.setData(toGeoJson(cafes, selectedId, colors));

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      });
    }
  }, [userPos, loaded, bottomPadding]);

  // Bring a selected cafe into view above the bottom sheet.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded || !selectedId || !interactive) return;
    const cafe = cafes.find((c) => c.id === selectedId);
    if (cafe) {
      map.easeTo({
        center: [cafe.lng, cafe.lat],
        padding: { bottom: bottomPadding },
        duration: 400,
      });
    }
    // Only re-center when the selection changes, not on every filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // MapLibre's stylesheet sets position: relative on the map element, so the
  // sizing classes go on a wrapper and the map just fills it.
  return (
    <div className={className}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
