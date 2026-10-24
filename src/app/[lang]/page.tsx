import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CafeExplorer } from "@/components/cafe-explorer";
import { getCafes } from "@/lib/cafes";
import { hasLocale } from "@/lib/i18n";
import { getDictionary } from "./dictionaries";

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  return (
    <Suspense fallback={<p className="p-6 text-mute">{dict.meta.title}…</p>}>
      <Explorer lang={lang} />
    </Suspense>
  );
}

async function Explorer({ lang }: { lang: "en" | "fil" }) {
  const [cafes, dict] = await Promise.all([getCafes(), getDictionary(lang)]);
  return <CafeExplorer cafes={cafes} lang={lang} dict={dict} />;
}
