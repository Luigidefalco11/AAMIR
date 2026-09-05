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

  it("order records the shipping cost separately from the total", () => {
    const order = schemaTypes.find((t) => t.name === "order");
    const field = (order?.fields ?? []).find(
      (f: { name: string }) => f.name === "shippingTotal",
    );
    expect(field).toBeDefined();
    expect(field?.type).toBe("number");
    expect(field?.title).toBe("Spedizione (EUR)");
  });

  it("order records when the terms were accepted", () => {
    const order = schemaTypes.find((t) => t.name === "order");
    const field = (order?.fields ?? []).find(
      (f: { name: string }) => f.name === "acceptedTermsAt",
    );
    expect(field).toBeDefined();
    expect(field?.type).toBe("datetime");
  });
});
