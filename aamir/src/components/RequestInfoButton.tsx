import { buildRequestInfoMailto } from "@/lib/contact";
import type { Locale } from "@/sanity/localize";

export function RequestInfoButton({
  email,
  productName,
  locale,
  label,
}: {
  email: string;
  productName: string;
  locale: Locale;
  label: string;
}) {
  const href = buildRequestInfoMailto({ email, productName, locale });
  return (
    <a
      href={href}
      className="inline-block px-8 py-3 bg-[color:var(--color-primary)] text-white text-sm tracking-wide hover:bg-[color:var(--color-primary-hover)] transition-colors"
    >
      {label}
    </a>
  );
}
