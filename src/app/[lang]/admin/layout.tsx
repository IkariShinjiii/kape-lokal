import type { Metadata } from "next";

// Admin pages stay out of search results even if someone links to them.
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/[lang]/admin">) {
  return children;
}
