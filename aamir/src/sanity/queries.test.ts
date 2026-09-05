import { describe, it, expect } from "vitest";
import {
  PRODUCT_PROJECTION,
  allProductsQuery,
  featuredProductsQuery,
  productBySlugQuery,
  productsByCategoryQuery,
} from "./queries";

describe("GROQ queries", () => {
  it("projects category slug and price", () => {
    expect(PRODUCT_PROJECTION).toContain('"categorySlug": category->slug.current');
    expect(PRODUCT_PROJECTION).toMatch(/\bprice\b/);
  });
  it("product-by-slug query filters on slug param", () => {
    expect(productBySlugQuery).toContain("slug.current == $slug");
  });
  it("products-by-category query filters on category slug param", () => {
    expect(productsByCategoryQuery).toContain("category->slug.current == $slug");
  });

  // Every piece is one-of-a-kind: a sold one must vanish from the listings.
  it.each([
    ["all products", allProductsQuery],
    ["featured products", featuredProductsQuery],
    ["products by category", productsByCategoryQuery],
  ])("%s listing query excludes sold pieces", (_name, query) => {
    expect(query).toContain("available == true");
  });

  it("product-by-slug query does NOT filter on availability, so a sold piece's page still resolves", () => {
    expect(productBySlugQuery).not.toContain("available == true");
  });
});
