"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "./use-theme";

type Props = { toLight: string; toDark: string };

export function ThemeToggle({ toLight, toDark }: Props) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? toLight : toDark}
      title={isDark ? toLight : toDark}
      className="grid size-8 place-items-center overflow-hidden rounded border border-line bg-crema text-ember transition-colors duration-200 hover:border-ember active:scale-95"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          aria-hidden
          initial={{ opacity: 0, rotate: -60, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 60, scale: 0.6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="text-base leading-none"
        >
          {isDark ? "☀" : "☾"}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
