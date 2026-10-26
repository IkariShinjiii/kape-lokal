import Link from "next/link";
import { locales, type Locale } from "@/lib/i18n";

type Props = {
  current: Locale;
  label: string;
  names: Record<Locale, string>;
};

export function LanguageSwitch({ current, label, names }: Props) {
  return (
    <nav
      aria-label={label}
      className="box-border flex h-10 gap-0.5 rounded-full border border-line bg-crema/90 p-[3px] shadow-sm backdrop-blur"
    >
      {locales.map((locale) => (
        <Link
          key={locale}
          href={`/${locale}`}
          hrefLang={locale}
          aria-current={locale === current ? "true" : undefined}
          aria-label={names[locale]}
          className={`grid h-full place-items-center rounded-full px-3 text-sm font-semibold transition-colors duration-200 ${
            locale === current
              ? "bg-ember text-roast"
              : "text-mute hover:text-foam"
          }`}
        >
          {/* Short codes on phones keep the header on one row. */}
          <span className="uppercase sm:hidden" aria-hidden>{locale}</span>
          <span className="hidden sm:inline" aria-hidden>{names[locale]}</span>
        </Link>
      ))}
    </nav>
  );
}
