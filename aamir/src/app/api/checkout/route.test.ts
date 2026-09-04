import { describe, it, expect, vi, beforeEach } from "vitest";

const getProductsForCheckoutMock = vi.fn();
vi.mock("@/sanity/queries", () => ({
  getProductsForCheckout: (...args: unknown[]) => getProductsForCheckoutMock(...args),
}));

const createSessionMock = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: (...args: unknown[]) => createSessionMock(...args) } } },
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout", () => {
  beforeEach(() => {
    getProductsForCheckoutMock.mockReset();
    createSessionMock.mockReset();
  });

  it("returns 400 for an empty cart", async () => {
    const res = await POST(makeRequest({ items: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 (not a crash) when items contains a malformed entry", async () => {
    const res = await POST(makeRequest({ items: [null] }));
    expect(res.status).toBe(400);
    expect(getProductsForCheckoutMock).not.toHaveBeenCalled();
  });

  it("returns 503 when Sanity is unreachable", async () => {
    getProductsForCheckoutMock.mockRejectedValue(new Error("network"));
    const res = await POST(makeRequest({ items: [{ productId: "1" }] }));
    expect(res.status).toBe(503);
  });

  it("returns 409 and lists removed items when a product is no longer available", async () => {
    getProductsForCheckoutMock.mockResolvedValue([
      { _id: "1", title: { it: "Collana Onda" }, price: 450, available: false },
    ]);
    const res = await POST(makeRequest({ items: [{ productId: "1" }] }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.removedIds).toEqual(["1"]);
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("creates a Stripe session with EUR-cents line items for available, priced products", async () => {
    getProductsForCheckoutMock.mockResolvedValue([
      { _id: "1", title: { it: "Collana Onda" }, price: 450, available: true },
    ]);
    createSessionMock.mockResolvedValue({ url: "https://checkout.stripe.com/session/abc" });

    const res = await POST(makeRequest({ items: [{ productId: "1" }], locale: "it" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe("https://checkout.stripe.com/session/abc");

    const sessionArgs = createSessionMock.mock.calls[0][0];
    expect(sessionArgs.mode).toBe("payment");
    expect(sessionArgs.line_items[0].price_data.unit_amount).toBe(45000);
    expect(sessionArgs.line_items[0].price_data.currency).toBe("eur");
    expect(sessionArgs.metadata.productIds).toBe(JSON.stringify(["1"]));
    expect(sessionArgs.success_url).toContain("/it/checkout/successo");
    expect(sessionArgs.cancel_url).toContain("/it/checkout/annullato");
  });
});
