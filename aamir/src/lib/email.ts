import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY ?? "");
const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

type OrderItem = { title: string; price: number };

function itemsListHtml(items: OrderItem[]): string {
  return items.map((i) => `<li>${i.title} — €${i.price}</li>`).join("");
}

export async function sendOrderConfirmationEmail({
  to,
  orderTotal,
  items,
}: {
  to: string;
  orderTotal: number;
  items: OrderItem[];
}): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Il tuo ordine AAMIR",
    html: `<p>Grazie per il tuo acquisto!</p><ul>${itemsListHtml(items)}</ul><p>Totale: €${orderTotal}</p>`,
  });
}

export async function sendOrderNotificationEmail({
  to,
  orderTotal,
  items,
  customerEmail,
}: {
  to: string;
  orderTotal: number;
  items: OrderItem[];
  customerEmail: string;
}): Promise<void> {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Nuovo ordine AAMIR",
    html: `<p>Nuovo ordine da ${customerEmail}</p><ul>${itemsListHtml(items)}</ul><p>Totale: €${orderTotal}</p>`,
  });
}
