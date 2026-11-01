"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { MenuReadState } from "@/app/[lang]/admin/actions";
import type { ReadItem } from "@/lib/menu-items";
import { menuKey } from "@/lib/menu-search";
import { shrinkPhoto } from "./photo-upload";

// Same look as adminButton / adminInput in ./shell (not imported: shell pulls in server-only code).
const adminButton =
  "rounded bg-ember px-4 py-2 font-display text-sm font-bold uppercase tracking-widest text-roast hover:opacity-90";
const adminInput = "rounded border border-line bg-crema p-2 text-foam";

const MAX_PHOTOS = 4;

type Props = {
  read: (prev: MenuReadState, formData: FormData) => Promise<MenuReadState>;
  save: (formData: FormData) => void | Promise<void>;
  /** Names already on this cafe's menu, so repeats start unticked. */
  existing: string[];
  /** False until ANTHROPIC_API_KEY is set. */
  enabled: boolean;
};

/**
 * Turns photos of a menu into menu items: Claude reads them, the admin checks
 * the list, and only the ticked items are saved.
 */
export function MenuReader({ read, save, existing, enabled }: Props) {
  const [state, action, reading] = useActionState(read, { status: "idle" });
  const [previews, setPreviews] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  if (!enabled) {
    return (
      <p className="rounded bg-crema p-3 text-sm text-mute">
        Reading menus from photos needs an Anthropic API key. Add <code>ANTHROPIC_API_KEY</code> to the
        project&apos;s environment variables in Vercel (and to <code>.env.local</code> on your computer),
        then redeploy.
      </p>
    );
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const all = [...(input.files ?? [])];
    const picked = all.slice(0, MAX_PHOTOS);
    setReady(false);
    setNote(picked.length ? "Optimizing…" : null);
    const files: File[] = [];
    const urls: string[] = [];
    for (const f of picked) {
      const small = await shrinkPhoto(f);
      files.push(small?.file ?? f);
      if (small) urls.push(small.preview);
    }
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    input.files = dt.files;
    setPreviews(urls);
    setNote(
      files.length === 0
        ? null
        : `${files.length} photo${files.length > 1 ? "s" : ""} ready` +
            (all.length > MAX_PHOTOS ? ` (only the first ${MAX_PHOTOS} are used)` : ""),
    );
    setReady(files.length > 0);
  }

  return (
    <div className="flex flex-col gap-3 rounded bg-crema p-3">
      <p className="text-sm">
        Take or choose up to {MAX_PHOTOS} photos of the menu. Claude reads the items and prices, then
        you check them here before anything is saved.
      </p>
      <form action={action} onSubmit={() => setReady(false)} className="flex flex-col gap-3">
        <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold transition-colors hover:border-ember">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          Take or choose menu photos
          <input type="file" name="photos" accept="image/*" multiple onChange={onPick} className="sr-only" />
        </label>
        {previews.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {previews.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className="aspect-[3/4] w-full rounded object-cover" />
            ))}
          </div>
        )}
        {note && <p className="text-xs text-mute">{note}</p>}
        <button disabled={!ready || reading} className={`${adminButton} w-fit disabled:opacity-50`}>
          {reading ? "Reading the menu…" : "Read menu"}
        </button>
        {reading && <p className="text-xs text-mute">This usually takes 10 to 40 seconds.</p>}
      </form>

      {state.status === "error" && (
        <p role="alert" className="text-sm text-ember">
          {state.message}
        </p>
      )}
      {state.status === "done" && (
        <Review key={state.id} items={state.items} note={state.note} existing={existing} save={save} />
      )}
    </div>
  );
}

type Row = ReadItem & { keep: boolean; repeat: boolean; priceText: string };

function Review({
  items,
  note,
  existing,
  save,
}: {
  items: ReadItem[];
  note: string | null;
  existing: string[];
  save: Props["save"];
}) {
  const [rows, setRows] = useState<Row[]>(() => {
    const known = new Set(existing.map(menuKey));
    return items.map((it) => {
      const repeat = known.has(menuKey(it.name));
      return { ...it, keep: !repeat, repeat, priceText: it.price_php === null ? "" : String(it.price_php) };
    });
  });
  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const kept = rows.filter((r) => r.keep && r.name.trim());
  const payload = JSON.stringify(
    kept.map((r) => ({
      name: r.name,
      category: r.category,
      description: r.description,
      price_php: r.priceText.trim() === "" ? null : r.priceText,
    })),
  );

  return (
    <form action={save} className="flex flex-col gap-3 border-t border-line pt-3">
      <p className="text-sm">
        Found {items.length} items. Check the names and prices against the photo, fix or untick anything
        wrong, then save.
      </p>
      {note && <p className="rounded border border-line p-2 text-sm text-mute">Note from Claude: {note}</p>}
      <ul className="flex flex-col">
        {rows.map((r, i) => (
          <li
            key={i}
            className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 border-t border-line py-3 ${r.keep ? "" : "opacity-60"}`}
          >
            <input
              type="checkbox"
              checked={r.keep}
              onChange={(e) => update(i, { keep: e.target.checked })}
              aria-label={`Keep ${r.name}`}
              className="row-span-3 mt-3 size-5"
            />
            <input
              value={r.name}
              onChange={(e) => update(i, { name: e.target.value })}
              aria-label="Item name"
              className={adminInput}
            />
            <div className="flex gap-2">
              <input
                value={r.category ?? ""}
                onChange={(e) => update(i, { category: e.target.value || null })}
                placeholder="Section"
                aria-label="Section"
                className={`${adminInput} min-w-0 flex-1`}
              />
              <input
                value={r.priceText}
                onChange={(e) => update(i, { priceText: e.target.value })}
                inputMode="decimal"
                placeholder="₱"
                aria-label="Price in pesos"
                className={`${adminInput} w-24 tabular-nums`}
              />
            </div>
            <input
              value={r.description ?? ""}
              onChange={(e) => update(i, { description: e.target.value || null })}
              placeholder="Details, sizes"
              aria-label="Details"
              className={`${adminInput} text-sm`}
            />
            {r.repeat && (
              <p className="col-start-2 text-xs text-mute">Already on the menu, so unticked.</p>
            )}
          </li>
        ))}
      </ul>
      <input type="hidden" name="items" value={payload} />
      <SaveButton count={kept.length} />
    </form>
  );
}

function SaveButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={count === 0 || pending} className={`${adminButton} w-fit disabled:opacity-50`}>
      {pending ? "Saving…" : `Save ${count} item${count === 1 ? "" : "s"}`}
    </button>
  );
}
