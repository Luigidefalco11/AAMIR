import { setRequestLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/Reveal";
import { getSiteSettings } from "@/sanity/queries";
import { instagramUrl } from "@/lib/contact";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contact" });
  const settings = await getSiteSettings();
  const email = settings?.email ?? "info@aamirjewelry.it";
  const ig = settings?.instagram ?? "aamir.jewelry";

  return (
    <section className="mx-auto max-w-2xl px-6 pt-16 text-center">
      <Reveal>
        <h1 className="font-serif text-4xl md:text-5xl mb-6">{t("title")}</h1>
        <p className="text-[color:var(--color-text)]/70 mb-12">{t("intro")}</p>
      </Reveal>
      <Reveal>
        <div className="space-y-6">
          <div>
            <span className="block text-xs uppercase tracking-widest text-[color:var(--color-text)]/70 mb-1">{t("emailLabel")}</span>
            <a href={`mailto:${email}`} className="text-lg hover:text-[color:var(--color-primary)] transition-colors">{email}</a>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-widest text-[color:var(--color-text)]/70 mb-1">Instagram</span>
            <a href={instagramUrl(ig)} target="_blank" rel="noopener noreferrer" className="text-lg hover:text-[color:var(--color-primary)] transition-colors">@{ig}</a>
          </div>
          <p className="pt-6 text-[color:var(--color-text)]/70">Salerno, Italia</p>
        </div>
      </Reveal>
    </section>
  );
}
