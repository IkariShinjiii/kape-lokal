import { Suspense } from "react";
import { adminButton, adminInput } from "@/components/admin/shell";
import { signIn } from "../actions";

export default function LoginPage({ searchParams }: PageProps<"/[lang]/admin/login">) {
  return (
    <Suspense>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/[lang]/admin/login">, "searchParams">) {
  const sp = await searchParams;
  const sent = sp.sent === "1";
  const error = sp.error;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-16">
      <h1 className="font-display text-4xl font-bold uppercase text-ember">Kape Lokal admin</h1>
      {sent ? (
        <p className="rounded bg-crema p-4">
          Check your email for a sign-in link. Open it in this same browser.
        </p>
      ) : (
        <form action={signIn} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input name="email" type="email" required autoComplete="email" className={adminInput} />
          </label>
          <button type="submit" className={`self-start ${adminButton}`}>
            Email me a sign-in link
          </button>
          {error === "email" && <p className="text-sm text-ember">Enter a valid email address.</p>}
          {error === "send" && (
            <p className="text-sm text-ember">We couldn&apos;t send the link. Wait a minute and try again.</p>
          )}
          {error === "1" && (
            <p className="text-sm text-ember">That link didn&apos;t work. Request a new one.</p>
          )}
        </form>
      )}
    </main>
  );
}
