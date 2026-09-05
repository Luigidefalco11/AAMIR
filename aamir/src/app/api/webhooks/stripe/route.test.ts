import { describe, it, expect, vi, beforeEach } from "vitest";

const constructEventMock = vi.fn();
const listLineItemsMock = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: (...args: unknown[]) => constructEventMock(...args) },
    checkout: { sessions: { listLineItems: (...args: unknown[]) => listLineItemsMock(...args) } },
  },
}));

const createIfNotExistsMock = vi.fn();
const patchCommitMock = vi.fn();
const patchSetMock = vi.fn(() => ({ commit: patchCommitMock }));
vi.mock("@/sanity/writeClient", () => ({
  writeClient: {
    createIfNotExists: (...args: unknown[]) => createIfNotExistsMock(...args),
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

// Shapes of the mutation result Sanity returns for createIfNotExists: the
// delivery that actually created the document gets operation "create", every
// redelivery gets "none".
const CREATED = { transactionId: "tx_1", documentId: "order-cs_test_123", results: [{ id: "order-cs_test_123", operation: "create" }] };
const ALREADY_EXISTED = { transactionId: "tx_2", documentId: "order-cs_test_123", results: [{ id: "order-cs_test_123", operation: "none" }] };

const completedSession = {
  id: "cs_test_123",
  payment_status: "paid",
  amount_total: 45900,
  shipping_cost: { amount_total: 900 },
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
    createIfNotExistsMock.mockReset();
    patchCommitMock.mockReset();
    patchSetMock.mockClear();
    sendConfirmationMock.mockClear();
    sendNotificationMock.mockClear();
    listLineItemsMock.mockResolvedValue({
      data: [{ description: "Collana Onda", amount_total: 45000 }],
    });
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
    expect(createIfNotExistsMock).not.toHaveBeenCalled();
  });

  it("records the order, marks purchased products unavailable, and sends both emails", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockResolvedValue(CREATED);

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);

    expect(createIfNotExistsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "order-cs_test_123",
        _type: "order",
        stripeSessionId: "cs_test_123",
        stripePaymentIntentId: "pi_123",
        total: 459,
        shippingTotal: 9,
        customerEmail: "cliente@example.com",
        status: "paid",
      }),
      expect.objectContaining({ returnDocuments: false }),
    );
    expect(patchSetMock).toHaveBeenCalledWith({ available: false });
    expect(sendConfirmationMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "cliente@example.com", orderTotal: 459, shippingTotal: 9 }),
    );
    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "info@aamirjewelry.it",
        customerEmail: "cliente@example.com",
        shippingTotal: 9,
      }),
    );
  });

  it("records when the terms were accepted, alongside the order date", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockResolvedValue(CREATED);

    await POST(makeRequest("{}"));

    const doc = createIfNotExistsMock.mock.calls[0][0];
    expect(doc.acceptedTermsAt).toBe(doc.createdAt);
    expect(typeof doc.acceptedTermsAt).toBe("string");
  });

  it("does nothing for a completed session whose payment_status is not paid", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { ...completedSession, payment_status: "unpaid" } },
    });

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ received: true, skipped: "unpaid" });
    // Delayed-notification payment methods complete the session before the
    // money arrives: nothing may be recorded, sold or emailed yet.
    expect(createIfNotExistsMock).not.toHaveBeenCalled();
    expect(patchSetMock).not.toHaveBeenCalled();
    expect(sendConfirmationMock).not.toHaveBeenCalled();
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });

  it("is idempotent: a redelivery neither re-creates the order nor re-sends emails, but does re-patch products (safe no-op)", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockResolvedValue(ALREADY_EXISTED);

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    // The write itself is always the same atomic call; it just no-ops.
    expect(createIfNotExistsMock).toHaveBeenCalledTimes(1);
    // Emails are gated on that call having genuinely created the document, so
    // the customer never receives a second confirmation.
    expect(sendConfirmationMock).not.toHaveBeenCalled();
    expect(sendNotificationMock).not.toHaveBeenCalled();
    // Marking a product unavailable is naturally idempotent, so it's expected
    // to run again on redelivery — this is what lets a redelivery recover from
    // a patch that failed previously.
    expect(patchSetMock).toHaveBeenCalledWith({ available: false });
  });

  it("sends both emails before the product patch, so a permanently failing patch can't cost the customer their confirmation", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockResolvedValue(CREATED);
    patchCommitMock.mockRejectedValueOnce(new Error("network blip"));

    const res = await POST(makeRequest("{}"));

    // Stripe is asked to retry the patch...
    expect(res.status).toBe(500);
    // ...but the emails already went out, before the failure surfaced.
    expect(sendConfirmationMock).toHaveBeenCalledTimes(1);
    expect(sendNotificationMock).toHaveBeenCalledTimes(1);
  });

  it("returns 500 (so Stripe retries) when marking a product unavailable fails on a redelivery", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    // Simulates a redelivery: the order was already recorded on a prior
    // delivery, but that prior delivery's product patch failed.
    createIfNotExistsMock.mockResolvedValue(ALREADY_EXISTED);
    patchCommitMock.mockRejectedValueOnce(new Error("network blip"));

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(500);
    expect(patchSetMock).toHaveBeenCalledWith({ available: false }); // patch was attempted
    expect(sendConfirmationMock).not.toHaveBeenCalled();
  });

  it("succeeds on a later redelivery once the previously-failing product patch succeeds", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockResolvedValue(ALREADY_EXISTED);
    patchCommitMock.mockResolvedValueOnce(undefined);

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    expect(patchSetMock).toHaveBeenCalledWith({ available: false });
  });

  it("returns 500 (so Stripe retries) when the order write fails, and sends no emails", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockRejectedValue(new Error("sanity down"));

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(500);
    expect(sendConfirmationMock).not.toHaveBeenCalled();
    expect(patchSetMock).not.toHaveBeenCalled();
  });

  it("survives malformed productIds metadata instead of throwing", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { ...completedSession, metadata: { productIds: "not-json{" } } },
    });
    createIfNotExistsMock.mockResolvedValue(CREATED);

    const res = await POST(makeRequest("{}"));

    // The sale is still recorded and confirmed; there's just nothing to mark
    // sold, since the session didn't carry a usable product list.
    expect(res.status).toBe(200);
    expect(createIfNotExistsMock).toHaveBeenCalledTimes(1);
    expect(patchSetMock).not.toHaveBeenCalled();
  });

  it("ignores a productIds metadata value that parses to a non-array", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { ...completedSession, metadata: { productIds: '{"id":"1"}' } } },
    });
    createIfNotExistsMock.mockResolvedValue(CREATED);

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    expect(patchSetMock).not.toHaveBeenCalled();
  });

  it("defaults shippingTotal to 0 when the session carries no shipping cost", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { ...completedSession, shipping_cost: null } },
    });
    createIfNotExistsMock.mockResolvedValue(CREATED);

    await POST(makeRequest("{}"));

    expect(createIfNotExistsMock).toHaveBeenCalledWith(
      expect.objectContaining({ shippingTotal: 0 }),
      expect.anything(),
    );
  });
});
