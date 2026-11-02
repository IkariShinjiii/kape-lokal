import type { Metadata } from "next";
import { NotFoundView } from "@/components/not-found-view";
import en from "./dictionaries/en.json";
import fil from "./dictionaries/fil.json";
import hil from "./dictionaries/hil.json";

// Reads the same in every language: "404 · Kape Lokal".
export const metadata: Metadata = { title: "404" };

// Shown for a cafe that doesn't exist and, through [...rest], any address that
// matches no page. Only the short not-found text goes to the browser.
export default function NotFound() {
  return <NotFoundView strings={{ en: en.notFound, fil: fil.notFound, hil: hil.notFound }} />;
}
