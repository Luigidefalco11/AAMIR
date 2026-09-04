import { describe, it, expect } from "vitest";
import { schemaTypes } from "./index";

describe("sanity schema", () => {
  it("registers all required types", () => {
    const names = schemaTypes.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "localeString",
        "localeText",
        "category",
        "product",
        "siteSettings",
        "order",
      ]),
    );
  });

  it("product has an optional price field in EUR", () => {
    const product = schemaTypes.find((t) => t.name === "product");
    const priceField = (product?.fields ?? []).find(
      (f: { name: string }) => f.name === "price",
    );
    expect(priceField).toBeDefined();
    expect(priceField?.type).toBe("number");
  });
});
