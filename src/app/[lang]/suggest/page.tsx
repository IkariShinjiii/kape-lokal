import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SuggestForm } from "@/components/suggest-form";
import { hasLocale } from "@/lib/i18n";
import { getDictionary } from "../dictionaries";

export default async function SuggestPage({ params }: PageProps<"/[lang]/suggest">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <Link href={`/${lang}`} className="text-sm text-ember underline">
        ← {dict.suggest.back}
      </Link>
      <h1 className="font-display text-5xl font-bold uppercase leading-none">
        {dict.suggest.title}
      </h1>
      <p className="text-mute">{dict.suggest.intro}</p>
      <Suspense>
        <SuggestForm strings={dict.suggest} emptyMessage={dict.report.empty} />
      </Suspense>
    </main>
  );
}
