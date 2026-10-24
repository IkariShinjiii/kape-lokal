import Link from "next/link";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/shell";
import { CafeForm } from "@/components/admin/cafe-form";
import { ADMIN_HOME, requireSignedIn } from "@/lib/admin";

export default function NewCafePage({ searchParams }: PageProps<"/[lang]/admin/cafes/new">) {
  return (
    <Suspense fallback={<p className="p-6 text-mute">Loading…</p>}>
      <NewCafe searchParams={searchParams} />
    </Suspense>
  );
}

async function NewCafe({ searchParams }: Pick<PageProps<"/[lang]/admin/cafes/new">, "searchParams">) {
  const { user, isAdmin } = await requireSignedIn();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  if (!isAdmin) {
    return (
      <AdminShell email={user.email ?? ""}>
        <p className="rounded bg-crema p-4">This account isn&apos;t an admin.</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell email={user.email ?? ""}>
      <Link href={ADMIN_HOME} className="text-sm text-ember underline">
        ← All cafes
      </Link>
      <h1 className="font-display text-4xl font-bold uppercase leading-none">Add cafe</h1>
      {one("error") && <p className="rounded bg-crema p-3 text-ember">{one("error")}</p>}
      <p className="text-sm text-mute">
        Save first, then add the menu and photos on the next screen.
      </p>
      <CafeForm v={{ name: one("name"), address: one("address"), suggestionId: one("suggestion"), is_published: false }} />
    </AdminShell>
  );
}
