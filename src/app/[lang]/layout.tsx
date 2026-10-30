import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { hasLocale, locales } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import { getDictionary } from "./dictionaries";
import "../globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "700"],
});

// viewport-fit=cover lets the map run under the notch and home bar; the controls
// keep clear of them with env(safe-area-inset-*).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1a1411",
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: dict.meta.title, template: `%s · ${dict.meta.title}` },
    description: dict.meta.description,
    alternates: {
      canonical: `/${lang}`,
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      type: "website",
      siteName: dict.meta.title,
      title: dict.meta.title,
      description: dict.meta.description,
      locale: lang === "en" ? "en_PH" : `${lang}_PH`,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <html
      lang={lang}
      data-theme="dark"
      suppressHydrationWarning
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <head>
        {/* Apply the saved theme before first paint so there is no flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
