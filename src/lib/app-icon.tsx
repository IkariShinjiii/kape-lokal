import { ImageResponse } from "next/og";
import { Bean, OG } from "@/lib/og";

/**
 * The home-screen icon: an orange bean on the dark roast background. The bean
 * stays inside the middle 60%, so Android can crop the icon to any shape
 * ("maskable") without cutting it off.
 */
export function appIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: OG.roast,
        }}
      >
        <Bean size={Math.round(size * 0.5)} color={OG.ember} />
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=31536000" },
    },
  );
}
