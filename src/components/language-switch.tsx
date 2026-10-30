"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n";

type Props = {
  current: Locale;
  label: string;
  names: Record<Locale, string>;
};

/**
 * Language choice. A segmented row from tablet width up; on phones a compact pill
 * that opens the phone's own picker, so three languages still fit the top bar.
 */
export function LanguageSwitch({ current, label, names }: Props) {
  const router = useRouter();
  return (
    <>
      {/* The pill shows the short code; the transparent select on top opens the
          phone's picker with the full names. */}
      <label className="relative flex h-10 shrink-0 items-center gap-1 rounded-full border border-line bg-crema/90 pl-3.5 pr-2.5 text-sm font-semibold uppercase text-foam shadow-sm backdrop-blur focus-within:border-ember sm:hidden">
        <span aria-hidden>{current}</span>
        <svg viewBox="0 0 24 24" className="size-3.5 text-mute" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
        <select
          value={current}
          aria-label={label}
          onChange={(e) => router.push(`/${e.target.value}`)}
          className="absolute inset-0 cursor-pointer appearance-none opacity-0"
        >
          {locales.map((locale) => (
            <option key={locale} value={locale}>
              {names[locale]}
            </option>
          ))}
        </select>
      </label>
      <nav
        aria-label={label}
        className="box-border hidden h-10 gap-0.5 rounded-full border border-line bg-crema/90 p-[3px] shadow-sm backdrop-blur sm:flex"
      >
        {locales.map((locale) => (
          <Link
            key={locale}
            href={`/${locale}`}
            hrefLang={locale}
            aria-current={locale === current ? "true" : undefined}
            className={`grid h-full place-items-center rounded-full px-3 text-sm font-semibold transition-colors duration-200 ${
              locale === current ? "bg-ember text-roast" : "text-mute hover:text-foam"
            }`}
          >
            {/* Short codes until there is room for the full names. */}
            <span className="uppercase lg:hidden">{locale}</span>
            <span className="hidden lg:inline">{names[locale]}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
