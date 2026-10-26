import type { Cafe } from "@/lib/cafes";
import { PIN_COLORS, type Theme } from "@/lib/theme";

// What a cafe looks like on the map. Specialty cafes are coffee beans, matcha
// places are leaves, other local cafes are a cup, chains a smaller muted cup.
export type PinKind = "bean" | "leaf" | "cup" | "chain";

export const PIN_KINDS: PinKind[] = ["bean", "leaf", "cup", "chain"];

export function pinKind(c: Cafe): PinKind {
  if (c.isChain) return "chain";
  if (c.tags.includes("specialty_coffee")) return "bean";
  if (c.tags.includes("matcha")) return "leaf";
  return "cup";
}

export const pinImageId = (kind: PinKind) => `pin-${kind}`;

// Chains are drawn smaller so local cafes stand out.
export const PIN_SIZE: Record<PinKind, number> = { bean: 1.1, leaf: 1, cup: 1, chain: 0.75 };

// Higher number draws on top where pins overlap.
export const PIN_Z: Record<PinKind, number> = { chain: 0, cup: 1, leaf: 2, bean: 3 };

// Drawn in a 64-unit box on a 128px canvas. Registered with pixelRatio 4, a pin is
// 32 CSS px wide at size 1 and stays sharp even on 3x phone screens.
const SIZE = 64;
const SCALE = 2;
export const PIXEL_RATIO = (SIZE * SCALE) / 32;

type Colors = (typeof PIN_COLORS)[Theme];

function bean(ctx: CanvasRenderingContext2D, color: string, outline: string) {
  ctx.translate(SIZE / 2, SIZE / 2);
  ctx.rotate(-0.6);
  const rx = SIZE * 0.29;
  const ry = SIZE * 0.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fill();
  // The crease down the middle is what makes it read as a coffee bean.
  ctx.beginPath();
  ctx.moveTo(0, -ry * 0.88);
  ctx.bezierCurveTo(rx * 1.1, -ry * 0.35, -rx * 1.1, ry * 0.35, 0, ry * 0.88);
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.strokeStyle = outline;
  ctx.stroke();
}

function leaf(ctx: CanvasRenderingContext2D, color: string, outline: string) {
  ctx.translate(SIZE / 2, SIZE / 2);
  const r = SIZE * 0.38;
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, r * 0.75);
  ctx.quadraticCurveTo(-r * 1.05, -r * 1.05, r * 0.95, -r * 0.95);
  ctx.quadraticCurveTo(r * 1.05, r * 1.05, -r * 0.75, r * 0.75);
  ctx.closePath();
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, r * 0.75);
  ctx.lineTo(r * 0.5, -r * 0.5);
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.strokeStyle = outline;
  ctx.stroke();
}

function cup(ctx: CanvasRenderingContext2D, color: string, outline: string) {
  ctx.translate(SIZE / 2, SIZE / 2);
  // Round badge.
  ctx.beginPath();
  ctx.arc(0, 0, SIZE * 0.4, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fill();
  // Cup: a tapered body, a handle and a saucer line, in the outline colour.
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.moveTo(-11, -7);
  ctx.lineTo(9, -7);
  ctx.lineTo(7, 8);
  ctx.quadraticCurveTo(6, 11, 3, 11);
  ctx.lineTo(-5, 11);
  ctx.quadraticCurveTo(-8, 11, -9, 8);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(10, -1, 5, -Math.PI / 2, Math.PI / 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-13, 15);
  ctx.lineTo(13, 15);
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.stroke();
}

/** Draw one pin as raw image data for MapLibre's addImage. */
export function drawPin(kind: PinKind, colors: Colors): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE * SCALE;
  canvas.height = SIZE * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  const fill = {
    bean: colors.specialty,
    leaf: colors.matcha,
    cup: colors.other,
    chain: colors.chain,
  }[kind];
  if (kind === "bean") bean(ctx, fill, colors.outline);
  else if (kind === "leaf") leaf(ctx, fill, colors.outline);
  else cup(ctx, fill, colors.outline);
  return ctx.getImageData(0, 0, SIZE * SCALE, SIZE * SCALE);
}
