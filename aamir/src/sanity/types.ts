export type LocaleField = { it?: string; en?: string };

// `asset` is present for real CMS images (rendered via the Sanity image
// builder). `url` is an optional direct source used by the demo catalog until
// real photos are uploaded.
export type SanityImage = { asset?: unknown; alt: string; url?: string };

export type Product = {
  _id: string;
  title: LocaleField;
  slug: string;
  categorySlug: string;
  images: SanityImage[];
  materials: LocaleField;
  description: LocaleField;
  price?: number;
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
  legalBusinessName?: string;
  vatNumber?: string;
  businessAddress?: string;
};
