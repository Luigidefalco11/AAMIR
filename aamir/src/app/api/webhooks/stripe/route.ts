import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { writeClient } from "@/sanity/writeClient";
import { getSiteSettings } from "@/sanity/queries";
import { sendOrderConfirmationEmail, sendOrderNotificationEmail } from "@/lib/email";

// Metadata comes back from Stripe as an opaque string and is not necessarily
// written by our own /api/checkout (any session on this account lands here),
// so a malformed value must degrade to "no products to mark sold" rather than
// throw an uncaught exception out of the handler.
function parseProductIds(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    console.error("[webhook] malformed productIds metadata:", raw);
    return [];
  }
}

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

  // checkout.session.completed also fires for delayed-notification payment
  // methods (bank debits, vouchers) where the money hasn't arrived yet. Only
  // a session whose payment_status is "paid" is an actual sale — anything
  // else must not create an order, mark pieces sold, or email the customer.
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true, skipped: "unpaid" });
  }

  const productIds = parseProductIds(session.metadata?.productIds);

  const total = (session.amount_total ?? 0) / 100;
  const shippingTotal = (session.shipping_cost?.amount_total ?? 0) / 100;
  const customerEmail = session.customer_details?.email ?? "";
  const shipping = session.customer_details?.address;

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  const items = lineItems.data.map((li) => ({
    title: li.description ?? "Gioiello AAMIR",
    price: (li.amount_total ?? 0) / 100,
  }));

  const createdAt = new Date().toISOString();

  // Stripe may redeliver the same event, and two deliveries can even be in
  // flight at once. A fetch-then-create pair would race (both read "no order",
  // both create one); createIfNotExists is a single atomic mutation keyed on
  // the deterministic order id, so exactly one delivery can ever create the
  // document. Asking for the mutation result (instead of the document) tells
  // us which delivery that was: operation is "create" for the one that won
  // and "none" for every redelivery.
  let isFirstDelivery: boolean;
  try {
    const result = await writeClient.createIfNotExists(
      {
        _id: `order-${session.id}`,
        _type: "order",
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : "",
        items,
        total,
        shippingTotal,
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
        createdAt,
        // The cart gates checkout on the Terms checkbox, so a session that
        // reached payment necessarily had them accepted — record when, as a
        // basic distance-selling compliance trail.
        acceptedTermsAt: createdAt,
      },
      { returnFirst: true, returnDocuments: false },
    );
    isFirstDelivery = (result.results ?? []).some((r) => r.operation === "create");
  } catch (err) {
    console.error("[webhook] failed to record order:", err);
    // Return 500 so Stripe retries — no order was recorded, so a retry is
    // safe and required to not lose the sale record.
    return NextResponse.json({ error: "order-recording-failed" }, { status: 500 });
  }

  // Emails are tied to order creation, not to the retryable steps below: they
  // run only for the delivery that actually created the document, so they are
  // sent exactly once, and they run *before* the product patch so a patch that
  // keeps failing can never cost the customer their confirmation email.
  // Email failures themselves must not trigger a retry — the order is already
  // recorded, and a retry would skip creation (and so skip these) anyway.
  if (isFirstDelivery) {
    try {
      const settings = await getSiteSettings();
      const notifyEmail = settings?.email ?? "info@aamirjewelry.it";
      if (customerEmail) {
        await sendOrderConfirmationEmail({
          to: customerEmail,
          orderTotal: total,
          shippingTotal,
          items,
        });
      }
      await sendOrderNotificationEmail({
        to: notifyEmail,
        orderTotal: total,
        shippingTotal,
        items,
        customerEmail,
      });
    } catch (err) {
      console.error("[webhook] failed to send emails:", err);
    }
  }

  // Marking a product unavailable is naturally idempotent — setting
  // available: false on a product that's already false is a safe no-op —
  // so this runs on every delivery of this event, regardless of whether the
  // order already existed. That's what lets a redelivery recover from a
  // patch that failed on a prior delivery even though order-creation above
  // is (correctly) a no-op once the order exists.
  try {
    await Promise.all(
      productIds.map((id) => writeClient.patch(id).set({ available: false }).commit()),
    );
  } catch (err) {
    console.error("[webhook] failed to mark products unavailable:", err);
    // Return 500 so Stripe retries just this step — the order is already
    // recorded and the emails already sent above, so a retry only re-attempts
    // the patch.
    return NextResponse.json({ error: "product-patch-failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
