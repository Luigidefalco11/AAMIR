import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getSiteSettings } from "@/sanity/queries";
import { instagramUrl } from "@/lib/contact";

export async function Header({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const settings = await getSiteSettings();
  const ig = settings?.instagram ?? "aamir.jewelry";
  const base = `/${locale}`;

  return (
    <header className="sticky top-0 z-40 bg-[color:var(--color-bg)]/90 backdrop-blur border-b border-[color:var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <nav className="hidden md:flex gap-8 text-sm">
          <Link href={base} className="hover:text-[color:var(--color-primary)] transition-colors">{t("home")}</Link>
          <Link href={`${base}/collezioni`} className="hover:text-[color:var(--color-primary)] transition-colors">{t("collections")}</Link>
          <Link href={`${base}/chi-siamo`} className="hover:text-[color:var(--color-primary)] transition-colors">{t("about")}</Link>
          <Link href={`${base}/contatti`} className="hover:text-[color:var(--color-primary)] transition-colors">{t("contact")}</Link>
        </nav>
        <Link href={base} className="font-serif text-2xl tracking-[0.3em] font-semibold">
          AAMIR
        </Link>
        <div className="flex items-center gap-4">
          <a href={instagramUrl(ig)} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-[color:var(--color-primary)] transition-colors">Instagram</a>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
