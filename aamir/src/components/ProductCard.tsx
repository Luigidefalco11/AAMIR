import Link from "next/link";
import { SafeImage } from "./SafeImage";
import { localize, type Locale } from "@/sanity/localize";
import type { Product } from "@/sanity/types";

export function ProductCard({
  product,
  locale,
}: {
  product: Product;
  locale: Locale;
}) {
  const title = localize(product.title, locale);
  const materials = localize(product.materials, locale);
  return (
    <Link
      href={`/${locale}/collezioni/${product.categorySlug}/${product.slug}`}
      className="group block"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--color-surface)]">
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]">
          <SafeImage image={product.images?.[0]} alt={product.images?.[0]?.alt || title} sizes="(max-width: 768px) 100vw, 33vw" />
        </div>
      </div>
      <h3 className="mt-4 font-serif text-xl">{title}</h3>
      {materials && <p className="text-sm text-[color:var(--color-text)]/70">{materials}</p>}
    </Link>
  );
}
