import { describe, it, expect, vi, beforeEach } from "vitest";

const constructEventMock = vi.fn();
const listLineItemsMock = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: (...args: unknown[]) => constructEventMock(...args) },
    checkout: { sessions: { listLineItems: (...args: unknown[]) => listLineItemsMock(...args) } },
  },
}));

const fetchMock = vi.fn();
const createMock = vi.fn();
const patchCommitMock = vi.fn();
const patchSetMock = vi.fn(() => ({ commit: patchCommitMock }));
vi.mock("@/sanity/writeClient", () => ({
  writeClient: {
    fetch: (...args: unknown[]) => fetchMock(...args),
    create: (...args: unknown[]) => createMock(...args),
    patch: () => ({ set: patchSetMock }),
  },
}));

vi.mock("@/sanity/queries", () => ({
  getSiteSettings: vi.fn().mockResolvedValue({ email: "info@aamirjewelry.it" }),
}));

const sendConfirmationMock = vi.fn().mockResolvedValue(undefined);
const sendNotificationMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email", () => ({
  sendOrderConfirmationEmail: (...args: unknown[]) => sendConfirmationMock(...args),
  sendOrderNotificationEmail: (...args: unknown[]) => sendNotificationMock(...args),
}));

import { POST } from "./route";

function makeRequest(body: string) {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "test-sig" },
    body,
  });
}

const completedSession = {
  id: "cs_test_123",
  amount_total: 45900,
  payment_intent: "pi_123",
  metadata: { productIds: JSON.stringify(["1"]) },
  customer_details: {
    email: "cliente@example.com",
    name: "Mario Rossi",
    address: { line1: "Via Roma 1", line2: null, city: "Salerno", postal_code: "84100", country: "IT" },
  },
};

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    constructEventMock.mockReset();
    listLineItemsMock.mockReset();
    fetchMock.mockReset();
    createMock.mockReset();
    patchCommitMock.mockReset();
    patchSetMock.mockClear();
    sendConfirmationMock.mockClear();
    sendNotificationMock.mockClear();
  });

  it("returns 400 for an invalid signature", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("bad signature");
    });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
  });

  it("ignores event types other than checkout.session.completed", async () => {
    constructEventMock.mockReturnValue({ type: "payment_intent.created", data: { object: {} } });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("records the order, marks purchased products unavailable, and sends both emails", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    listLineItemsMock.mockResolvedValue({
      data: [{ description: "Collana Onda", amount_total: 45000 }],
    });
    fetchMock.mockResolvedValue(null); // no existing order with this session id

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: "order",
        stripeSessionId: "cs_test_123",
        stripePaymentIntentId: "pi_123",
        total: 459,
        customerEmail: "cliente@example.com",
        status: "paid",
      }),
    );
    expect(patchSetMock).toHaveBeenCalledWith({ available: false });
    expect(sendConfirmationMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "cliente@example.com", orderTotal: 459 }),
    );
    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "info@aamirjewelry.it", customerEmail: "cliente@example.com" }),
    );
  });

  it("is idempotent: skips creating a duplicate order if one already exists for this session, but still re-patches products (safe no-op)", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    listLineItemsMock.mockResolvedValue({ data: [] });
    fetchMock.mockResolvedValue({ _id: "order-existing" });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(createMock).not.toHaveBeenCalled();
    // Marking a product unavailable is naturally idempotent, so it's expected
    // to run again on redelivery even though the order already exists — this
    // is what lets a redelivery recover from a patch that failed previously.
    expect(patchSetMock).toHaveBeenCalledWith({ available: false });
  });

  it("returns 500 (so Stripe retries) when marking a product unavailable fails, even though the order already exists", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    // Simulates a redelivery: the order was already recorded on a prior
    // delivery, but that prior delivery's product patch failed.
    fetchMock.mockResolvedValue({ _id: "order-existing" });
    patchCommitMock.mockRejectedValueOnce(new Error("network blip"));

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(500);
    expect(createMock).not.toHaveBeenCalled(); // never re-creates the order
    expect(patchSetMock).toHaveBeenCalledWith({ available: false }); // patch was attempted
  });

  it("succeeds on a later redelivery once the previously-failing product patch succeeds", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    // Same scenario as above, but this redelivery's patch attempt succeeds.
    fetchMock.mockResolvedValue({ _id: "order-existing" });
    patchCommitMock.mockResolvedValueOnce(undefined);

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    expect(createMock).not.toHaveBeenCalled();
    expect(patchSetMock).toHaveBeenCalledWith({ available: false });
  });
});
