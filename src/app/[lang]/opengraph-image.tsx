import { ImageResponse } from "next/og";
import { getCafes } from "@/lib/cafes";
import { t } from "@/lib/format";
import { hasLocale } from "@/lib/i18n";
import { Bean, OG, OG_SIZE, ogFonts } from "@/lib/og";
import { getDictionary } from "./dictionaries";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Kape Lokal: cafes in Iloilo City";

// The preview card shown when the site's address is shared.
export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const dict = await getDictionary(hasLocale(lang) ? lang : "en");
  const count = (await getCafes()).length;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: `radial-gradient(circle at 85% 30%, #3a2a20 0%, ${OG.roast} 60%)`,
          color: OG.foam,
          padding: 80,
          fontFamily: "Barlow Condensed",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
          <div style={{ fontSize: 30, letterSpacing: 6, color: OG.ember, fontWeight: 700 }}>ILOILO CITY</div>
          <div style={{ fontSize: 120, fontWeight: 700, lineHeight: 1, marginTop: 16, letterSpacing: -2 }}>
            KAPE LOKAL
          </div>
          <div style={{ fontSize: 36, color: OG.mute, marginTop: 28, maxWidth: 640 }}>{dict.meta.description}</div>
          <div
            style={{
              display: "flex",
              marginTop: 40,
              fontSize: 30,
              fontWeight: 700,
              color: OG.roast,
              background: OG.ember,
              borderRadius: 999,
              padding: "12px 28px",
              alignSelf: "flex-start",
            }}
          >
            {t(dict.meta.ogCount, { count })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 320 }}>
          <Bean size={300} color={OG.ember} />
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
