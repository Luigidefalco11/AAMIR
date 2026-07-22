import type { Locale } from "@/sanity/localize";

const SUBJECTS: Record<Locale, string> = {
  it: "Richiesta info",
  en: "Product enquiry",
};

const BODIES: Record<Locale, (name: string) => string> = {
  it: (name) => `Salve, sono interessato/a a questo pezzo: ${name}.`,
  en: (name) => `Hello, I'm interested in this piece: ${name}.`,
};

export function buildRequestInfoMailto({
  email,
  productName,
  locale,
}: {
  email: string;
  productName: string;
  locale: Locale;
}): string {
  const subject = encodeURIComponent(`${SUBJECTS[locale]}: ${productName}`);
  const body = encodeURIComponent(BODIES[locale](productName));
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export function instagramUrl(handle: string): string {
  const clean = handle.replace(/^@/, "");
  return `https://instagram.com/${clean}`;
}
