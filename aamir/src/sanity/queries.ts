import { client } from "./client";
import { writeClient } from "./writeClient";
import { isConfigured } from "./env";
import type { Product, Category, SiteSettings } from "./types";
import {
  DEMO_PRODUCTS,
  DEMO_FEATURED,
  demoByCategory,
  demoBySlug,
} from "@/lib/demoProducts";

export const PRODUCT_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  "categorySlug": category->slug.current,
  "images": images[]{ asset, alt },
  materials,
  description,
  price,
  available
}`;

const CATEGORY_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  "cover": cover{ asset, alt }
}`;

export const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  heroTitle, heroSubtitle, aboutText, email, instagram, metaDescription,
  legalBusinessName, vatNumber, businessAddress
}`;

// Every piece is one-of-a-kind: once sold (available == false) it must drop
// out of the listings immediately. The single-product query deliberately does
// NOT filter on availability — a sold piece's own page still resolves and
// renders the "Venduto" state instead of a 404.
export const featuredProductsQuery = `*[_type == "product" && featured == true && available == true] | order(order asc) ${PRODUCT_PROJECTION}`;
export const allProductsQuery = `*[_type == "product" && available == true] | order(order asc) ${PRODUCT_PROJECTION}`;
export const productsByCategoryQuery = `*[_type == "product" && category->slug.current == $slug && available == true] | order(order asc) ${PRODUCT_PROJECTION}`;
export const productBySlugQuery = `*[_type == "product" && slug.current == $slug][0] ${PRODUCT_PROJECTION}`;
export const categoriesQuery = `*[_type == "category"] | order(order asc) ${CATEGORY_PROJECTION}`;

const REVALIDATE = { next: { revalidate: 60 } } as const;

// Safe fetch: when the CMS isn't configured yet, or a request fails (network,
// bad project), degrade to the fallback instead of crashing the build/page.
async function safeFetch<T>(
  query: string,
  params: Record<string, unknown>,
  fallback: T,
): Promise<T> {
  if (!isConfigured) return fallback;
  try {
    return await client.fetch<T>(query, params, REVALIDATE);
  } catch (err) {
    console.error("[sanity] fetch failed, using fallback:", err);
    return fallback;
  }
}

export function getSiteSettings(): Promise<SiteSettings | null> {
  return safeFetch(siteSettingsQuery, {}, null);
}
export function getFeaturedProducts(): Promise<Product[]> {
  return safeFetch(featuredProductsQuery, {}, DEMO_FEATURED);
}
export function getAllProducts(): Promise<Product[]> {
  return safeFetch(allProductsQuery, {}, DEMO_PRODUCTS);
}
export function getProductsByCategory(slug: string): Promise<Product[]> {
  return safeFetch(productsByCategoryQuery, { slug }, demoByCategory(slug));
}
export function getProduct(slug: string): Promise<Product | null> {
  return safeFetch(productBySlugQuery, { slug }, demoBySlug(slug));
}
export function getCategories(): Promise<Category[]> {
  return safeFetch(categoriesQuery, {}, []);
}

// Used only by /api/checkout to re-verify price and availability at the
// moment of purchase. Deliberately bypasses safeFetch's demo-data fallback —
// if Sanity is unreachable, checkout must fail loudly, not silently sell at a
// fake or stale price. For the same reason it reads through writeClient
// (useCdn: false) rather than the shared CDN-cached `client`: a price or an
// availability flag served from cache could be minutes stale, which is
// exactly what this check exists to prevent.
export async function getProductsForCheckout(
  ids: string[],
): Promise<Pick<Product, "_id" | "title" | "price" | "available">[]> {
  return writeClient.fetch(
    `*[_type == "product" && _id in $ids]{ _id, title, price, available }`,
    { ids },
  );
}
