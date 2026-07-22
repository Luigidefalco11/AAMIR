import { describe, it, expect } from "vitest";
import {
  PRODUCT_PROJECTION,
  productBySlugQuery,
  productsByCategoryQuery,
} from "./queries";

describe("GROQ queries", () => {
  it("projects category slug and never selects a price", () => {
    expect(PRODUCT_PROJECTION).toContain('"categorySlug": category->slug.current');
    expect(PRODUCT_PROJECTION).not.toMatch(/price/i);
  });
  it("product-by-slug query filters on slug param", () => {
    expect(productBySlugQuery).toContain("slug.current == $slug");
  });
  it("products-by-category query filters on category slug param", () => {
    expect(productsByCategoryQuery).toContain("category->slug.current == $slug");
  });
});
