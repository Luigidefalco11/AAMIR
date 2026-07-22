import { setRequestLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/Reveal";
import { ProductCard } from "@/components/ProductCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { getAllProducts } from "@/sanity/queries";
import { type Locale } from "@/sanity/localize";
import { CATEGORY_SLUGS } from "@/lib/categories";

export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations({ locale, namespace: "collections" });
  const tcat = await getTranslations({ locale, namespace: "categories" });
  const products = await getAllProducts();

  const labels: Record<string, string> = { all: t("all") };
  CATEGORY_SLUGS.forEach((s) => (labels[s] = tcat(s)));

  return (
    <section className="mx-auto max-w-7xl px-6 pt-16">
      <h1 className="font-serif text-4xl mb-10">{t("title")}</h1>
      <CategoryFilter locale={locale} active={null} labels={labels} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
        {products.map((p) => (
          <Reveal key={p._id}>
            <ProductCard product={p} locale={l} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
