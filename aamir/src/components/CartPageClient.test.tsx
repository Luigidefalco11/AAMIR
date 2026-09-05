import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CartProvider } from "./CartProvider";
import { CartPageClient } from "./CartPageClient";
import type { CartItem } from "@/lib/cart";

const seeded: CartItem = {
  productId: "1",
  slug: "collana-onda",
  categorySlug: "collane",
  title: { it: "Collana Onda", en: "Onda Necklace" },
  price: 450,
};

const labels = {
  empty: "Il carrello è vuoto.",
  remove: "Rimuovi",
  total: "Totale",
  consent: "Ho letto e accetto i",
  terms: "Termini e Condizioni",
  checkout: "Vai al pagamento",
  checkoutError: "Qualcosa è andato storto. Riprova.",
  itemRemovedWarning: "Alcuni articoli non sono più disponibili e sono stati rimossi dal carrello.",
};

describe("CartPageClient", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows the empty-cart message when there are no items", () => {
    render(
      <CartProvider>
        <CartPageClient locale="it" labels={labels} />
      </CartProvider>,
    );
    expect(screen.getByText(labels.empty)).toBeInTheDocument();
  });

  it("lists items and disables checkout until consent is checked", () => {
    localStorage.setItem("aamir-cart", JSON.stringify([seeded]));
    render(
      <CartProvider>
        <CartPageClient locale="it" labels={labels} />
      </CartProvider>,
    );
    expect(screen.getByText("Collana Onda")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: labels.checkout })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: labels.checkout })).toBeEnabled();
  });

  it("posts the cart to /api/checkout and redirects on success", async () => {
    localStorage.setItem("aamir-cart", JSON.stringify([seeded]));
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: "https://checkout.stripe.com/session/abc" }),
    });
    delete (window as unknown as { location: unknown }).location;
    (window as unknown as { location: { href: string } }).location = { href: "" };

    render(
      <CartProvider>
        <CartPageClient locale="it" labels={labels} />
      </CartProvider>,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: labels.checkout }));

    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.com/session/abc");
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/checkout",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ items: [{ productId: "1" }], locale: "it" }),
      }),
    );
  });

  it("shows the error instead of navigating when the server answers without a url", async () => {
    localStorage.setItem("aamir-cart", JSON.stringify([seeded]));
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: null }),
    });
    delete (window as unknown as { location: unknown }).location;
    (window as unknown as { location: { href: string } }).location = { href: "" };

    render(
      <CartProvider>
        <CartPageClient locale="it" labels={labels} />
      </CartProvider>,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: labels.checkout }));

    expect(await screen.findByText(labels.checkoutError)).toBeInTheDocument();
    // Never send the customer to "/null".
    expect(window.location.href).toBe("");
  });

  it("removes items and shows a warning when the server reports them unavailable", async () => {
    localStorage.setItem("aamir-cart", JSON.stringify([seeded]));
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ removedIds: ["1"], removed: ["Collana Onda"] }),
    });

    render(
      <CartProvider>
        <CartPageClient locale="it" labels={labels} />
      </CartProvider>,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: labels.checkout }));

    expect(await screen.findByText(labels.itemRemovedWarning)).toBeInTheDocument();
    expect(await screen.findByText(labels.empty)).toBeInTheDocument();
  });
});
