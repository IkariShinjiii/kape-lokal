import { Suspense } from "react";
import { AdminShell } from "@/components/admin/shell";
import { requireSignedIn } from "@/lib/admin";

// What visitors searched for in the last 30 days. Searches that found nothing
// show which drinks or cafes to add next; the most searched show which menus
// matter most.

const DAYS = 30;
const TOP = 30;

export default function SearchesPage() {
  return (
    <Suspense fallback={<p className="p-6 text-mute">Loading…</p>}>
      <Searches />
    </Suspense>
  );
}

type Row = { query: string; results: number; menu_results: number; created_at: string };
type Stat = { query: string; times: number; results: number; menuResults: number; last: string };
type Supabase = Awaited<ReturnType<typeof requireSignedIn>>["supabase"];

/** The last 30 days of searches, grouped by text, most searched first. */
async function loadSearches(supabase: Supabase) {
  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("search_events")
    .select("query, results, menu_results, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20_000);
  const rows = (data ?? []) as Row[];

  // Newest first, so the first row seen for a search holds its latest counts.
  const stats = new Map<string, Stat>();
  for (const r of rows) {
    const s = stats.get(r.query);
    if (s) s.times += 1;
    else
      stats.set(r.query, {
        query: r.query,
        times: 1,
        results: r.results,
        menuResults: r.menu_results,
        last: r.created_at,
      });
  }
  const all = [...stats.values()].sort((a, b) => b.times - a.times || b.last.localeCompare(a.last));
  return { rows, all, error };
}

async function Searches() {
  const { supabase, user, isAdmin } = await requireSignedIn();
  if (!isAdmin) {
    return (
      <AdminShell email={user.email ?? ""}>
        <p className="rounded bg-crema p-4">This account isn&apos;t an admin.</p>
      </AdminShell>
    );
  }

  const { rows, all, error } = await loadSearches(supabase);
  const nothing = all.filter((s) => s.results === 0);

  return (
    <AdminShell email={user.email ?? ""} wide>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-4xl font-bold uppercase leading-none">Searches</h1>
        <p className="text-sm text-mute">
          The last {DAYS} days. Each search counts once per visit. No names or locations are stored.
        </p>
      </div>
      {error && <p role="alert" className="rounded bg-crema p-3 text-ember">{error.message}</p>}

      {rows.length === 0 ? (
        <p className="rounded bg-crema p-4 text-mute">
          No searches yet. They show up here as people use the search box on the map.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3">
            {[
              ["Searches", rows.length],
              ["Different searches", all.length],
              ["Found nothing", nothing.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded bg-crema p-3">
                <dt className="text-xs uppercase tracking-wider text-mute">{label}</dt>
                <dd className="font-display text-3xl font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <Table
            title="Found nothing"
            help="Add these drinks to a cafe's menu, or the cafe itself if it's missing."
            stats={nothing.slice(0, TOP)}
          />
          <Table
            title="Most searched"
            help="“On menus” is how many cafes list it. Low numbers there are the menus to read in next."
            stats={all.slice(0, TOP)}
          />
        </>
      )}
    </AdminShell>
  );
}

function Table({ title, help, stats }: { title: string; help: string; stats: Stat[] }) {
  return (
    <section className="flex flex-col gap-2 border-t border-line pt-6">
      <h2 className="font-display text-2xl font-bold uppercase text-ember">{title}</h2>
      <p className="text-sm text-mute">{help}</p>
      {stats.length === 0 ? (
        <p className="text-sm text-mute">Nothing here yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-mute">
              <tr>
                <th className="py-2 pr-3 font-semibold">Search</th>
                <th className="py-2 pr-3 text-right font-semibold">Times</th>
                <th className="py-2 pr-3 text-right font-semibold">Cafes found</th>
                <th className="py-2 pr-3 text-right font-semibold">On menus</th>
                <th className="py-2 font-semibold">Last</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.query} className="border-t border-line">
                  <td className="py-2 pr-3 font-semibold">{s.query}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{s.times}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{s.results}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{s.menuResults}</td>
                  <td className="whitespace-nowrap py-2 text-mute">
                    {new Date(s.last).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      timeZone: "Asia/Manila",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
