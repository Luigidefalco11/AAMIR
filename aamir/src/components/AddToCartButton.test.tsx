import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CartProvider } from "./CartProvider";
import { AddToCartButton } from "./AddToCartButton";
import type { CartItem } from "@/lib/cart";

const product: CartItem = {
  productId: "1",
  slug: "collana-onda",
  categorySlug: "collane",
  title: { it: "Collana Onda", en: "Onda Necklace" },
  price: 450,
};

describe("AddToCartButton", () => {
  it("adds the product to the cart when clicked and then shows the in-cart state", () => {
    render(
      <CartProvider>
        <AddToCartButton product={product} addLabel="Aggiungi al carrello" inCartLabel="Nel carrello" />
      </CartProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi al carrello" }));
    expect(screen.getByRole("button", { name: "Nel carrello" })).toBeDisabled();
  });
});
