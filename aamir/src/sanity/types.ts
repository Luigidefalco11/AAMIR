export type LocaleField = { it?: string; en?: string };

export type SanityImage = { asset: unknown; alt: string };

export type Product = {
  _id: string;
  title: LocaleField;
  slug: string;
  categorySlug: string;
  images: SanityImage[];
  materials: LocaleField;
  description: LocaleField;
  available: boolean;
};

export type Category = {
  _id: string;
  title: LocaleField;
  slug: string;
  cover?: SanityImage;
};

export type SiteSettings = {
  heroTitle: LocaleField;
  heroSubtitle: LocaleField;
  aboutText: LocaleField;
  email: string;
  instagram: string;
  metaDescription: LocaleField;
};
