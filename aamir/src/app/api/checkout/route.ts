import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getProductsForCheckout } from "@/sanity/queries";
import { localize, type Locale } from "@/sanity/localize";

const SHIPPING_CENTS = 900; // flat rate, Italy only

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const requestedIds: string[] = Array.isArray(body?.items)
    ? body.items
        .map((i: unknown) =>
          i && typeof i === "object" && "productId" in i
            ? (i as { productId: string }).productId
            : undefined,
        )
        .filter(Boolean)
    : [];
  const locale: Locale = body?.locale === "en" ? "en" : "it";

  if (requestedIds.length === 0) {
    return NextResponse.json({ error: "empty-cart" }, { status: 400 });
  }

  let products;
  try {
    products = await getProductsForCheckout(requestedIds);
  } catch {
    return NextResponse.json({ error: "sanity-unreachable" }, { status: 503 });
  }

  const available = products.filter((p) => p.available && typeof p.price === "number");
  const availableIds = new Set(available.map((p) => p._id));
  const removedIds = requestedIds.filter((id) => !availableIds.has(id));

  if (removedIds.length > 0) {
    const removed = removedIds.map((id) => {
      const match = products.find((p) => p._id === id);
      return match ? localize(match.title, locale) || id : id;
    });
    return NextResponse.json({ removedIds, removed }, { status: 409 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: available.map((p) => ({
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: Math.round((p.price as number) * 100),
        product_data: { name: localize(p.title, locale) || "Gioiello AAMIR" },
      },
    })),
    shipping_address_collection: { allowed_countries: ["IT"] },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: SHIPPING_CENTS, currency: "eur" },
          display_name: "Spedizione standard",
        },
      },
    ],
    metadata: { productIds: JSON.stringify(available.map((p) => p._id)) },
    success_url: `${siteUrl}/${locale}/checkout/successo?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/${locale}/checkout/annullato`,
  });

  return NextResponse.json({ url: session.url });
}
