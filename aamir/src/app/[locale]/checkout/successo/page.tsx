import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ClearCartOnMount } from "@/components/ClearCartOnMount";

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  const { locale } = await params;
  const { session_id: sessionId } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "checkout" });

  // Stripe's success_url carries ?session_id={CHECKOUT_SESSION_ID}, so its
  // presence is what distinguishes a genuine post-purchase redirect from a
  // bookmark, a back-button navigation or a shared link — only the former may
  // empty the visitor's cart.
  const cameFromStripe = Array.isArray(sessionId) ? sessionId.length > 0 : Boolean(sessionId);

  return (
    <section className="mx-auto max-w-xl px-6 pt-24 pb-24 text-center">
      {cameFromStripe ? <ClearCartOnMount /> : null}
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
