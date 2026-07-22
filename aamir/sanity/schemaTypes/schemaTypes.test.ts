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
      ]),
    );
  });

  it("product has no price field (price-on-request policy)", () => {
    const product = schemaTypes.find((t) => t.name === "product");
    const fieldNames = (product?.fields ?? []).map((f: { name: string }) => f.name);
    expect(fieldNames).not.toContain("price");
  });
});
