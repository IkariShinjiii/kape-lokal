import Link from "next/link";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Cafe } from "@/lib/cafes";
import { pesoFormat, t } from "@/lib/format";
import { directionsUrl, formatDistance } from "@/lib/geo";
import type { Locale } from "@/lib/i18n";
import type { MenuHit } from "@/lib/menu-search";
import { CafeLogo } from "./cafe-logo";
import { OpenStatus } from "./open-status";
import { SaveButton } from "./save-button";
import { ChainChip, TagChip } from "./tag-chip";

type Props = {
  cafe: Cafe;
  distance?: number;
  lang: Locale;
  dict: Dictionary;
  /** Compact card for the map's bottom sheet. */
  sheet?: boolean;
  /** Paid placement: shows a Sponsored label. */
  sponsored?: boolean;
  /** The menu item that matched a drink or food search. */
  menuHit?: MenuHit;
};

/** "Caramel Macchiato · ₱150 · +2 more" */
export function menuHitText(hit: MenuHit, lang: Locale, dict: Dictionary): string {
  return [
    hit.item,
    hit.price !== null ? pesoFormat(lang).format(hit.price) : null,
    hit.more > 0 ? t(dict.cafe.moreOnMenu, { count: hit.more }) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function CafeCard({ cafe, distance, lang, dict, sheet = false, sponsored = false, menuHit }: Props) {
  return (
    <article
      // In the map's bottom sheet the card sits flush on the sheet itself, so its
      // edges line up with the sheet's footer and close button.
      className={`flex flex-col gap-3 ${
        sheet
          ? "pt-1"
          : "rounded-xl bg-crema p-3 transition-shadow duration-300 hover:shadow-lg hover:shadow-black/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <CafeLogo name={cafe.name} src={cafe.logoUrl} size={sheet ? 48 : 44} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-2xl font-bold uppercase leading-none">
            <Link
              href={`/${lang}/cafes/${cafe.slug}`}
              className="transition-colors duration-200 hover:text-ember"
            >
              {cafe.name}
            </Link>
          </h3>
          {cafe.address && (
            <p className="mt-1 truncate text-sm text-mute">{cafe.address}</p>
          )}
          {menuHit && (
            <p className="mt-1 flex items-start gap-1.5 text-sm font-semibold text-ember">
              <CupIcon />
              <span className="min-w-0">{menuHitText(menuHit, lang, dict)}</span>
            </p>
          )}
          <OpenStatus hours={cafe.hours} lang={lang} dict={dict} className="mt-1 text-xs" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {distance !== undefined && (
            <p className="text-right font-display text-xl font-bold text-ember tabular-nums">
              {formatDistance(distance)}
            </p>
          )}
          <SaveButton cafeId={cafe.id} labels={{ save: dict.cafe.save, unsave: dict.cafe.unsave }} />
        </div>
      </div>

      {/* Skipped when empty: an empty row would still add a flex gap. */}
      {(cafe.tags.length > 0 || cafe.isChain || sponsored) && (
        <div className="flex flex-wrap gap-1.5">
          {sponsored && (
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-mute">
              {dict.cafe.sponsored}
            </span>
          )}
          {cafe.tags.map((tag) => (
            <TagChip key={tag} tag={tag} label={dict.cafe.tags[tag]} />
          ))}
          {cafe.isChain && <ChainChip label={dict.cafe.chain} />}
        </div>
      )}

      <div className="grid grid-cols-[1fr_1.3fr] gap-2">
        <Link
          href={`/${lang}/cafes/${cafe.slug}${cafe.hasMenu ? "#menu" : ""}`}
          className="grid min-h-11 place-items-center rounded-full border border-line px-3 text-center font-display text-sm font-bold uppercase tracking-widest transition duration-200 hover:border-ember active:scale-[0.97]"
        >
          {cafe.hasMenu ? dict.cafe.viewMenu : dict.cafe.viewCafe}
        </Link>
        <a
          href={directionsUrl(cafe)}
          target="_blank"
          rel="noopener noreferrer"
          className="grid min-h-11 place-items-center rounded-full bg-ember px-3 text-center font-display text-sm font-bold uppercase tracking-widest text-roast transition duration-200 hover:opacity-90 active:scale-[0.97]"
        >
          {dict.cafe.directions} ↗
        </a>
      </div>
    </article>
  );
}

function CupIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z" />
      <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2M11 3v2" />
    </svg>
  );
}
