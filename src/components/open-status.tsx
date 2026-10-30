"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { t } from "@/lib/format";
import { clock, dayName, formatHours, openState, type OpenState } from "@/lib/hours";
import type { Locale } from "@/lib/i18n";

type Props = {
  hours: string | null;
  lang: Locale;
  dict: Dictionary;
  /** Also show the readable weekly hours after the status. */
  withHours?: boolean;
  className?: string;
};

/**
 * "Open now · until 9 PM" or "Closed · opens 8 AM", in Philippine time. Worked out
 * in the browser after loading (the page itself is cached), and refreshed each minute.
 */
export function OpenStatus({ hours, lang, dict, withHours = false, className = "" }: Props) {
  const [state, setState] = useState<OpenState | null>(null);

  useEffect(() => {
    const update = () => setState(openState(hours));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [hours]);

  if (!hours) return null;
  const readable = withHours ? formatHours(hours, lang) : null;

  let status: React.ReactNode = null;
  if (state) {
    const detail = state.open
      ? state.closesAt === null
        ? null
        : t(dict.cafe.closesAt, { time: clock(state.closesAt) })
      : state.opensAt === null
        ? null
        : state.opensDay === null
          ? t(dict.cafe.opensAt, { time: clock(state.opensAt) })
          : t(dict.cafe.opensDayAt, { day: dayName(state.opensDay, lang), time: clock(state.opensAt) });
    status = (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span
          aria-hidden
          className={`size-1.5 rounded-full ${state.open ? "bg-leaf" : "bg-mute"}`}
        />
        <span className={`font-semibold ${state.open ? "text-leaf" : "text-mute"}`}>
          {state.open ? dict.cafe.openNow : dict.cafe.closedNow}
        </span>
        {detail && <span className="text-mute">· {detail}</span>}
      </span>
    );
  }

  if (!status && !readable) return null;
  return (
    <span className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${className}`}>
      {status}
      {readable && <span className="text-mute">{readable}</span>}
    </span>
  );
}
