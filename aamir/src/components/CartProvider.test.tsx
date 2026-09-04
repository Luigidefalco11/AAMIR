import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CartProvider, useCart } from "./CartProvider";
import type { CartItem } from "@/lib/cart";

const item: CartItem = {
  productId: "1",
  slug: "collana-onda",
  categorySlug: "collane",
  title: { it: "Collana Onda", en: "Onda Necklace" },
  price: 450,
};

function TestConsumer() {
  const cart = useCart();
  return (
    <div>
      <p data-testid="count">{cart.count}</p>
      <p data-testid="total">{cart.total}</p>
      <p data-testid="in-cart">{String(cart.isInCart("1"))}</p>
      <button onClick={() => cart.addItem(item)}>add</button>
      <button onClick={() => cart.removeItem("1")}>remove</button>
    </div>
  );
}

describe("CartProvider", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty", () => {
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("adds an item and updates count/total/isInCart", () => {
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("total")).toHaveTextContent("450");
    expect(screen.getByTestId("in-cart")).toHaveTextContent("true");
  });

  it("removes an item", () => {
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("add"));
    fireEvent.click(screen.getByText("remove"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("persists the cart to localStorage and rehydrates on next mount", async () => {
    const { unmount } = render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("add"));
    unmount();

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );
    expect(await screen.findByTestId("count")).toHaveTextContent("1");
  });

  it("keeps a mutation in memory for this session even when its localStorage write fails", () => {
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );

    // First mutation persists successfully.
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");

    // Simulate a persistence failure (e.g. quota exceeded) for the next write.
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    fireEvent.click(screen.getByText("remove"));

    // The removal must still be reflected in memory for this session, not
    // silently reverted back to the last value that *did* persist.
    expect(screen.getByTestId("count")).toHaveTextContent("0");

    setItemSpy.mockRestore();
  });
});
