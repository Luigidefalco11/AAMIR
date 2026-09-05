import Stripe from "stripe";

// Empty-string fallback so importing this module never throws at build time
// when the env var is unset (e.g. in tests); real API calls will fail loudly
// instead, which is the correct behavior for a missing secret.
// apiVersion is pinned explicitly (to the version the installed SDK targets)
// so upgrading the `stripe` package can never silently change request/response
// shapes on a live payment flow — the bump becomes a deliberate, reviewable
// edit here instead.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-08-26.dahlia",
});
