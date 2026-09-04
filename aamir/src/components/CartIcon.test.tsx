import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartProvider } from "./CartProvider";
import { CartIcon } from "./CartIcon";
import type { CartItem } from "@/lib/cart";

const seeded: CartItem = {
  productId: "1",
  slug: "collana-onda",
  categorySlug: "collane",
  title: { it: "Collana Onda", en: "Onda Necklace" },
  price: 450,
};

describe("CartIcon", () => {
  beforeEach(() => localStorage.clear());

  it("shows no count badge when the cart is empty", () => {
    render(
      <CartProvider>
        <CartIcon locale="it" label="Carrello" />
      </CartProvider>,
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows the item count when the cart has items", async () => {
    localStorage.setItem("aamir-cart", JSON.stringify([seeded]));
    render(
      <CartProvider>
        <CartIcon locale="it" label="Carrello" />
      </CartProvider>,
    );
    expect(await screen.findByText("1")).toBeInTheDocument();
  });

  it("links to the cart page for the given locale", () => {
    render(
      <CartProvider>
        <CartIcon locale="en" label="Cart" />
      </CartProvider>,
    );
    expect(screen.getByRole("link", { name: /Cart/ })).toHaveAttribute("href", "/en/carrello");
  });
});
