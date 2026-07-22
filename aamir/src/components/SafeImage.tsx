import Image from "next/image";
import { urlFor } from "@/sanity/client";
import type { SanityImage } from "@/sanity/types";

export function SafeImage({
  image,
  alt,
  sizes,
  priority,
  className,
}: {
  image?: SanityImage | null;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (!image?.asset) {
    return (
      <div
        className={`flex items-center justify-center bg-[color:var(--color-surface)] border border-[color:var(--color-border)] ${className ?? ""}`}
        aria-label={alt}
        role="img"
      >
        <span className="font-serif text-3xl text-[color:var(--color-gold)]">A</span>
      </div>
    );
  }
  const src = urlFor(image).width(1200).auto("format").url();
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? "(max-width: 768px) 100vw, 50vw"}
      priority={priority}
      className={`object-cover ${className ?? ""}`}
    />
  );
}
