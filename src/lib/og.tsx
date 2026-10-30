// Shared pieces for the link-preview images (Facebook, Messenger, X).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { facebookKey } from "@/lib/logo";

/** Barlow Condensed, the site's heading face (SIL Open Font License, src/assets). */
export async function ogFonts() {
  const load = (w: 600 | 700) => readFile(join(process.cwd(), `src/assets/barlow-condensed-latin-${w}-normal.woff`));
  const [semi, bold] = await Promise.all([load(600), load(700)]);
  return [
    { name: "Barlow Condensed", data: semi, weight: 600 as const, style: "normal" as const },
    { name: "Barlow Condensed", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

export const OG_SIZE = { width: 1200, height: 630 };

export const OG = {
  roast: "#1a1411",
  crema: "#251c17",
  line: "#4a3a30",
  ember: "#e8742c",
  foam: "#f1e6d8",
  mute: "#a8998a",
};

/** The cafe's Facebook picture as a data URL, or null if it can't be fetched quickly. */
export async function logoDataUrl(facebook: string | null | undefined): Promise<string | null> {
  const key = facebookKey(facebook);
  if (!key) return null;
  try {
    const res = await fetch(
      `https://graph.facebook.com/${encodeURIComponent(key)}/picture?type=large&width=256&height=256`,
      { signal: AbortSignal.timeout(4000) },
    );
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/** A coffee bean drawn with plain shapes (the image renderer has no SVG paths here). */
export function Bean({ size, color }: { size: number; color: string }) {
  return (
    <div
      style={{
        width: size * 0.62,
        height: size,
        borderRadius: "50%",
        background: color,
        transform: "rotate(-35deg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: size * 0.06, height: size * 0.78, borderRadius: size, background: OG.roast }} />
    </div>
  );
}
