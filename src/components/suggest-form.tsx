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

// 16px text stops iOS zooming in on focus.
const input = "rounded-xl border border-line bg-crema px-3 py-2.5 text-base text-foam transition-colors duration-200 placeholder:text-mute focus:border-ember focus:outline-none";

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
      {/* When the form appeared, set in the browser. Bots that post instantly are ignored. */}
      <input
        type="hidden"
        name="started"
        ref={(el) => {
          if (el && !el.value) el.value = String(Date.now());
        }}
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
        className="grid min-h-11 place-items-center self-start rounded-full bg-ember px-6 font-display text-sm font-bold uppercase tracking-widest text-roast transition duration-200 hover:opacity-90 active:scale-[0.97] disabled:opacity-60"
      >
        {strings.send}
      </button>
      {message && (
        <p role="status" className={`text-sm ${state.status === "success" ? "text-leaf" : "text-ember"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
