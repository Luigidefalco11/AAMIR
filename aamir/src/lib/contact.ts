import type { Locale } from "@/sanity/localize";

const BODIES: Record<Locale, (name: string) => string> = {
  it: (name) => `Salve, sono interessato/a a questo pezzo: ${name}.`,
  en: (name) => `Hello, I'm interested in this piece: ${name}.`,
};

export function instagramUrl(handle: string): string {
  const clean = handle.replace(/^@/, "");
  return `https://instagram.com/${clean}`;
}

export function instagramDmUrl(handle: string): string {
  const clean = handle.replace(/^@/, "");
  return `https://ig.me/m/${clean}`;
}

export function buildRequestInfoMessage({
  productName,
  locale,
}: {
  productName: string;
  locale: Locale;
}): string {
  return BODIES[locale](productName);
}
