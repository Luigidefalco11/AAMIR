import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartProvider, useCart } from "./CartProvider";
import { ClearCartOnMount } from "./ClearCartOnMount";
import type { CartItem } from "@/lib/cart";

const seeded: CartItem = {
  productId: "1",
  slug: "collana-onda",
  categorySlug: "collane",
  title: { it: "Collana Onda", en: "Onda Necklace" },
  price: 450,
};

function CartCount() {
  const { count } = useCart();
  return <p data-testid="count">{count}</p>;
}

describe("ClearCartOnMount", () => {
  beforeEach(() => localStorage.clear());

  it("empties a seeded cart on mount and renders nothing", () => {
    localStorage.setItem("aamir-cart", JSON.stringify([seeded]));

    const { container } = render(
      <CartProvider>
        <ClearCartOnMount />
        <CartCount />
      </CartProvider>,
    );

    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(localStorage.getItem("aamir-cart")).toBe("[]");
    expect(container.querySelector("[data-testid='count']")).toBeInTheDocument();
  });

  it("is a no-op when the cart is already empty", () => {
    render(
      <CartProvider>
        <ClearCartOnMount />
        <CartCount />
      </CartProvider>,
    );

    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});
