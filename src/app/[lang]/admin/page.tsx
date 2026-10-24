import Link from "next/link";
import { Suspense } from "react";
import { AdminShell, adminGhostButton } from "@/components/admin/shell";
import { ChainChip, TagChip } from "@/components/tag-chip";
import { ADMIN_HOME, requireSignedIn } from "@/lib/admin";
import { suggestTags, type CafeTag } from "@/lib/tags";
import { dismissSuggestion, resolveAllFlags, resolveFlag } from "./actions";

const VIEWS = ["drafts", "published", "chains", "excluded", "suggestions", "reports"] as const;
type View = (typeof VIEWS)[number];

const TAG_LABEL: Record<CafeTag, string> = {
  specialty_coffee: "Specialty",
  matcha: "Matcha",
  pastry: "Pastry",
  work_friendly: "Work-friendly",
  pet_friendly: "Pet-friendly",
};

export default function AdminPage({ searchParams }: PageProps<"/[lang]/admin">) {
  return (
    <Suspense fallback={<p className="p-6 text-mute">Loading…</p>}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/[lang]/admin">, "searchParams">) {
  const { supabase, user, isAdmin } = await requireSignedIn();

  if (!isAdmin) {
    return (
      <AdminShell email={user.email ?? ""}>
        <p className="rounded bg-crema p-4">
          You&apos;re signed in as {user.email}, but this account isn&apos;t an admin yet.
        </p>
      </AdminShell>
    );
  }

  const sp = await searchParams;
  const requested = typeof sp.view === "string" ? sp.view : "drafts";
  const view: View = (VIEWS as readonly string[]).includes(requested) ? (requested as View) : "drafts";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const counts = await Promise.all([
    supabase.from("cafes").select("id", { count: "exact", head: true }).eq("is_published", false).eq("is_excluded", false).eq("is_chain", false),
    supabase.from("cafes").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("cafes").select("id", { count: "exact", head: true }).eq("is_chain", true).eq("is_excluded", false),
    supabase.from("cafes").select("id", { count: "exact", head: true }).eq("is_excluded", true),
    supabase.from("cafe_suggestions").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("edit_flags").select("id", { count: "exact", head: true }).eq("resolved", false),
  ]);
  const countOf = Object.fromEntries(VIEWS.map((v, i) => [v, counts[i].count ?? 0])) as Record<View, number>;

  const tabs = (
    <nav className="flex flex-wrap gap-2" aria-label="Sections">
      {VIEWS.map((v) => (
        <Link
          key={v}
          href={`${ADMIN_HOME}?view=${v}`}
          aria-current={v === view ? "page" : undefined}
          className={`rounded border px-3 py-1.5 text-sm font-semibold capitalize ${
            v === view ? "border-ember bg-ember text-roast" : "border-line bg-crema hover:border-ember"
          }`}
        >
          {v} <span className="tabular-nums opacity-70">{countOf[v]}</span>
        </Link>
      ))}
    </nav>
  );

  let body: React.ReactNode;

  if (view === "suggestions") {
    const { data } = await supabase
      .from("cafe_suggestions")
      .select("id, name, address, link, note, created_at")
      .eq("status", "new")
      .order("created_at", { ascending: false });
    body = (data ?? []).length === 0 ? (
      <Empty>No new suggestions.</Empty>
    ) : (
      <ul className="flex flex-col gap-3">
        {(data ?? []).map((s) => (
          <li key={s.id} className="flex flex-col gap-2 rounded bg-crema p-3">
            <p className="font-display text-xl font-bold uppercase">{s.name}</p>
            {s.address && <p className="text-sm text-mute">{s.address}</p>}
            {s.link && (
              <a href={s.link} target="_blank" rel="noopener noreferrer" className="truncate text-sm text-ember underline">
                {s.link}
              </a>
            )}
            {s.note && <p className="text-sm">{s.note}</p>}
            <div className="flex gap-2">
              <Link
                className={adminGhostButton}
                href={`${ADMIN_HOME}/cafes/new?${new URLSearchParams({ name: s.name, address: s.address ?? "", suggestion: s.id })}`}
              >
                Add as cafe
              </Link>
              <form action={dismissSuggestion.bind(null, s.id)}>
                <button className={adminGhostButton}>Dismiss</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    );
  } else if (view === "reports") {
    const { data } = await supabase
      .from("edit_flags")
      .select("id, note, created_at, cafes(id, name)")
      .eq("resolved", false)
      .order("created_at", { ascending: false });
    body = (data ?? []).length === 0 ? (
      <Empty>No open reports.</Empty>
    ) : (
      <div className="flex flex-col gap-3">
        <form action={resolveAllFlags}>
          <button className={adminGhostButton}>Resolve all (junk clean-up)</button>
        </form>
        <ul className="flex flex-col gap-3">
          {(data ?? []).map((f) => {
            const cafe = Array.isArray(f.cafes) ? f.cafes[0] : f.cafes;
            return (
              <li key={f.id} className="flex flex-col gap-2 rounded bg-crema p-3">
                {cafe && (
                  <Link href={`${ADMIN_HOME}/cafes/${cafe.id}`} className="font-display text-xl font-bold uppercase hover:text-ember">
                    {cafe.name}
                  </Link>
                )}
                <p className="whitespace-pre-wrap text-sm">{f.note}</p>
                <form action={resolveFlag.bind(null, f.id)}>
                  <button className={adminGhostButton}>Mark resolved</button>
                </form>
              </li>
            );
          })}
        </ul>
      </div>
    );
  } else {
    let query = supabase
      .from("cafes")
      .select("id, name, address, exclusion_reason, is_chain, cafe_tags(tag)")
      .order("name");
    if (view === "drafts") query = query.eq("is_published", false).eq("is_excluded", false).eq("is_chain", false);
    if (view === "published") query = query.eq("is_published", true);
    if (view === "chains") query = query.eq("is_chain", true).eq("is_excluded", false);
    if (view === "excluded") query = query.eq("is_excluded", true);
    if (q) query = query.ilike("name", `%${q.replace(/[%,]/g, " ")}%`);
    const { data } = await query.limit(300);
    body = (data ?? []).length === 0 ? (
      <Empty>Nothing here.</Empty>
    ) : (
      <ul className="flex flex-col gap-2">
        {(data ?? []).map((c) => {
          const tags = (c.cafe_tags as { tag: CafeTag }[]).map((t) => t.tag);
          const hints = suggestTags(c.name).filter((t) => !tags.includes(t));
          return (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded bg-crema p-3">
              <div className="min-w-0">
                <p className="font-display text-xl font-bold uppercase leading-none">{c.name}</p>
                <p className="truncate text-sm text-mute">
                  {c.address ?? "No address"}
                  {c.exclusion_reason ? ` · ${c.exclusion_reason}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <TagChip key={t} tag={t} label={TAG_LABEL[t]} />
                  ))}
                  {c.is_chain && <ChainChip label="Chain" />}
                  {hints.map((t) => (
                    <span key={t} className="rounded-[3px] border border-dashed border-ember px-2 py-0.5 text-[10px] font-bold uppercase text-ember">
                      Maybe {TAG_LABEL[t]}
                    </span>
                  ))}
                </div>
              </div>
              <Link href={`${ADMIN_HOME}/cafes/${c.id}`} className={adminGhostButton}>
                Edit
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <AdminShell email={user.email ?? ""} wide>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {tabs}
        <Link href={`${ADMIN_HOME}/cafes/new`} className={adminGhostButton}>
          + Add cafe
        </Link>
      </div>
      {view !== "suggestions" && view !== "reports" && (
        <form className="flex gap-2" action={ADMIN_HOME}>
          <input type="hidden" name="view" value={view} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name"
            aria-label="Search by name"
            className="w-full max-w-xs rounded border border-line bg-crema p-2 text-foam"
          />
          <button className={adminGhostButton}>Search</button>
        </form>
      )}
      {body}
    </AdminShell>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded bg-crema p-6 text-center text-mute">{children}</p>;
}
