import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMock = vi.fn().mockResolvedValue({ data: { id: "email_1" }, error: null });
vi.mock("resend", () => ({
  Resend: class {
    get emails() {
      return { send: sendMock };
    }
  },
}));

import { sendOrderConfirmationEmail, sendOrderNotificationEmail, escapeHtml } from "./email";

describe("escapeHtml", () => {
  it("escapes every HTML-significant character", () => {
    expect(escapeHtml(`<script>"x" & 'y'</script>`)).toBe(
      "&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;",
    );
  });
});

describe("sendOrderConfirmationEmail", () => {
  beforeEach(() => sendMock.mockClear());

  it("sends a confirmation email listing the purchased items, shipping and total", async () => {
    await sendOrderConfirmationEmail({
      to: "cliente@example.com",
      orderTotal: 459,
      shippingTotal: 9,
      items: [{ title: "Collana Onda", price: 450 }],
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("cliente@example.com");
    expect(call.html).toContain("Collana Onda");
    expect(call.html).toContain("450");
    // Without an explicit shipping line, the listed prices visibly don't add
    // up to the total.
    expect(call.html).toContain("Spedizione: €9");
    expect(call.html).toContain("Totale: €459");
  });

  it("escapes item titles instead of injecting them as markup", async () => {
    await sendOrderConfirmationEmail({
      to: "cliente@example.com",
      orderTotal: 459,
      shippingTotal: 9,
      items: [{ title: "<script>alert(1)</script> Oro & Argento", price: 450 }],
    });
    const call = sendMock.mock.calls[0][0];
    expect(call.html).not.toContain("<script>");
    expect(call.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(call.html).toContain("Oro &amp; Argento");
  });
});

describe("sendOrderNotificationEmail", () => {
  beforeEach(() => sendMock.mockClear());

  it("sends a notification email including the customer's email address, shipping and total", async () => {
    await sendOrderNotificationEmail({
      to: "info@aamirjewelry.it",
      orderTotal: 459,
      shippingTotal: 9,
      items: [{ title: "Collana Onda", price: 450 }],
      customerEmail: "cliente@example.com",
    });
    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("info@aamirjewelry.it");
    expect(call.html).toContain("cliente@example.com");
    expect(call.html).toContain("Spedizione: €9");
    expect(call.html).toContain("Totale: €459");
  });

  it("escapes the customer email and item titles", async () => {
    await sendOrderNotificationEmail({
      to: "info@aamirjewelry.it",
      orderTotal: 459,
      shippingTotal: 9,
      items: [{ title: "<b>Collana</b>", price: 450 }],
      customerEmail: `"><img src=x>@example.com`,
    });
    const call = sendMock.mock.calls[0][0];
    expect(call.html).not.toContain("<img");
    expect(call.html).not.toContain("<b>Collana</b>");
    expect(call.html).toContain("&lt;b&gt;Collana&lt;/b&gt;");
  });
});
