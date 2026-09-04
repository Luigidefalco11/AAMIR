import { urlFor } from "@/sanity/client";
import type { SanityImage } from "@/sanity/types";

// Widths for the responsive srcset — Sanity's CDN resizes/caches each variant,
// so no image processing happens on our own (slower, resource-constrained) host.
const RESPONSIVE_WIDTHS = [400, 640, 768, 1024, 1280, 1600, 1920];

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
  const srcSet = RESPONSIVE_WIDTHS.map(
    (w) => `${urlFor(image).width(w).auto("format").url()} ${w}w`,
  ).join(", ");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={urlFor(image).width(1200).auto("format").url()}
      srcSet={srcSet}
      sizes={sizes ?? "(max-width: 768px) 100vw, 50vw"}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      className={`absolute inset-0 h-full w-full object-cover ${className ?? ""}`}
    />
  );
}
