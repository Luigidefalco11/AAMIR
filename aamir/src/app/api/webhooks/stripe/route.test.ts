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
const fetchMock = vi.fn();
// Product patches and the order's emailsSentAt patch go through the same
// client method, so the mock routes them to separate commit mocks (keyed on the
// document id) — otherwise a test that makes one patch fail would hit whichever
// happened to run first.
const patchCommitMock = vi.fn();
const patchSetMock = vi.fn();
const orderPatchSetMock = vi.fn();
const orderPatchCommitMock = vi.fn();
vi.mock("@/sanity/writeClient", () => ({
  writeClient: {
    createIfNotExists: (...args: unknown[]) => createIfNotExistsMock(...args),
    fetch: (...args: unknown[]) => fetchMock(...args),
    patch: (id: string) =>
      id.startsWith("order-")
        ? {
            set: (attrs: unknown) => {
              orderPatchSetMock(attrs);
              return { commit: () => orderPatchCommitMock() };
            },
          }
        : {
            set: (attrs: unknown) => {
              patchSetMock(attrs);
              return { commit: () => patchCommitMock() };
            },
          },
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
    fetchMock.mockReset();
    patchCommitMock.mockReset();
    patchSetMock.mockClear();
    orderPatchSetMock.mockClear();
    orderPatchCommitMock.mockReset();
    sendConfirmationMock.mockClear();
    sendNotificationMock.mockClear();
    // Default: a redelivery finds the emails already sent.
    fetchMock.mockResolvedValue("2024-01-01T00:00:00.000Z");
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

  it("never writes customer PII to the public Sanity dataset", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockResolvedValue(CREATED);

    await POST(makeRequest("{}"));

    // The dataset is world-readable, so email and address must not reach it —
    // they stay in Stripe and in the notification email to Aamir.
    const doc = createIfNotExistsMock.mock.calls[0][0];
    expect(doc).not.toHaveProperty("customerEmail");
    expect(doc).not.toHaveProperty("shippingAddress");
    expect(JSON.stringify(doc)).not.toContain("cliente@example.com");
    expect(JSON.stringify(doc)).not.toContain("Via Roma 1");
    expect(JSON.stringify(doc)).not.toContain("Mario Rossi");
    // ...while the inbox notification still gets the email it needs.
    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ customerEmail: "cliente@example.com" }),
    );
  });

  it("asks Stripe for up to 100 line items, so an 11+ piece order isn't truncated", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockResolvedValue(CREATED);

    await POST(makeRequest("{}"));

    expect(listLineItemsMock).toHaveBeenCalledWith("cs_test_123", { limit: 100 });
  });

  it("records every line item of a large order", async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      description: `Pezzo ${i}`,
      amount_total: 10000,
    }));
    listLineItemsMock.mockResolvedValue({ data: many });
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockResolvedValue(CREATED);

    await POST(makeRequest("{}"));

    expect(createIfNotExistsMock.mock.calls[0][0].items).toHaveLength(25);
  });

  it("asks Sanity to generate array _keys, so Studio doesn't show a 'Missing keys' banner", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockResolvedValue(CREATED);

    await POST(makeRequest("{}"));

    expect(createIfNotExistsMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ autoGenerateArrayKeys: true }),
    );
  });

  it("stamps emailsSentAt on the order once both emails have gone out", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockResolvedValue(CREATED);

    await POST(makeRequest("{}"));

    expect(orderPatchSetMock).toHaveBeenCalledTimes(1);
    const attrs = orderPatchSetMock.mock.calls[0][0] as { emailsSentAt: string };
    expect(typeof attrs.emailsSentAt).toBe("string");
    expect(Number.isNaN(Date.parse(attrs.emailsSentAt))).toBe(false);
  });

  it("leaves emailsSentAt unset when sending fails, so a later redelivery retries", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockResolvedValue(CREATED);
    sendConfirmationMock.mockRejectedValueOnce(new Error("resend down"));

    const res = await POST(makeRequest("{}"));

    // The order is recorded, so an email failure must not force a full retry...
    expect(res.status).toBe(200);
    // ...but the flag stays unset, which is what arms the retry.
    expect(orderPatchSetMock).not.toHaveBeenCalled();
  });

  it("re-sends the emails on a redelivery whose order has no emailsSentAt (prior delivery died mid-way)", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockResolvedValue(ALREADY_EXISTED);
    fetchMock.mockResolvedValue(null);

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("emailsSentAt"), {
      id: "order-cs_test_123",
    });
    // Rebuilt from this delivery's own Stripe reads, which are deterministic
    // per session, so the customer gets the same email they should have had.
    expect(sendConfirmationMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "cliente@example.com", orderTotal: 459 }),
    );
    expect(sendNotificationMock).toHaveBeenCalledTimes(1);
    expect(orderPatchSetMock).toHaveBeenCalledTimes(1);
  });

  it("does not re-send on a redelivery whose order already has emailsSentAt", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockResolvedValue(ALREADY_EXISTED);
    fetchMock.mockResolvedValue("2024-05-01T10:00:00.000Z");

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    expect(sendConfirmationMock).not.toHaveBeenCalled();
    expect(sendNotificationMock).not.toHaveBeenCalled();
    expect(orderPatchSetMock).not.toHaveBeenCalled();
  });

  it("does not re-send when the emailsSentAt read fails (unknown state beats a duplicate)", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockResolvedValue(ALREADY_EXISTED);
    fetchMock.mockRejectedValue(new Error("sanity read down"));

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    expect(sendConfirmationMock).not.toHaveBeenCalled();
  });

  it("does not read emailsSentAt on a first delivery — creation alone proves the emails are owed", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    createIfNotExistsMock.mockResolvedValue(CREATED);

    await POST(makeRequest("{}"));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendConfirmationMock).toHaveBeenCalledTimes(1);
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
    // The recorded order already carries emailsSentAt, so the customer never
    // receives a second confirmation.
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
