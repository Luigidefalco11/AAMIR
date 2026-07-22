"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: "it" | "en") {
    if (next === locale) return;
    const segments = pathname.split("/");
    segments[1] = next; // first segment after leading slash is the locale
    router.push(segments.join("/") || "/");
  }

  return (
    <div className="flex items-center gap-2 text-xs tracking-wide">
      {(["it", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          aria-current={l === locale ? "true" : undefined}
          className={
            l === locale
              ? "text-[color:var(--color-primary)] font-semibold"
              : "text-[color:var(--color-text)]/60 hover:text-[color:var(--color-primary)] transition-colors"
          }
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
