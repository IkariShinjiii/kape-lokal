import "server-only";
import type { Locale } from "@/lib/i18n";
import type en from "./dictionaries/en.json";

// English is the source of truth. A translation missing a key fails the build.
export type Dictionary = typeof en;
const check = (d: Dictionary) => d;

const dictionaries = {
  en: () => import("./dictionaries/en.json").then((m) => check(m.default)),
  fil: () => import("./dictionaries/fil.json").then((m) => check(m.default)),
  hil: () => import("./dictionaries/hil.json").then((m) => check(m.default)),
};

export const getDictionary = (locale: Locale): Promise<Dictionary> =>
  dictionaries[locale]();
