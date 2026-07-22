import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  // This segment renders under the default locale when a localized route misses.
  const t = await getTranslations({ locale: "it", namespace: "notFound" });
  return (
    <section className="mx-auto max-w-xl px-6 py-32 text-center">
      <h1 className="font-serif text-5xl mb-6">404</h1>
      <p className="text-lg text-[color:var(--color-text)]/70 mb-8">{t("title")}</p>
      <Link href="/it" className="px-6 py-3 bg-[color:var(--color-primary)] text-white text-sm hover:bg-[color:var(--color-primary-hover)] transition-colors">
        {t("cta")}
      </Link>
    </section>
  );
}
