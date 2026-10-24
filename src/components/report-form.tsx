"use client";

import { useActionState } from "react";
import { reportCafe, type FormState } from "@/app/actions";

type Strings = {
  title: string;
  intro: string;
  note: string;
  send: string;
  success: string;
  error: string;
  limit: string;
  empty: string;
};

export function ReportForm({ cafeId, strings }: { cafeId: string; strings: Strings }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    reportCafe.bind(null, cafeId),
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
            ? strings.empty
            : null;

  return (
    <form action={action} className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-bold uppercase tracking-widest text-ember">
        {strings.title}
      </h2>
      <p className="text-sm text-mute">{strings.intro}</p>
      {/* Honeypot: hidden from people, filled in by bots. */}
      <input
        type="text"
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <label className="flex flex-col gap-1 text-sm">
        {strings.note}
        <textarea
          name="note"
          rows={3}
          maxLength={1000}
          className="rounded border border-line bg-crema p-2 text-foam"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded border border-line px-4 py-2 font-display text-sm font-bold uppercase tracking-widest hover:border-ember disabled:opacity-60"
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
