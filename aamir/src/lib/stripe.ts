import Stripe from "stripe";

// apiVersion is pinned explicitly (to the version the installed SDK targets)
// so upgrading the `stripe` package can never silently change request/response
// shapes on a live payment flow — the bump becomes a deliberate, reviewable
// edit here instead.
const STRIPE_API_VERSION = "2026-08-26.dahlia";

// Lazily constructed so importing this module never throws at build time
// when STRIPE_SECRET_KEY is unset (e.g. a fresh Render deploy before the
// dashboard env var is filled in, CI, or a fresh clone following
// .env.example). The real `Stripe` client throws immediately from its
// constructor when given an empty key, which used to crash `next build`
// with an opaque stack trace during "Collecting page data." Using it
// without a real key now throws a clear, specific error instead.
let _stripe: Stripe | undefined;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Configure it in .env.local (dev) or in Render's environment settings (production) before using Stripe.",
      );
    }
    _stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  }
  return _stripe;
}

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});
