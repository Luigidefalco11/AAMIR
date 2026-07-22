import { setRequestLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/Reveal";
import { getSiteSettings } from "@/sanity/queries";
import { localize, type Locale } from "@/sanity/localize";

const ABOUT_FALLBACK = {
  it: "Aamir lavora l'oreficeria da oltre dieci anni, qui in Italia. Seleziona e lavora pietre preziose con la precisione di chi conosce il mestiere fino in fondo, trasformandole a mano in collane, anelli, bracciali e orecchini. Nessuna produzione in serie: solo la ricerca costante di equilibrio, forma e qualità, a pochi passi dal mare di Salerno.",
  en: "Aamir has worked in goldsmithing for over ten years, here in Italy. He selects and works precious stones with the precision of a true master of the craft, shaping them by hand into necklaces, rings, bracelets and earrings. No mass production: only a constant pursuit of balance, form and quality, steps away from the sea of Salerno.",
};

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations({ locale, namespace: "about" });
  const settings = await getSiteSettings();
  const about = localize(settings?.aboutText, l) || ABOUT_FALLBACK[l];

  return (
    <section className="mx-auto max-w-3xl px-6 pt-16">
      <Reveal>
        <h1 className="font-serif text-4xl md:text-5xl mb-10">{t("title")}</h1>
      </Reveal>
      <Reveal>
        <p className="text-lg md:text-xl leading-relaxed text-[color:var(--color-text)]/85">{about}</p>
      </Reveal>
    </section>
  );
}
