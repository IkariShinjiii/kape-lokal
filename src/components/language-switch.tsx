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
      className="flex gap-0.5 rounded-full border border-line bg-crema/90 p-0.5 shadow-sm backdrop-blur"
    >
      {locales.map((locale) => (
        <Link
          key={locale}
          href={`/${locale}`}
          hrefLang={locale}
          aria-current={locale === current ? "true" : undefined}
          className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors duration-200 ${
            locale === current
              ? "bg-ember text-roast"
              : "text-mute hover:text-foam"
          }`}
        >
          {names[locale]}
        </Link>
      ))}
    </nav>
  );
}
