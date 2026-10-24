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
import { PIN_COLORS } from "@/lib/theme";

type Props = {
  cafes: Cafe[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
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

function pinColor(c: Cafe): string {
  if (c.isChain) return PIN_COLORS.chain;
  if (c.tags.includes("specialty_coffee")) return PIN_COLORS.specialty;
  if (c.tags.includes("matcha")) return PIN_COLORS.matcha;
  return PIN_COLORS.other;
}

function toGeoJson(cafes: Cafe[], selectedId: string | null | undefined) {
  return {
    type: "FeatureCollection" as const,
    features: cafes.map((c) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] },
      properties: {
        id: c.id,
        color: pinColor(c),
        selected: c.id === selectedId ? 1 : 0,
      },
    })),
  };
}

function buildStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs:
      "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
    sprite: "https://protomaps.github.io/basemaps-assets/sprites/v4/dark",
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${window.location.origin}/tiles/iloilo.pmtiles`,
        attribution:
          '<a href="https://openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>',
      },
    },
    layers: layers("protomaps", namedFlavor("dark")),
  };
}

export function MapView({
  cafes,
  selectedId,
  onSelect,
  userPos,
  interactive = true,
  bottomPadding = 0,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(onSelect);
  const fittedRef = useRef(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    ensureProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(),
      center: [ILOILO_CENTER.lng, ILOILO_CENTER.lat],
      zoom: 12.5,
      minZoom: 10,
      maxZoom: 18,
      maxBounds: BOUNDS,
      interactive,
      attributionControl: false,
    });
    mapRef.current = map;
    // Top right, so it never sits under the bottom sheet.
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "top-right");

    // The container can get its final size after the map starts (flex layouts,
    // streaming). Keep the canvas in step with it.
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    map.on("error", (e) => console.error("[map]", e.error?.message ?? e));
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __kapeMap?: MapLibreMap }).__kapeMap = map;
    }

    map.on("load", () => {
      map.addSource("cafes", { type: "geojson", data: toGeoJson([], null) });
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
          "circle-color": PIN_COLORS.specialty,
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
          "circle-stroke-color": "#1a1411",
        },
      });
      map.addLayer({
        id: "me",
        type: "circle",
        source: "me",
        paint: {
          "circle-radius": 7,
          "circle-color": "#6aa8ff",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#1a1411",
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
        map.on("mouseenter", "cafes", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "cafes", () => {
          map.getCanvas().style.cursor = "";
        });
      }
      setLoaded(true);
    });

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      fittedRef.current = false;
      setLoaded(false);
    };
  }, [interactive]);

  // Keep pins in step with filters and selection.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    (map.getSource("cafes") as GeoJSONSource).setData(
      toGeoJson(cafes, selectedId),
    );

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
  }, [cafes, selectedId, loaded, userPos, bottomPadding]);

  // Show the visitor and fly to them when they share their location.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    (map.getSource("me") as GeoJSONSource).setData({
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
