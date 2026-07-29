import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/Reveal";
import { Tilt3D } from "@/components/Tilt3D";
import { ProductCard } from "@/components/ProductCard";
import { SafeImage } from "@/components/SafeImage";
import { getFeaturedProducts, getSiteSettings } from "@/sanity/queries";
import { localize, type Locale } from "@/sanity/localize";

const HERO_FALLBACK = {
  it: { title: "Gioielli lavorati a mano a Salerno", subtitle: "Pietre preziose, forma e precisione. Ogni pezzo nasce dalle mani di Aamir." },
  en: { title: "Handcrafted jewelry in Salerno", subtitle: "Precious stones, form and precision. Every piece is made by Aamir's hands." },
};

const ABOUT_FALLBACK = {
  it: "Aamir lavora l'oreficeria da oltre dieci anni, qui in Italia. Seleziona e lavora pietre preziose con la precisione di chi conosce il mestiere fino in fondo, trasformandole a mano in collane, anelli, bracciali e orecchini. Nessuna produzione in serie: solo la ricerca costante di equilibrio, forma e qualità, a pochi passi dal mare di Salerno.",
  en: "Aamir has worked in goldsmithing for over ten years, here in Italy. He selects and works precious stones with the precision of a true master of the craft, shaping them by hand into necklaces, rings, bracelets and earrings. No mass production: only a constant pursuit of balance, form and quality, steps away from the sea of Salerno.",
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations({ locale, namespace: "hero" });
  const tc = await getTranslations({ locale, namespace: "collections" });
  const [featured, settings] = await Promise.all([
    getFeaturedProducts(),
    getSiteSettings(),
  ]);

  const heroTitle = localize(settings?.heroTitle, l) || HERO_FALLBACK[l].title;
  const heroSubtitle = localize(settings?.heroSubtitle, l) || HERO_FALLBACK[l].subtitle;
  const about = localize(settings?.aboutText, l) || ABOUT_FALLBACK[l];

  return (
    <>
      <section className="mx-auto max-w-7xl px-6 pt-16 md:pt-24 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <Reveal delay={0} y={48}>
            <h1 className="font-serif text-4xl md:text-6xl leading-tight">{heroTitle}</h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 text-lg text-[color:var(--color-text)]/70 max-w-md">{heroSubtitle}</p>
          </Reveal>
          <Reveal delay={0.3}>
            <Link
              href={`/${locale}/collezioni`}
              className="inline-block mt-8 px-7 py-3 bg-[color:var(--color-primary)] text-white text-sm tracking-wide hover:bg-[color:var(--color-primary-hover)] hover:-translate-y-0.5 transition-all duration-300"
            >
              {t("cta")}
            </Link>
          </Reveal>
        </div>
        <Reveal delay={0.2} y={56}>
          <div className="relative aspect-[4/5] w-full overflow-hidden">
            <Tilt3D className="absolute inset-0" amount={14}>
              <div className="absolute inset-0 scale-[1.12]">
                <SafeImage image={featured[0]?.images?.[0]} alt={heroTitle} sizes="(max-width: 768px) 100vw, 50vw" priority />
              </div>
            </Tilt3D>
          </div>
        </Reveal>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 mt-24">
          <Reveal>
            <h2 className="font-serif text-3xl mb-10">{tc("title")}</h2>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {featured.slice(0, 6).map((p) => (
              <Reveal key={p._id}>
                <ProductCard product={p} locale={l} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-3xl px-6 mt-28 text-center">
        <Reveal>
          <p className="font-serif text-2xl md:text-3xl leading-relaxed text-[color:var(--color-text)]/85">{about}</p>
        </Reveal>
      </section>
    </>
  );
}
