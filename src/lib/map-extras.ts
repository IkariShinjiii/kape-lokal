import type { Map as MapLibreMap, StyleImageInterface } from "maplibre-gl";

/** Iloilo City's districts, for the quick-jump menu. Centers are approximate. */
export const DISTRICTS = [
  { id: "city-proper", name: "City Proper", center: [122.5655, 10.6955] },
  { id: "jaro", name: "Jaro", center: [122.5575, 10.7255] },
  { id: "la-paz", name: "La Paz", center: [122.5685, 10.7105] },
  { id: "mandurriao", name: "Mandurriao", center: [122.5465, 10.7125] },
  { id: "molo", name: "Molo", center: [122.5420, 10.6950] },
  { id: "arevalo", name: "Arevalo", center: [122.5180, 10.6875] },
  { id: "lapuz", name: "Lapuz", center: [122.5790, 10.7000] },
] as const satisfies readonly { id: string; name: string; center: [number, number] }[];

export const DISTRICT_ZOOM = 15;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The visitor's position: a solid dot with a ring that grows and fades, drawn on a
 * canvas each frame. With reduced motion it is drawn once, without the ring.
 */
export function pulsingDot(map: MapLibreMap, color: string, outline: string): StyleImageInterface {
  const size = 96; // 48 CSS px at pixelRatio 2
  const still = prefersReducedMotion();
  let ctx: CanvasRenderingContext2D | null = null;
  return {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),
    onAdd() {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      ctx = canvas.getContext("2d", { willReadFrequently: true });
    },
    render() {
      if (!ctx) return false;
      const c = size / 2;
      const inner = size * 0.14;
      ctx.clearRect(0, 0, size, size);
      if (!still) {
        const t = (performance.now() % 1800) / 1800;
        ctx.beginPath();
        ctx.arc(c, c, inner + (c - inner) * t, 0, Math.PI * 2);
        ctx.globalAlpha = 0.45 * (1 - t);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      ctx.arc(c, c, inner, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = outline;
      ctx.stroke();
      this.data = ctx.getImageData(0, 0, size, size).data;
      if (!still) map.triggerRepaint();
      return true;
    },
  };
}
