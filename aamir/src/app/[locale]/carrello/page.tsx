import { setRequestLocale, getTranslations } from "next-intl/server";
import { CartPageClient } from "@/components/CartPageClient";
import type { Locale } from "@/sanity/localize";

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "cart" });

  return (
    <section className="mx-auto max-w-3xl px-6 pt-16 pb-24">
      <h1 className="font-serif text-4xl mb-10">{t("title")}</h1>
      <CartPageClient
        locale={locale as Locale}
        labels={{
          empty: t("empty"),
          remove: t("remove"),
          total: t("total"),
          consent: t("consent"),
          terms: t("terms"),
          checkout: t("checkout"),
          checkoutError: t("checkoutError"),
          itemRemovedWarning: t("itemRemovedWarning"),
        }}
      />
    </section>
  );
}
