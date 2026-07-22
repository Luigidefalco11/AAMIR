"use client";

import { useState } from "react";
import { SafeImage } from "./SafeImage";
import type { SanityImage } from "@/sanity/types";

export function ProductGallery({
  images,
  title,
}: {
  images: SanityImage[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const current = images?.[active];

  return (
    <div>
      <div className="relative aspect-[4/5] w-full bg-[color:var(--color-surface)]">
        <SafeImage image={current} alt={current?.alt || title} sizes="(max-width: 768px) 100vw, 50vw" priority />
      </div>
      {images?.length > 1 && (
        <div className="mt-4 flex gap-3">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`${title} — ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              className={`relative w-20 h-24 bg-[color:var(--color-surface)] border ${
                i === active ? "border-[color:var(--color-primary)]" : "border-[color:var(--color-border)]"
              }`}
            >
              <SafeImage image={img} alt={img.alt} sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
