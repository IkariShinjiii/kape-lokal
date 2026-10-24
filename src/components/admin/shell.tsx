import Link from "next/link";
import { signOut } from "@/app/[lang]/admin/actions";
import { ADMIN_HOME } from "@/lib/admin";

export function AdminShell({
  email,
  children,
  wide = false,
}: {
  email: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`mx-auto flex w-full flex-col gap-6 px-4 py-6 ${wide ? "max-w-5xl" : "max-w-2xl"}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <Link href={ADMIN_HOME} className="font-display text-2xl font-bold uppercase text-ember">
          Kape Lokal admin
        </Link>
        <div className="flex items-center gap-3 text-sm text-mute">
          <Link href="/en" className="underline">
            View site
          </Link>
          <span className="truncate">{email}</span>
          <form action={signOut}>
            <button type="submit" className="rounded border border-line px-3 py-1 hover:border-ember">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}

export const adminInput = "rounded border border-line bg-crema p-2 text-foam";
export const adminButton =
  "rounded bg-ember px-4 py-2 font-display text-sm font-bold uppercase tracking-widest text-roast hover:opacity-90";
export const adminGhostButton =
  "rounded border border-line px-3 py-1.5 text-sm hover:border-ember";
