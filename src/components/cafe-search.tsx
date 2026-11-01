"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Cafe } from "@/lib/cafes";
import type { MenuHit } from "@/lib/menu-search";
import { CafeLogo } from "./cafe-logo";

type Strings = {
  placeholder: string;
  clear: string;
  open: string;
  noMatch: string;
  /** "See all 4": shows every match on the map or list. */
  showAll: string;
};

type Props = {
  query: string;
  onQuery: (q: string) => void;
  /** Cafes matching the query (and the other filters), best first. */
  matches: Cafe[];
  onPick: (id: string) => void;
  /** Keeps the search and closes the suggestions, to see every match. */
  onShowAll: () => void;
  /** Cafes whose menu matched, with the item to show instead of the address. */
  menuHits: Record<string, MenuHit>;
  hitText: (hit: MenuHit) => string;
  strings: Strings;
  /** Phones: the search covers the top bar while open. */
  mobileOpen: boolean;
  onMobileOpen: (open: boolean) => void;
};

/** Accent- and case-insensitive text for matching ("Ñuwave" finds "nuwave"). */
export const searchText = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

const MAX_SUGGESTIONS = 6;

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

function Field({
  query,
  onQuery,
  matches,
  onPick,
  onShowAll,
  menuHits,
  hitText,
  strings,
  autoFocus,
  onClose,
}: Omit<Props, "mobileOpen" | "onMobileOpen"> & { autoFocus?: boolean; onClose?: () => void }) {
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = matches.slice(0, MAX_SUGGESTIONS);
  const showList = focused && query.trim().length > 0;
  // With more than one match, the first row (and Enter) shows them all, so
  // "caramel macchiato" lists every cafe that serves one.
  const allRow = matches.length > 1 ? 1 : 0;
  const optionCount = allRow + list.length;

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  function pick(id: string) {
    onPick(id);
    input.current?.blur();
  }

  function showAll() {
    onShowAll();
    input.current?.blur();
  }

  function choose(i: number) {
    if (allRow && i === 0) showAll();
    else if (list[i - allRow]) pick(list[i - allRow].id);
  }

  return (
    <div className="relative w-full">
      <div className="flex h-10 items-center gap-2 rounded-full border border-line bg-crema/90 pl-3 pr-1 shadow-sm backdrop-blur transition-colors focus-within:border-ember">
        <span className="text-mute">
          <SearchIcon />
        </span>
        <input
          ref={input}
          type="search"
          value={query}
          onChange={(e) => {
            onQuery(e.target.value);
            setActive(0);
          }}
          onFocus={() => setFocused(true)}
          // Delay so a tap on a suggestion lands before the list closes.
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, optionCount - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              choose(active);
            } else if (e.key === "Escape") {
              if (query) onQuery("");
              else onClose?.();
            }
          }}
          placeholder={strings.placeholder}
          aria-label={strings.placeholder}
          role="combobox"
          aria-expanded={showList}
          aria-controls="cafe-search-list"
          aria-autocomplete="list"
          enterKeyHint="search"
          // 16px stops iPhones zooming in on focus.
          className="min-w-0 flex-1 bg-transparent text-base text-foam placeholder:text-mute focus:outline-none sm:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {(query || onClose) && (
          <button
            type="button"
            onClick={() => {
              if (query) {
                onQuery("");
                input.current?.focus();
              } else onClose?.();
            }}
            aria-label={strings.clear}
            className="grid size-8 shrink-0 place-items-center rounded-full text-mute transition-colors hover:text-ember"
          >
            ✕
          </button>
        )}
      </div>

      <AnimatePresence>
        {showList && (
          <motion.ul
            id="cafe-search-list"
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute inset-x-0 top-12 z-30 overflow-hidden rounded-2xl border border-line bg-crema/95 p-1.5 shadow-xl shadow-black/25 backdrop-blur"
          >
            {list.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-mute">{strings.noMatch}</li>
            ) : (
              <>
                {allRow === 1 && (
                  <li role="option" aria-selected={active === 0}>
                    <button
                      type="button"
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={showAll}
                      onMouseEnter={() => setActive(0)}
                      className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left text-sm font-semibold text-ember transition-colors ${
                        active === 0 ? "bg-roast/60" : ""
                      }`}
                    >
                      <span className="grid size-8 shrink-0 place-items-center">
                        <SearchIcon />
                      </span>
                      {strings.showAll}
                    </button>
                  </li>
                )}
                {list.map((c, n) => {
                  const i = n + allRow;
                  const hit = menuHits[c.id];
                  return (
                    <li key={c.id} role="option" aria-selected={i === active}>
                      <button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => pick(c.id)}
                        onMouseEnter={() => setActive(i)}
                        className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors ${
                          i === active ? "bg-roast/60" : ""
                        }`}
                      >
                        <CafeLogo name={c.name} src={c.logoUrl} size={32} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foam">{c.name}</span>
                          {hit ? (
                            <span className="block truncate text-xs font-semibold text-ember">{hitText(hit)}</span>
                          ) : (
                            c.address && <span className="block truncate text-xs text-mute">{c.address}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Search by cafe name, address, or anything on a cafe's menu. Inline from tablet
 * width up; on phones a round button that opens a full-width field over the top bar.
 */
export function CafeSearch(props: Props) {
  const { mobileOpen, onMobileOpen, strings } = props;
  return (
    <>
      <div className="pointer-events-auto hidden w-64 sm:block lg:w-80">
        <Field {...props} />
      </div>
      <button
        type="button"
        onClick={() => onMobileOpen(true)}
        aria-label={strings.open}
        className="pointer-events-auto grid size-10 shrink-0 place-items-center rounded-full border border-line bg-crema/90 text-foam shadow-sm backdrop-blur transition duration-200 hover:border-ember active:scale-95 sm:hidden"
      >
        <SearchIcon />
      </button>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-auto absolute inset-0 z-30 flex items-center sm:hidden"
          >
            <Field
              {...props}
              autoFocus
              onClose={() => {
                props.onQuery("");
                onMobileOpen(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
