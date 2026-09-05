import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "checkout" });

  return (
    <section className="mx-auto max-w-xl px-6 pt-24 pb-24 text-center">
      <h1 className="font-serif text-4xl mb-6">{t("successTitle")}</h1>
      <p className="text-[color:var(--color-text)]/80 mb-10">{t("successBody")}</p>
      <Link
        href={`/${locale}/collezioni`}
        className="inline-block px-8 py-3 bg-[color:var(--color-primary)] text-white text-sm tracking-wide hover:bg-[color:var(--color-primary-hover)] transition-colors"
      >
        {t("backToShop")}
      </Link>
    </section>
  );
}
