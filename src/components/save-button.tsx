"use client";

import { motion } from "motion/react";
import { useFavorites } from "@/lib/favorites";

type Props = {
  cafeId: string;
  labels: { save: string; unsave: string };
  className?: string;
};

/** Heart that saves a cafe on this device. */
export function SaveButton({ cafeId, labels, className = "" }: Props) {
  const { isSaved, toggle } = useFavorites();
  const saved = isSaved(cafeId);
  return (
    <button
      type="button"
      onClick={() => toggle(cafeId)}
      aria-pressed={saved}
      aria-label={saved ? labels.unsave : labels.save}
      title={saved ? labels.unsave : labels.save}
      className={`grid size-10 shrink-0 place-items-center rounded-full border transition duration-200 active:scale-90 ${
        saved ? "border-ember bg-ember/10 text-ember" : "border-line text-mute hover:border-ember hover:text-ember"
      } ${className}`}
    >
      <motion.svg
        key={saved ? "on" : "off"}
        initial={{ scale: saved ? 0.6 : 1 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 600, damping: 18 }}
        viewBox="0 0 24 24"
        className="size-5"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z" />
      </motion.svg>
    </button>
  );
}
