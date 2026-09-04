import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ProductGallery } from "@/components/ProductGallery";
import { AddToCartButton } from "@/components/AddToCartButton";
import { getProduct, getSiteSettings } from "@/sanity/queries";
import { localize, type Locale } from "@/sanity/localize";
import { instagramUrl } from "@/lib/contact";
import { urlFor } from "@/sanity/client";

// Product pages depend on live CMS data that changes; render on demand
// (with data-layer revalidation) rather than as build-time static pages.
// This also avoids a static/dynamic collision with getLocale() in the root
// layout when a requested slug isn't in generateStaticParams.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  const title = localize(product.title, locale as Locale);
  return { title: `${title} — AAMIR` };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; categoria: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const l = locale as Locale;
  const [product, settings, t] = await Promise.all([
    getProduct(slug),
    getSiteSettings(),
    getTranslations({ locale, namespace: "product" }),
  ]);
  if (!product) notFound();

  const title = localize(product.title, l);
  const materials = localize(product.materials, l);
  const description = localize(product.description, l);
  const ig = settings?.instagram ?? "aamir.jewelry";
  const purchasable = product.available && typeof product.price === "number";

  return (
    <section className="mx-auto max-w-7xl px-6 pt-12 grid md:grid-cols-2 gap-12">
      <ProductGallery images={product.images ?? []} title={title} />

      <div className="md:pt-8">
        <Link href={`/${locale}/collezioni`} className="text-sm text-[color:var(--color-text)]/70 hover:text-[color:var(--color-primary)] transition-colors">
          ← {t("backToCollections")}
        </Link>
        <h1 className="font-serif text-4xl mt-4">{title}</h1>

        {typeof product.price === "number" && (
          <p className="mt-4 text-2xl font-serif">€{product.price}</p>
        )}

        {materials && (
          <p className="mt-6">
            <span className="block text-xs uppercase tracking-widest text-[color:var(--color-text)]/70">{t("materials")}</span>
            <span className="text-lg">{materials}</span>
          </p>
        )}

        {description && (
          <p className="mt-6 leading-relaxed text-[color:var(--color-text)]/80 max-w-prose">{description}</p>
        )}

        <div className="mt-10 flex items-center gap-6">
          {purchasable ? (
            <AddToCartButton
              product={{
                productId: product._id,
                slug: product.slug,
                categorySlug: product.categorySlug,
                title: product.title,
                price: product.price as number,
                imageUrl: product.images?.[0]
                  ? urlFor(product.images[0]).width(200).auto("format").url()
                  : undefined,
              }}
              addLabel={t("addToCart")}
              inCartLabel={t("inCart")}
            />
          ) : (
            <span className="text-sm text-[color:var(--color-text)]/70">
              {product.available ? t("priceOnRequest") : t("sold")}
            </span>
          )}
          <a href={instagramUrl(ig)} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-[color:var(--color-primary)] transition-colors">
            @{ig}
          </a>
        </div>
      </div>
    </section>
  );
}
