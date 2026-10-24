"use client";

import { useActionState } from "react";
import { suggestCafe, type FormState } from "@/app/actions";

type Strings = {
  name: string;
  address: string;
  link: string;
  note: string;
  send: string;
  success: string;
  error: string;
  limit: string;
};

const input = "rounded border border-line bg-crema p-2 text-foam";

export function SuggestForm({ strings, emptyMessage }: { strings: Strings; emptyMessage: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    suggestCafe,
    { status: "idle" },
  );

  const message =
    state.status === "success"
      ? strings.success
      : state.status === "error"
        ? strings.error
        : state.status === "limit"
          ? strings.limit
          : state.status === "empty"
            ? emptyMessage
            : null;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input
        type="text"
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <label className="flex flex-col gap-1 text-sm">
        {strings.name}
        <input name="name" required maxLength={120} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {strings.address}
        <input name="address" maxLength={200} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {strings.link}
        <input name="link" type="url" maxLength={300} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {strings.note}
        <textarea name="note" rows={3} maxLength={1000} className={input} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded bg-ember px-5 py-2 font-display text-sm font-bold uppercase tracking-widest text-roast disabled:opacity-60"
      >
        {strings.send}
      </button>
      {message && (
        <p role="status" className="text-sm text-leaf">
          {message}
        </p>
      )}
    </form>
  );
}
