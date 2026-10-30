"use client";

import { useCallback, useSyncExternalStore } from "react";

// Saved cafes live in this browser only (no account needed). Every component
// using useFavorites stays in step, including across tabs.
const KEY = "kape-saved";
const EVENT = "kape-saved-change";
const EMPTY: string[] = [];

let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(ids: string[]) {
  cache = ids;
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Private mode or storage full: keep it for this visit only.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      onChange();
    }
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFavorites() {
  // The server render has nothing saved; the browser fills it in after loading.
  const ids = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toggle = useCallback((id: string) => {
    const now = read();
    write(now.includes(id) ? now.filter((x) => x !== id) : [...now, id]);
  }, []);
  return { ids, isSaved: (id: string) => ids.includes(id), toggle };
}
