import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { writeClient } from "@/sanity/writeClient";
import { getSiteSettings } from "@/sanity/queries";
import { sendOrderConfirmationEmail, sendOrderNotificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid-signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const productIds: string[] = JSON.parse(session.metadata?.productIds ?? "[]");

  // Stripe may redeliver the same event — never create a second order for
  // the same Checkout Session.
  const existing = await writeClient.fetch<{ _id: string } | null>(
    `*[_type == "order" && stripeSessionId == $id][0]{ _id }`,
    { id: session.id },
  );

  let items: { title: string; price: number }[] = [];
  const total = (session.amount_total ?? 0) / 100;
  const customerEmail = session.customer_details?.email ?? "";
  const shipping = session.customer_details?.address;

  if (!existing) {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    items = lineItems.data.map((li) => ({
      title: li.description ?? "Gioiello AAMIR",
      price: (li.amount_total ?? 0) / 100,
    }));

    try {
      await writeClient.create({
        _type: "order",
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : "",
        items,
        total,
        customerEmail,
        shippingAddress: shipping
          ? {
              name: session.customer_details?.name ?? "",
              line1: shipping.line1 ?? "",
              line2: shipping.line2 ?? "",
              city: shipping.city ?? "",
              postalCode: shipping.postal_code ?? "",
              country: shipping.country ?? "",
            }
          : undefined,
        status: "paid",
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[webhook] failed to record order:", err);
      // Return 500 so Stripe retries — no order was recorded, so a retry is
      // safe and required to not lose the sale record.
      return NextResponse.json({ error: "order-recording-failed" }, { status: 500 });
    }
  }

  // Marking a product unavailable is naturally idempotent — setting
  // available: false on a product that's already false is a safe no-op —
  // so this runs on every delivery of this event, regardless of whether the
  // order already existed. That's what lets a redelivery recover from a
  // patch that failed on a prior delivery even though order-creation above
  // is (correctly) skipped once the order exists: order-creation is NOT
  // idempotent-safe to repeat, but this patch is.
  try {
    await Promise.all(
      productIds.map((id) => writeClient.patch(id).set({ available: false }).commit()),
    );
  } catch (err) {
    console.error("[webhook] failed to mark products unavailable:", err);
    // Return 500 so Stripe retries just this step — the order (if new) is
    // already recorded above, so a retry only re-attempts the patch.
    return NextResponse.json({ error: "product-patch-failed" }, { status: 500 });
  }

  // Email failures must not trigger a Stripe retry — the order (if new) is
  // already safely recorded above, and a retry would just re-run this email
  // step without re-creating the order (thanks to the idempotency check).
  try {
    const settings = await getSiteSettings();
    const notifyEmail = settings?.email ?? "info@aamirjewelry.it";
    if (customerEmail) {
      await sendOrderConfirmationEmail({ to: customerEmail, orderTotal: total, items });
    }
    await sendOrderNotificationEmail({ to: notifyEmail, orderTotal: total, items, customerEmail });
  } catch (err) {
    console.error("[webhook] failed to send emails:", err);
  }

  return NextResponse.json({ received: true });
}
