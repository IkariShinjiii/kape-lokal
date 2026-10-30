import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CafeLogo } from "@/components/cafe-logo";
import { OpenStatus } from "@/components/open-status";
import { SaveButton } from "@/components/save-button";
import { formatHours } from "@/lib/hours";
import { MapView } from "@/components/map-view";
import { ReportForm } from "@/components/report-form";
import { ChainChip, TagChip } from "@/components/tag-chip";
import { getCafeBySlug, type MenuItem } from "@/lib/cafes";
import { directionsUrl } from "@/lib/geo";
import { hasLocale, locales, type Locale } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { mediaUrl } from "@/lib/supabase/public";
import { getDictionary } from "../../dictionaries";

export async function generateMetadata({ params }: PageProps<"/[lang]/cafes/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const cafe = await getCafeBySlug(slug);
  if (!cafe) return {};
  const hours = formatHours(cafe.hours, lang);
  const description = [cafe.address, hours].filter(Boolean).join(" · ") || cafe.name;
  const path = `/cafes/${cafe.slug}`;
  return {
    title: cafe.name,
    description,
    alternates: {
      canonical: `/${lang}${path}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])),
    },
    openGraph: { title: cafe.name, description, url: `/${lang}${path}` },
  };
}

/** schema.org data so search engines can show the address, hours and phone. */
function cafeJsonLd(cafe: NonNullable<Awaited<ReturnType<typeof getCafeBySlug>>>, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: cafe.name,
    url,
    address: cafe.address
      ? { "@type": "PostalAddress", streetAddress: cafe.address, addressLocality: "Iloilo City", addressCountry: "PH" }
      : undefined,
    geo: { "@type": "GeoCoordinates", latitude: cafe.lat, longitude: cafe.lng },
    telephone: cafe.phone ?? undefined,
    // Stored hours already use schema.org's "Mo-Fr 08:00-17:00" style.
    openingHours: cafe.hours ? cafe.hours.split(/\s*;\s*/).filter((r) => !/off$/.test(r)) : undefined,
    sameAs: [cafe.website, cafe.facebook?.startsWith("http") ? cafe.facebook : null].filter(Boolean),
  };
}

export default function CafePage({ params }: PageProps<"/[lang]/cafes/[slug]">) {
  return (
    <Suspense fallback={<p className="p-6 text-mute">…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}

function groupMenu(items: MenuItem[]): [string, MenuItem[]][] {
  const groups = new Map<string, MenuItem[]>();
  for (const item of items) {
    const key = item.category ?? "";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()];
}

async function Detail({ params }: Pick<PageProps<"/[lang]/cafes/[slug]">, "params">) {
  const { lang: rawLang, slug } = await params;
  if (!hasLocale(rawLang)) notFound();
  const lang: Locale = rawLang;
  const [cafe, dict] = await Promise.all([getCafeBySlug(slug), getDictionary(lang)]);
  if (!cafe) notFound();

  const price = new Intl.NumberFormat(lang === "fil" ? "fil-PH" : "en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  });
  const description =
    lang === "fil"
      ? (cafe.descriptionFil ?? cafe.descriptionEn)
      : (cafe.descriptionEn ?? cafe.descriptionFil);
  const hasMenu = cafe.menuItems.length > 0 || cafe.menuImages.length > 0;
  const contacts = [
    cafe.phone && { label: cafe.phone, href: undefined },
    cafe.website && { label: cafe.website, href: cafe.website },
    cafe.facebook && {
      label: "Facebook",
      href: cafe.facebook.startsWith("http")
        ? cafe.facebook
        : `https://facebook.com/${cafe.facebook.replace(/^@/, "")}`,
    },
    cafe.instagram && {
      label: `@${cafe.instagram.replace(/^@/, "")}`,
      href: `https://instagram.com/${cafe.instagram.replace(/^@/, "")}`,
    },
  ].filter(Boolean) as { label: string; href?: string }[];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 pb-28">
      <script
        type="application/ld+json"
        // JSON.stringify output with "<" escaped cannot break out of the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(cafeJsonLd(cafe, `${SITE_URL}/${lang}/cafes/${cafe.slug}`)).replace(/</g, "\\u003c"),
        }}
      />
      {/* Inset to the same 16px edges as the content below, on every screen width. */}
      <div className="relative mx-4 mt-[max(1rem,env(safe-area-inset-top))] h-44 overflow-hidden rounded-2xl bg-gradient-to-br from-[#7a5238] to-[#2e1f16]">
        {cafe.coverImagePath && (
          <Image
            src={mediaUrl(cafe.coverImagePath)}
            alt=""
            fill
            sizes="(max-width: 576px) 100vw, 544px"
            className="object-cover"
            priority
          />
        )}
        <Link
          href={`/${lang}`}
          className="absolute left-3 top-3 grid min-h-10 place-items-center rounded-full border border-line bg-roast/80 px-4 text-sm font-semibold backdrop-blur"
        >
          ← {dict.detail.back}
        </Link>
        <div className="absolute bottom-3 left-3">
          <CafeLogo
            name={cafe.name}
            src={cafe.logoUrl}
            size={72}
            className="border-2 shadow-lg shadow-black/30"
          />
        </div>
      </div>

      <div className="flex flex-col gap-6 px-4">
        <header className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-5xl font-bold uppercase leading-none">
              {cafe.name}
            </h1>
            <SaveButton
              cafeId={cafe.id}
              labels={{ save: dict.cafe.save, unsave: dict.cafe.unsave }}
              className="mt-1"
            />
          </div>
          {(cafe.tags.length > 0 || cafe.isChain) && (
            <div className="flex flex-wrap gap-1.5">
              {cafe.tags.map((tag) => (
                <TagChip key={tag} tag={tag} label={dict.cafe.tags[tag]} />
              ))}
              {cafe.isChain && <ChainChip label={dict.cafe.chain} />}
            </div>
          )}
          {cafe.address && <p className="text-mute">{cafe.address}</p>}
          <p className="text-sm text-mute">
            {cafe.hours
              ? `${dict.detail.hours}: ${formatHours(cafe.hours, lang)}`
              : dict.detail.hoursUnknown}
          </p>
          <OpenStatus hours={cafe.hours} lang={lang} dict={dict} className="text-sm" />
        </header>

        {description && (
          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest text-ember">
              {dict.detail.about}
            </h2>
            <p>{description}</p>
          </section>
        )}

        <section id="menu" className="flex flex-col gap-3 scroll-mt-4">
          <h2 className="font-display text-lg font-bold uppercase tracking-widest text-ember">
            {dict.detail.menu}
          </h2>
          {!hasMenu && (
            <p className="rounded-xl bg-crema p-4 text-mute">
              {dict.detail.noMenu} {dict.detail.noMenuHelp}
            </p>
          )}
          {groupMenu(cafe.menuItems).map(([category, items]) => (
            <div key={category} className="flex flex-col">
              {category && (
                <h3 className="py-1 text-sm font-semibold text-mute">{category}</h3>
              )}
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex justify-between gap-4 border-t border-line py-2 ${
                    item.is_available ? "" : "opacity-50"
                  }`}
                >
                  <div className="min-w-0">
                    <p>{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-mute">{item.description}</p>
                    )}
                    {!item.is_available && (
                      <p className="text-xs text-mute">{dict.detail.unavailable}</p>
                    )}
                  </div>
                  {item.price_php !== null && (
                    <p className="shrink-0 tabular-nums text-mute">
                      {price.format(item.price_php)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
          {cafe.menuImages.map((img) => (
            <Image
              key={img.id}
              src={mediaUrl(img.image_path)}
              alt={`${cafe.name} ${dict.detail.menu}`}
              width={800}
              height={1000}
              sizes="(max-width: 576px) 100vw, 576px"
              className="h-auto w-full rounded"
            />
          ))}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-bold uppercase tracking-widest text-ember">
            {dict.detail.location}
          </h2>
          <MapView
            className="h-48 overflow-hidden rounded-xl border border-line"
            cafes={[cafe]}
            interactive={false}
          />
        </section>

        {contacts.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="font-display text-lg font-bold uppercase tracking-widest text-ember">
              {dict.detail.contact}
            </h2>
            <ul className="flex flex-col gap-1">
              {contacts.map((c) => (
                <li key={c.label} className="truncate">
                  {c.href ? (
                    <a
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ember underline"
                    >
                      {c.label}
                    </a>
                  ) : (
                    c.label
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <ReportForm cafeId={cafe.id} strings={dict.report} />

        <p className="text-xs text-mute">{dict.footer.osmCredit}</p>
      </div>

      {/* Same column and side inset as the content above, so the edges line up. */}
      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-roast from-40% to-transparent pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
        <div className="mx-auto max-w-xl px-4">
          <a
            href={directionsUrl(cafe)}
            target="_blank"
            rel="noopener noreferrer"
            className="grid min-h-12 place-items-center rounded-full bg-ember text-center font-display text-lg font-bold uppercase tracking-widest text-roast transition duration-200 hover:opacity-90 active:scale-[0.98]"
          >
            {dict.detail.directionsInMaps} ↗
          </a>
        </div>
      </div>
    </main>
  );
}
