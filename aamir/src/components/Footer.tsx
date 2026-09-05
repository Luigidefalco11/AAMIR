import { getSiteSettings } from "@/sanity/queries";
import { instagramUrl } from "@/lib/contact";

export async function Footer() {
  const settings = await getSiteSettings();
  const email = settings?.email ?? "info@aamirjewelry.it";
  const ig = settings?.instagram ?? "aamir.jewelry";

  return (
    <footer className="mt-24 border-t border-[color:var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <span className="font-serif text-lg tracking-[0.3em]">AAMIR</span>
        <div className="flex gap-6">
          <a href={`mailto:${email}`} className="hover:text-[color:var(--color-primary)] transition-colors">{email}</a>
          <a href={instagramUrl(ig)} target="_blank" rel="noopener noreferrer" className="hover:text-[color:var(--color-primary)] transition-colors">@{ig}</a>
          <a href="/it/termini" className="hover:text-[color:var(--color-primary)] transition-colors">Termini</a>
        </div>
        <span className="text-[color:var(--color-text)]/70">Salerno, Italia</span>
      </div>
    </footer>
  );
}
