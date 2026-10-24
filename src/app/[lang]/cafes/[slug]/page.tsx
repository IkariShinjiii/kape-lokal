import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MapView } from "@/components/map-view";
import { ReportForm } from "@/components/report-form";
import { ChainChip, TagChip } from "@/components/tag-chip";
import { getCafeBySlug, type MenuItem } from "@/lib/cafes";
import { directionsUrl } from "@/lib/geo";
import { hasLocale, type Locale } from "@/lib/i18n";
import { mediaUrl } from "@/lib/supabase/public";
import { getDictionary } from "../../dictionaries";

export async function generateMetadata({ params }: PageProps<"/[lang]/cafes/[slug]">) {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const cafe = await getCafeBySlug(slug);
  return cafe ? { title: `${cafe.name} · Kape Lokal` } : {};
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
      <div className="relative h-40 bg-gradient-to-br from-[#7a5238] to-[#2e1f16]">
        {cafe.coverImagePath && (
          <Image
            src={mediaUrl(cafe.coverImagePath)}
            alt=""
            fill
            sizes="(max-width: 576px) 100vw, 576px"
            className="object-cover"
            priority
          />
        )}
        <Link
          href={`/${lang}`}
          className="absolute left-4 top-4 rounded bg-roast/80 px-3 py-1 text-sm font-semibold backdrop-blur"
        >
          ← {dict.detail.back}
        </Link>
      </div>

      <div className="flex flex-col gap-6 px-4">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-5xl font-bold uppercase leading-none">
            {cafe.name}
          </h1>
          <div className="flex flex-wrap gap-1.5">
            {cafe.tags.map((tag) => (
              <TagChip key={tag} tag={tag} label={dict.cafe.tags[tag]} />
            ))}
            {cafe.isChain && <ChainChip label={dict.cafe.chain} />}
          </div>
          {cafe.address && <p className="text-mute">{cafe.address}</p>}
          <p className="text-sm text-mute">
            {dict.detail.hours}: {cafe.hours ?? dict.detail.hoursUnknown}
          </p>
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
            <p className="rounded bg-crema p-4 text-mute">
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
            className="h-48 overflow-hidden rounded border border-line"
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

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-roast from-40% to-transparent px-4 pb-4 pt-8">
        <a
          href={directionsUrl(cafe)}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto block max-w-xl rounded bg-ember py-3 text-center font-display text-lg font-bold uppercase tracking-widest text-roast"
        >
          {dict.detail.directionsInMaps} ↗
        </a>
      </div>
    </main>
  );
}
