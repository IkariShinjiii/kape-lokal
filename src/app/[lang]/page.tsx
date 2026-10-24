import { notFound } from "next/navigation";
import { LanguageSwitch } from "@/components/language-switch";
import { hasLocale } from "@/lib/i18n";
import { getDictionary } from "./dictionaries";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-8">
      <header className="flex items-start justify-between gap-4">
        <p className="font-display text-xl font-bold uppercase text-ember">
          {dict.meta.title}
        </p>
        <LanguageSwitch
          current={lang}
          label={dict.language.label}
          names={{ en: dict.language.en, fil: dict.language.fil }}
        />
      </header>

      <section className="flex flex-col gap-2">
        <h1 className="font-display text-5xl font-bold uppercase leading-none">
          {dict.home.heading}
        </h1>
        <p className="text-mute">{dict.home.tagline}</p>
      </section>

      <ul className="flex flex-wrap gap-2" aria-label="Filters">
        {(["all", "specialty", "matcha", "menu"] as const).map((key) => (
          <li
            key={key}
            className={`rounded border px-3 py-1.5 text-sm font-semibold ${
              key === "all"
                ? "border-ember bg-ember text-roast"
                : "border-line bg-crema text-foam"
            }`}
          >
            {dict.filters[key]}
          </li>
        ))}
      </ul>

      <p className="rounded bg-crema p-4 text-mute">{dict.home.comingSoon}</p>

      <footer className="mt-auto text-xs text-mute">
        {dict.footer.osmCredit}
      </footer>
    </main>
  );
}
