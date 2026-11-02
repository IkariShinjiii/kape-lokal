"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

type Strings = { title: string; body: string; back: string };

/**
 * The page for a cafe or address that doesn't exist. Next.js gives not-found
 * pages no props, so the language comes from the address here in the browser.
 */
export function NotFoundView({ strings }: { strings: Record<Locale, Strings> }) {
  const params = useParams<{ lang?: string }>();
  const lang = params.lang && hasLocale(params.lang) ? params.lang : defaultLocale;
  const s = strings[lang];
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-5 px-4 py-12">
      <p className="font-display text-7xl font-bold leading-none text-ember tabular-nums">404</p>
      <h1 className="font-display text-5xl font-bold uppercase leading-none text-balance">{s.title}</h1>
      <p className="text-mute">{s.body}</p>
      <Link
        href={`/${lang}`}
        className="grid min-h-12 w-fit place-items-center rounded-full bg-ember px-6 font-display text-sm font-bold uppercase tracking-widest text-roast transition duration-200 hover:opacity-90 active:scale-[0.97]"
      >
        {s.back}
      </Link>
    </main>
  );
}
