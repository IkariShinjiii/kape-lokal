import Image from "next/image";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Cafe } from "@/lib/cafes";
import { mediaUrl } from "@/lib/media";
import type { Locale } from "@/lib/i18n";
import { CafeLogo } from "./cafe-logo";
import { OpenStatus } from "./open-status";
import { ChainChip, TagChip } from "./tag-chip";

// What the card shows before there is a photo: the cafe's logo (or initial) on a
// tinted tile, so a missing photo looks intentional instead of broken.
function Placeholder({ cafe }: { cafe: Cafe }) {
  return (
    <div
      aria-hidden
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ember/30 via-crema to-crema"
    >
      <CafeLogo name={cafe.name} src={cafe.logoUrl} size={72} className="shadow-lg shadow-black/25" />
    </div>
  );
}

/** The card that follows a pin on hover: photo, name, a few details. */
export function CafePreview({ cafe, dict, lang }: { cafe: Cafe; dict: Dictionary; lang: Locale }) {
  return (
    <div className="w-64 overflow-hidden rounded-xl border border-line bg-crema shadow-xl shadow-black/30">
      <div className="relative h-28 w-full bg-roast">
        {cafe.coverImagePath ? (
          <Image
            src={mediaUrl(cafe.coverImagePath)}
            alt=""
            fill
            sizes="256px"
            className="object-cover"
          />
        ) : (
          <Placeholder cafe={cafe} />
        )}
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        <h3 className="font-display text-xl font-bold uppercase leading-none">
          {cafe.name}
        </h3>
        {cafe.address && <p className="line-clamp-2 text-xs text-mute">{cafe.address}</p>}
        <OpenStatus hours={cafe.hours} lang={lang} dict={dict} className="text-xs" />
        {(cafe.tags.length > 0 || cafe.isChain) && (
          <div className="flex flex-wrap gap-1">
            {cafe.tags.map((tag) => (
              <TagChip key={tag} tag={tag} label={dict.cafe.tags[tag]} />
            ))}
            {cafe.isChain && <ChainChip label={dict.cafe.chain} />}
          </div>
        )}
      </div>
    </div>
  );
}
