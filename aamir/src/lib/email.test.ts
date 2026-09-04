import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMock = vi.fn().mockResolvedValue({ data: { id: "email_1" }, error: null });
vi.mock("resend", () => ({
  Resend: class {
    get emails() {
      return { send: sendMock };
    }
  },
}));

import { sendOrderConfirmationEmail, sendOrderNotificationEmail } from "./email";

describe("sendOrderConfirmationEmail", () => {
  beforeEach(() => sendMock.mockClear());

  it("sends a confirmation email listing the purchased items and total", async () => {
    await sendOrderConfirmationEmail({
      to: "cliente@example.com",
      orderTotal: 450,
      items: [{ title: "Collana Onda", price: 450 }],
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("cliente@example.com");
    expect(call.html).toContain("Collana Onda");
    expect(call.html).toContain("450");
  });
});

describe("sendOrderNotificationEmail", () => {
  beforeEach(() => sendMock.mockClear());

  it("sends a notification email including the customer's email address", async () => {
    await sendOrderNotificationEmail({
      to: "info@aamirjewelry.it",
      orderTotal: 450,
      items: [{ title: "Collana Onda", price: 450 }],
      customerEmail: "cliente@example.com",
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("info@aamirjewelry.it");
    expect(call.html).toContain("cliente@example.com");
  });
});
