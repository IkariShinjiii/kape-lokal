import Link from "next/link";
import { locales, type Locale } from "@/lib/i18n";

type Props = {
  current: Locale;
  label: string;
  names: Record<Locale, string>;
};

export function LanguageSwitch({ current, label, names }: Props) {
  return (
    <nav aria-label={label} className="flex gap-2">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={`/${locale}`}
          hrefLang={locale}
          aria-current={locale === current ? "true" : undefined}
          className={`rounded border px-3 py-1 text-sm font-semibold ${
            locale === current
              ? "border-ember bg-ember text-roast"
              : "border-line text-mute hover:text-foam"
          }`}
        >
          {names[locale]}
        </Link>
      ))}
    </nav>
  );
}
