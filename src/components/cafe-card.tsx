import Link from "next/link";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Cafe } from "@/lib/cafes";
import { directionsUrl, formatDistance } from "@/lib/geo";
import type { Locale } from "@/lib/i18n";
import { ChainChip, TagChip } from "./tag-chip";

type Props = {
  cafe: Cafe;
  distance?: number;
  lang: Locale;
  dict: Dictionary;
  /** Compact card for the map's bottom sheet. */
  sheet?: boolean;
};

export function CafeCard({ cafe, distance, lang, dict, sheet = false }: Props) {
  return (
    <article className="flex flex-col gap-3 rounded bg-crema p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-2xl font-bold uppercase leading-none">
            <Link
              href={`/${lang}/cafes/${cafe.slug}`}
              className="hover:text-ember"
            >
              {cafe.name}
            </Link>
          </h3>
          {cafe.address && (
            <p className="mt-1 truncate text-sm text-mute">{cafe.address}</p>
          )}
          {!sheet && cafe.hours && (
            <p className="truncate text-xs text-mute">{cafe.hours}</p>
          )}
        </div>
        {distance !== undefined && (
          <p className="shrink-0 text-right font-display text-xl font-bold text-ember tabular-nums">
            {formatDistance(distance)}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {cafe.tags.map((tag) => (
          <TagChip key={tag} tag={tag} label={dict.cafe.tags[tag]} />
        ))}
        {cafe.isChain && <ChainChip label={dict.cafe.chain} />}
      </div>

      <div className="grid grid-cols-[1fr_1.3fr] gap-2">
        <Link
          href={`/${lang}/cafes/${cafe.slug}${cafe.hasMenu ? "#menu" : ""}`}
          className="rounded border border-line px-3 py-2 text-center font-display text-sm font-bold uppercase tracking-widest hover:border-ember"
        >
          {cafe.hasMenu ? dict.cafe.viewMenu : dict.cafe.viewCafe}
        </Link>
        <a
          href={directionsUrl(cafe)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded bg-ember px-3 py-2 text-center font-display text-sm font-bold uppercase tracking-widest text-roast hover:opacity-90"
        >
          {dict.cafe.directions} ↗
        </a>
      </div>
    </article>
  );
}
