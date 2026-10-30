import { ImageResponse } from "next/og";
import { getCafeBySlug } from "@/lib/cafes";
import { formatHours } from "@/lib/hours";
import { hasLocale } from "@/lib/i18n";
import { Bean, logoDataUrl, OG, OG_SIZE, ogFonts } from "@/lib/og";
import { getDictionary } from "../../dictionaries";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Cafe on Kape Lokal";

// The preview card shown when a cafe's page is shared: logo, name, address, hours.
export default async function Image({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang: rawLang, slug } = await params;
  const lang = hasLocale(rawLang) ? rawLang : "en";
  const [cafe, dict] = await Promise.all([getCafeBySlug(slug), getDictionary(lang)]);
  const logo = cafe ? await logoDataUrl(cafe.facebook) : null;
  const name = cafe?.name ?? "Kape Lokal";
  const hours = cafe ? formatHours(cafe.hours, lang) : null;
  const tags = (cafe?.tags ?? []).map((t) => dict.cafe.tags[t]).filter(Boolean);
  const nameSize = name.length > 26 ? 72 : name.length > 16 ? 92 : 112;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `radial-gradient(circle at 90% 10%, #3a2a20 0%, ${OG.roast} 55%)`,
          color: OG.foam,
          padding: 72,
          fontFamily: "Barlow Condensed",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Bean size={44} color={OG.ember} />
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 4 }}>KAPE LOKAL</div>
          <div style={{ fontSize: 26, color: OG.mute, marginLeft: 8 }}>· Iloilo City</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 48, flex: 1 }}>
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: 999,
              border: `4px solid ${OG.line}`,
              background: OG.crema,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} width={200} height={200} style={{ objectFit: "cover" }} alt="" />
            ) : (
              <div style={{ fontSize: 110, fontWeight: 700, color: OG.ember }}>{name.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: nameSize, fontWeight: 700, lineHeight: 1, textTransform: "uppercase" }}>{name}</div>
            {cafe?.address && <div style={{ fontSize: 32, color: OG.mute, marginTop: 20 }}>{cafe.address}</div>}
            {hours && <div style={{ fontSize: 28, color: OG.mute, marginTop: 10 }}>{hours}</div>}
            {tags.length > 0 && (
              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                {tags.map((t) => (
                  <div
                    key={t}
                    style={{ fontSize: 24, fontWeight: 700, color: OG.ember, border: `2px solid ${OG.ember}`, borderRadius: 999, padding: "6px 18px" }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
