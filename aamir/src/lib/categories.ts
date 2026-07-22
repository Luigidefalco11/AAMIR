export const CATEGORY_SLUGS = [
  "collane",
  "bracciali",
  "orecchini",
  "anelli",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export function isValidCategory(slug: string): slug is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(slug);
}
