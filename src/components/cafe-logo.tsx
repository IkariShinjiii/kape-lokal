"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  name: string;
  src: string | null;
  /** Diameter in px. */
  size: number;
  className?: string;
};

/**
 * A cafe's round logo. Without one, or if it fails to load, the cafe's initial on
 * a tinted disc stands in, so a missing logo looks intentional.
 */
export function CafeLogo({ name, src, size, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-gradient-to-br from-ember/35 to-crema ${className}`}
    >
      {showImage ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={`${size}px`}
          // Already sized and cached by /api/logo.
          unoptimized
          className="bg-foam object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="font-display font-bold uppercase leading-none text-ember"
          style={{ fontSize: size * 0.45 }}
        >
          {name.trim().charAt(0)}
        </span>
      )}
    </span>
  );
}
