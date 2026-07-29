import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/Reveal";
import { ProductCard } from "@/components/ProductCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { getProductsByCategory } from "@/sanity/queries";
import { type Locale } from "@/sanity/localize";
import { CATEGORY_SLUGS, isValidCategory } from "@/lib/categories";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    CATEGORY_SLUGS.map((categoria) => ({ locale, categoria })),
  );
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; categoria: string }>;
}) {
  const { locale, categoria } = await params;
  if (!isValidCategory(categoria)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations({ locale, namespace: "collections" });
  const tcat = await getTranslations({ locale, namespace: "categories" });
  const products = await getProductsByCategory(categoria);

  const labels: Record<string, string> = { all: t("all") };
  CATEGORY_SLUGS.forEach((s) => (labels[s] = tcat(s)));

  return (
    <section className="mx-auto max-w-7xl px-6 pt-16">
      <h1 className="font-serif text-4xl mb-10">{tcat(categoria)}</h1>
      <CategoryFilter locale={locale} active={categoria} labels={labels} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
        {products.map((p, i) => (
          <Reveal key={p._id}>
            <ProductCard product={p} locale={l} index={i} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
