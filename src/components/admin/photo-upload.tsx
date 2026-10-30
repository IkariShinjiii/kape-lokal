"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
// Same look as adminButton in ./shell (not imported: shell pulls in server-only code).
const adminButton =
  "rounded bg-ember px-4 py-2 font-display text-sm font-bold uppercase tracking-widest text-roast hover:opacity-90";

const MAX_SIDE = 1600;
const QUALITY = 0.82;

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
};

/**
 * Photo upload that works straight from a phone: the picture is shrunk in the
 * browser (longest side 1600 px, JPEG) before it is sent, so big camera photos
 * fit the 5 MB limit and upload quickly on mobile data.
 */
export function PhotoUpload({ action, label }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setReady(false);
    setNote(null);
    if (!file) return setPreview(null);
    setNote("Optimizing…");
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", QUALITY));
      if (!blob) throw new Error("encode");
      const small = new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
      const dt = new DataTransfer();
      dt.items.add(small);
      e.target.files = dt.files;
      setPreview(URL.createObjectURL(blob));
      setNote(`${canvas.width}×${canvas.height}, ${Math.round(blob.size / 1024)} KB`);
      setReady(true);
    } catch {
      // The browser can't read this format (e.g. HEIC on desktop): send it as is
      // and let the server check it.
      setPreview(null);
      setNote("Couldn't shrink this photo here; it will be uploaded as is.");
      setReady(true);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold transition-colors hover:border-ember">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        Take or choose a photo
        <input ref={input} type="file" name="image" accept="image/*" required onChange={onPick} className="sr-only" />
      </label>
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-40 w-full rounded-xl object-cover" />
      )}
      {note && <p className="text-xs text-mute">{note}</p>}
      <Submit label={label} disabled={!ready} />
    </form>
  );
}

function Submit({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={disabled || pending} className={`${adminButton} w-fit disabled:opacity-50`}>
      {pending ? "Uploading…" : label}
    </button>
  );
}
