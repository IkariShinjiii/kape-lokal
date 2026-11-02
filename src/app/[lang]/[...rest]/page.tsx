import { notFound } from "next/navigation";

// Any address under a language that matches no page (e.g. /en/nope) gets the
// site's own not-found page instead of Next.js's plain default.
export default function CatchAll() {
  notFound();
}
