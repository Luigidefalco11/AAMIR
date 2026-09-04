import { describe, it, expect } from "vitest";
import { addItem, removeItem, cartTotal, type CartItem } from "./cart";

const item = (id: string, price: number): CartItem => ({
  productId: id,
  slug: `slug-${id}`,
  categorySlug: "collane",
  title: { it: `Prodotto ${id}`, en: `Product ${id}` },
  price,
});

describe("addItem", () => {
  it("adds a new item to an empty cart", () => {
    expect(addItem([], item("1", 100))).toEqual([item("1", 100)]);
  });
  it("does not duplicate an item already in the cart", () => {
    const cart = [item("1", 100)];
    expect(addItem(cart, item("1", 100))).toEqual(cart);
  });
});

describe("removeItem", () => {
  it("removes the matching item", () => {
    const cart = [item("1", 100), item("2", 200)];
    expect(removeItem(cart, "1")).toEqual([item("2", 200)]);
  });
  it("is a no-op when the item is not in the cart", () => {
    const cart = [item("1", 100)];
    expect(removeItem(cart, "2")).toEqual(cart);
  });
});

describe("cartTotal", () => {
  it("sums the price of every item", () => {
    expect(cartTotal([item("1", 100), item("2", 250)])).toBe(350);
  });
  it("is zero for an empty cart", () => {
    expect(cartTotal([])).toBe(0);
  });
});
