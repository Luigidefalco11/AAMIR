import Image from "next/image";
import { urlFor, sanityImageLoader } from "@/sanity/client";
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
  // Demo catalog: a direct image URL (e.g. /demo/*.svg) with no Sanity asset.
  if (image?.url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image.url}
        alt={alt}
        className={`absolute inset-0 h-full w-full object-cover ${className ?? ""}`}
      />
    );
  }
  if (!image?.asset) {
    return (
      <div
        className={`absolute inset-0 h-full w-full flex items-center justify-center bg-[color:var(--color-surface)] border border-[color:var(--color-border)] ${className ?? ""}`}
        aria-label={alt}
        role="img"
      >
        <span className="font-serif text-3xl text-[color:var(--color-gold)]">A</span>
      </div>
    );
  }
  const src = urlFor(image).url();
  return (
    <Image
      src={src}
      loader={sanityImageLoader}
      alt={alt}
      fill
      sizes={sizes ?? "(max-width: 768px) 100vw, 50vw"}
      priority={priority}
      className={`object-cover ${className ?? ""}`}
    />
  );
}
