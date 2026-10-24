import type { CafeTag } from "@/lib/tags";

const STYLES: Record<CafeTag, string> = {
  specialty_coffee: "bg-chip-specialty-bg text-chip-specialty-fg",
  matcha: "bg-chip-matcha-bg text-leaf",
  pastry: "bg-crema text-foam border border-line",
  work_friendly: "bg-crema text-foam border border-line",
  pet_friendly: "bg-crema text-foam border border-line",
};

export function TagChip({ tag, label }: { tag: CafeTag; label: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-[3px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STYLES[tag]}`}
    >
      {label}
    </span>
  );
}

export function ChainChip({ label }: { label: string }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-[3px] border border-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mute">
      {label}
    </span>
  );
}
