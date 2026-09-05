import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

type OrderItem = { title: string; price: number };

// Product titles and customer emails are attacker-influenced (a CMS title, a
// Stripe line-item description) and land straight in an HTML email body, so
// escape them rather than trusting them to be markup-free.
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function itemsListHtml(items: OrderItem[]): string {
  return items.map((i) => `<li>${escapeHtml(i.title)} — €${i.price}</li>`).join("");
}

// The order total includes shipping, so the itemised list must show it too —
// otherwise the listed prices visibly don't add up to the total.
function totalsHtml(shippingTotal: number, orderTotal: number): string {
  return `<p>Spedizione: €${shippingTotal}</p><p>Totale: €${orderTotal}</p>`;
}

export async function sendOrderConfirmationEmail({
  to,
  orderTotal,
  shippingTotal,
  items,
}: {
  to: string;
  orderTotal: number;
  shippingTotal: number;
  items: OrderItem[];
}): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Il tuo ordine AAMIR",
    html: `<p>Grazie per il tuo acquisto!</p><ul>${itemsListHtml(items)}</ul>${totalsHtml(shippingTotal, orderTotal)}`,
  });
}

export async function sendOrderNotificationEmail({
  to,
  orderTotal,
  shippingTotal,
  items,
  customerEmail,
}: {
  to: string;
  orderTotal: number;
  shippingTotal: number;
  items: OrderItem[];
  customerEmail: string;
}): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Nuovo ordine AAMIR",
    html: `<p>Nuovo ordine da ${escapeHtml(customerEmail)}</p><ul>${itemsListHtml(items)}</ul>${totalsHtml(shippingTotal, orderTotal)}`,
  });
}
