import Stripe from "stripe";

// Empty-string fallback so importing this module never throws at build time
// when the env var is unset (e.g. in tests); real API calls will fail loudly
// instead, which is the correct behavior for a missing secret.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
