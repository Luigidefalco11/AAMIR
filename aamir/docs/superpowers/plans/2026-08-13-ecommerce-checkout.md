# E-commerce Fase 1: Acquisto Online Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AAMIR jewelry purchasable online end-to-end — cart, Stripe-hosted checkout, order recording in Sanity, confirmation emails — replacing the current Instagram-DM "Richiedi info" flow.

**Architecture:** Client-side cart (React Context + localStorage) → server route re-verifies price/availability against Sanity and creates a Stripe Checkout Session → Stripe's hosted page collects payment and shipping address → a Stripe webhook records the order as a Sanity document, marks purchased pieces unavailable (they're one-of-a-kind), and sends confirmation emails via Resend.

**Tech Stack:** Next.js 16 App Router (Node runtime route handlers), Sanity CMS, Stripe (`stripe` Node SDK, Checkout Sessions, webhooks), Resend (transactional email), Vitest + Testing Library.

## Global Constraints

- All prices are EUR, stored in Sanity as whole/decimal euros (e.g. `450`), converted to integer cents only when talking to Stripe (`Math.round(price * 100)`).
- Every jewelry piece is one-of-a-kind: cart quantity per item is always 1, and a sold piece must become unavailable immediately on payment success.
- Never trust price or availability data sent from the browser — `/api/checkout` re-reads both from Sanity before creating a Stripe session.
- The webhook must be idempotent (Stripe may redeliver the same event) — skip order creation if an order with that Stripe session ID already exists.
- Shipping: flat rate, Italy only, for this phase.
- No fabricated legal/business data (VAT number, address) — those come from new Sanity `siteSettings` fields Aamir fills in via Studio, with a visible "to complete" fallback in code, never a hardcoded fake value.
- Follow existing code conventions: double-quoted strings, semicolons, Tailwind arbitrary-value CSS vars (`bg-[color:var(--color-primary)]`), server component pages passing translated strings as props into client leaf components (see `RequestInfoButton` for the pattern being replaced).
- Spec: `aamir/docs/superpowers/specs/2026-08-13-ecommerce-checkout-design.md`.

---

### Task 1: Dependencies and environment variables

**Files:**
- Modify: `aamir/package.json`
- Modify: `aamir/.env.example`

**Interfaces:**
- Produces: `stripe` npm package (used by Task 7), `resend` npm package (used by Task 8).

- [ ] **Step 1: Install the Stripe and Resend SDKs**

Run:
```bash
cd aamir && npm install stripe resend
```

Expected: `package.json` `dependencies` gains `stripe` and `resend` entries; `package-lock.json` updates.

- [ ] **Step 2: Document the new environment variables**

Edit `aamir/.env.example` to:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-10-01
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Write access for seeding and for the order webhook (Sanity Editor token)
SANITY_WRITE_TOKEN=

# Stripe (sanity.io/manage is unrelated — get these from dashboard.stripe.com)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend (resend.com) — transactional email for order confirmations
RESEND_API_KEY=
RESEND_FROM_EMAIL=onboarding@resend.dev
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add stripe and resend dependencies"
```

---

### Task 2: Sanity — product price field

**Files:**
- Modify: `aamir/sanity/schemaTypes/product.ts`
- Modify: `aamir/sanity/schemaTypes/schemaTypes.test.ts`
- Modify: `aamir/src/sanity/queries.test.ts`

**Interfaces:**
- Produces: `product` schema gains a `price` field (number, optional, min 0).

- [ ] **Step 1: Update the failing/contradicting tests first**

The codebase currently has a deliberate "no price field" policy encoded in tests, from when this was a request-only showcase. Flip both assertions to match the new policy (price exists, is optional, checkout — not display — is the source of truth for validity).

Replace in `aamir/sanity/schemaTypes/schemaTypes.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { schemaTypes } from "./index";

describe("sanity schema", () => {
  it("registers all required types", () => {
    const names = schemaTypes.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "localeString",
        "localeText",
        "category",
        "product",
        "siteSettings",
        "order",
      ]),
    );
  });

  it("product has an optional price field in EUR", () => {
    const product = schemaTypes.find((t) => t.name === "product");
    const priceField = (product?.fields ?? []).find(
      (f: { name: string }) => f.name === "price",
    );
    expect(priceField).toBeDefined();
    expect(priceField?.type).toBe("number");
  });
});
```

Replace in `aamir/src/sanity/queries.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  PRODUCT_PROJECTION,
  productBySlugQuery,
  productsByCategoryQuery,
} from "./queries";

describe("GROQ queries", () => {
  it("projects category slug and price", () => {
    expect(PRODUCT_PROJECTION).toContain('"categorySlug": category->slug.current');
    expect(PRODUCT_PROJECTION).toMatch(/\bprice\b/);
  });
  it("product-by-slug query filters on slug param", () => {
    expect(productBySlugQuery).toContain("slug.current == $slug");
  });
  it("products-by-category query filters on category slug param", () => {
    expect(productsByCategoryQuery).toContain("category->slug.current == $slug");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd aamir && npx vitest run sanity/schemaTypes/schemaTypes.test.ts src/sanity/queries.test.ts`
Expected: FAIL — `order` not yet registered, `price` field not yet defined, `PRODUCT_PROJECTION` doesn't yet contain "price".

- [ ] **Step 3: Add the `price` field to the product schema**

In `aamir/sanity/schemaTypes/product.ts`, insert after the `description` field and before `featured`:

```typescript
    defineField({ name: "materials", title: "Materiali / pietre", type: "localeString" }),
    defineField({ name: "description", title: "Descrizione", type: "localeText" }),
    defineField({
      name: "price",
      title: "Prezzo (EUR)",
      description: 'Lascia vuoto per mostrare "Prezzo su richiesta" invece del carrello.',
      type: "number",
      validation: (r) => r.min(0),
    }),
    defineField({ name: "featured", title: "In evidenza", type: "boolean", initialValue: false }),
```

(This is a full replacement of those three existing lines plus the new field — `materials` and `description` are unchanged, `price` is inserted between `description` and `featured`.)

- [ ] **Step 4: Run tests again**

Run: `cd aamir && npx vitest run sanity/schemaTypes/schemaTypes.test.ts src/sanity/queries.test.ts`
Expected: The price-field assertion passes now; the `order` and `PRODUCT_PROJECTION` assertions still fail (handled in Tasks 3 and 5).

- [ ] **Step 5: Commit**

```bash
git add sanity/schemaTypes/product.ts sanity/schemaTypes/schemaTypes.test.ts src/sanity/queries.test.ts
git commit -m "feat(sanity): add optional price field to product schema"
```

---

### Task 3: Sanity — order document type

**Files:**
- Create: `aamir/sanity/schemaTypes/order.ts`
- Modify: `aamir/sanity/schemaTypes/index.ts`

**Interfaces:**
- Produces: `order` schema (name `"order"`) with fields `stripeSessionId`, `stripePaymentIntentId`, `items` (array of `{productId, title, price}`), `total`, `customerEmail`, `shippingAddress` (object), `status` (`"paid" | "shipped"`), `createdAt`.
- Consumes: registered in `schemaTypes.ts` — must exist for Task 2's `schemaTypes.test.ts` assertion to pass.

- [ ] **Step 1: Create the order schema**

Create `aamir/sanity/schemaTypes/order.ts`:

```typescript
import { defineType, defineField } from "sanity";

export const order = defineType({
  name: "order",
  title: "Ordine",
  type: "document",
  fields: [
    defineField({ name: "stripeSessionId", title: "ID sessione Stripe", type: "string", validation: (r) => r.required() }),
    defineField({ name: "stripePaymentIntentId", title: "ID pagamento Stripe", type: "string" }),
    defineField({
      name: "items",
      title: "Articoli acquistati",
      type: "array",
      of: [
        {
          type: "object",
          name: "orderItem",
          fields: [
            defineField({ name: "title", title: "Nome", type: "string" }),
            defineField({ name: "price", title: "Prezzo (EUR)", type: "number" }),
          ],
        },
      ],
    }),
    defineField({ name: "total", title: "Totale (EUR)", type: "number" }),
    defineField({ name: "customerEmail", title: "Email cliente", type: "string" }),
    defineField({
      name: "shippingAddress",
      title: "Indirizzo di spedizione",
      type: "object",
      fields: [
        defineField({ name: "name", title: "Nome", type: "string" }),
        defineField({ name: "line1", title: "Indirizzo", type: "string" }),
        defineField({ name: "line2", title: "Indirizzo (2)", type: "string" }),
        defineField({ name: "city", title: "Città", type: "string" }),
        defineField({ name: "postalCode", title: "CAP", type: "string" }),
        defineField({ name: "country", title: "Paese", type: "string" }),
      ],
    }),
    defineField({
      name: "status",
      title: "Stato",
      type: "string",
      options: {
        list: [
          { title: "Pagato", value: "paid" },
          { title: "Spedito", value: "shipped" },
        ],
      },
      initialValue: "paid",
    }),
    defineField({ name: "createdAt", title: "Data", type: "datetime" }),
  ],
  preview: {
    select: { title: "customerEmail", total: "total", status: "status" },
    prepare({ title, total, status }: { title?: string; total?: number; status?: string }) {
      return {
        title: title || "Ordine",
        subtitle: `€${total ?? 0} — ${status ?? "paid"}`,
      };
    },
  },
});
```

- [ ] **Step 2: Register it in the schema index**

In `aamir/sanity/schemaTypes/index.ts`, replace the full file with:

```typescript
import { localeString } from "./localeString";
import { localeText } from "./localeText";
import { category } from "./category";
import { product } from "./product";
import { siteSettings } from "./siteSettings";
import { order } from "./order";

export const schemaTypes = [
  localeString,
  localeText,
  category,
  product,
  siteSettings,
  order,
];
```

- [ ] **Step 3: Run tests**

Run: `cd aamir && npx vitest run sanity/schemaTypes/schemaTypes.test.ts`
Expected: PASS (the `order` registration assertion from Task 2 now succeeds).

- [ ] **Step 4: Commit**

```bash
git add sanity/schemaTypes/order.ts sanity/schemaTypes/index.ts
git commit -m "feat(sanity): add order document type"
```

---

### Task 4: Sanity — legal business fields on siteSettings

**Files:**
- Modify: `aamir/sanity/schemaTypes/siteSettings.ts`
- Modify: `aamir/src/sanity/types.ts`
- Modify: `aamir/src/sanity/queries.ts`

**Interfaces:**
- Produces: `SiteSettings` type gains `vatNumber?: string`, `legalBusinessName?: string`, `businessAddress?: string`. `siteSettingsQuery` projects these three fields.
- Consumes (later): Task 22 (terms page) reads these from `getSiteSettings()`.

- [ ] **Step 1: Add the fields to the Sanity schema**

In `aamir/sanity/schemaTypes/siteSettings.ts`, replace the full file with:

```typescript
import { defineType, defineField } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Impostazioni sito",
  type: "document",
  fields: [
    defineField({ name: "heroTitle", title: "Titolo hero", type: "localeString" }),
    defineField({ name: "heroSubtitle", title: "Sottotitolo hero", type: "localeText" }),
    defineField({ name: "aboutText", title: "Testo Chi Siamo", type: "localeText" }),
    defineField({ name: "email", title: "Email di contatto", type: "string" }),
    defineField({ name: "instagram", title: "Handle Instagram (senza @)", type: "string" }),
    defineField({ name: "metaDescription", title: "Meta description (SEO)", type: "localeText" }),
    defineField({
      name: "legalBusinessName",
      title: "Ragione sociale (per pagina Termini)",
      type: "string",
    }),
    defineField({
      name: "vatNumber",
      title: "Partita IVA (per pagina Termini)",
      type: "string",
    }),
    defineField({
      name: "businessAddress",
      title: "Sede legale/operativa (per pagina Termini)",
      type: "string",
    }),
  ],
});
```

- [ ] **Step 2: Add the fields to the TypeScript type**

In `aamir/src/sanity/types.ts`, replace the `SiteSettings` type:

```typescript
export type SiteSettings = {
  heroTitle: LocaleField;
  heroSubtitle: LocaleField;
  aboutText: LocaleField;
  email: string;
  instagram: string;
  metaDescription: LocaleField;
  legalBusinessName?: string;
  vatNumber?: string;
  businessAddress?: string;
};
```

- [ ] **Step 3: Project the new fields in the query**

In `aamir/src/sanity/queries.ts`, replace the `siteSettingsQuery` line:

```typescript
export const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  heroTitle, heroSubtitle, aboutText, email, instagram, metaDescription,
  legalBusinessName, vatNumber, businessAddress
}`;
```

- [ ] **Step 4: Typecheck**

Run: `cd aamir && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add sanity/schemaTypes/siteSettings.ts src/sanity/types.ts src/sanity/queries.ts
git commit -m "feat(sanity): add legal business fields to siteSettings for the terms page"
```

---

### Task 5: Product type, projection, and the checkout-only price/availability query

**Files:**
- Modify: `aamir/src/sanity/types.ts`
- Modify: `aamir/src/sanity/queries.ts`
- Test: `aamir/src/sanity/queries.test.ts` (assertion already added in Task 2, re-verified here)

**Interfaces:**
- Produces: `Product.price?: number`. `getProductsForCheckout(ids: string[]): Promise<{_id: string; title: LocaleField; price?: number; available: boolean}[]>` — throws on Sanity failure (does **not** use the demo-fallback `safeFetch` wrapper, since silently falling back to fake data during checkout would risk selling at a wrong or missing price).
- Consumes (later): Task 19 (`/api/checkout`) calls `getProductsForCheckout`.

- [ ] **Step 1: Add `price` to the Product type**

In `aamir/src/sanity/types.ts`, replace the `Product` type:

```typescript
export type Product = {
  _id: string;
  title: LocaleField;
  slug: string;
  categorySlug: string;
  images: SanityImage[];
  materials: LocaleField;
  description: LocaleField;
  price?: number;
  available: boolean;
};
```

- [ ] **Step 2: Add `price` to the projection and add the checkout query function**

In `aamir/src/sanity/queries.ts`, replace `PRODUCT_PROJECTION` and add the new function. Full replacement of the relevant sections:

```typescript
export const PRODUCT_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  "categorySlug": category->slug.current,
  "images": images[]{ asset, alt },
  materials,
  description,
  price,
  available
}`;
```

Add this new export after `getCategories` at the end of the file:

```typescript
// Used only by /api/checkout to re-verify price and availability at the
// moment of purchase. Deliberately bypasses safeFetch's demo-data fallback —
// if Sanity is unreachable, checkout must fail loudly, not silently sell at a
// fake or stale price.
export async function getProductsForCheckout(
  ids: string[],
): Promise<Pick<Product, "_id" | "title" | "price" | "available">[]> {
  return client.fetch(
    `*[_type == "product" && _id in $ids]{ _id, title, price, available }`,
    { ids },
  );
}
```

- [ ] **Step 3: Run tests**

Run: `cd aamir && npx vitest run src/sanity/queries.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/sanity/types.ts src/sanity/queries.ts
git commit -m "feat(sanity): expose product price and a checkout-safe price/availability query"
```

---

### Task 6: Server-only Sanity write client

**Files:**
- Create: `aamir/src/sanity/writeClient.ts`

**Interfaces:**
- Produces: `writeClient` (a `next-sanity` client configured with `SANITY_WRITE_TOKEN`, `useCdn: false`).
- Consumes (later): Task 20 (webhook) uses `writeClient.create()`, `.patch()`, `.fetch()`.

- [ ] **Step 1: Create the client**

Create `aamir/src/sanity/writeClient.ts`:

```typescript
import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "./env";

// Server-only client for writes (orders, marking pieces sold). Only import
// this from Route Handlers or scripts — never from a Client Component, since
// the token must not reach the browser.
export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});
```

- [ ] **Step 2: Typecheck**

Run: `cd aamir && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/sanity/writeClient.ts
git commit -m "feat(sanity): add server-only write client for order recording"
```

---

### Task 7: Stripe client wrapper

**Files:**
- Create: `aamir/src/lib/stripe.ts`

**Interfaces:**
- Produces: `stripe` (a configured `Stripe` instance).
- Consumes (later): Task 19 (`/api/checkout`) and Task 20 (webhook) both import `{ stripe } from "@/lib/stripe"`.

- [ ] **Step 1: Create the wrapper**

Create `aamir/src/lib/stripe.ts`:

```typescript
import Stripe from "stripe";

// Empty-string fallback so importing this module never throws at build time
// when the env var is unset (e.g. in tests); real API calls will fail loudly
// instead, which is the correct behavior for a missing secret.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
```

- [ ] **Step 2: Typecheck**

Run: `cd aamir && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/stripe.ts
git commit -m "feat: add Stripe client wrapper"
```

---

### Task 8: Order emails via Resend

**Files:**
- Create: `aamir/src/lib/email.ts`
- Test: `aamir/src/lib/email.test.ts`

**Interfaces:**
- Produces: `sendOrderConfirmationEmail({to, orderTotal, items}): Promise<void>`, `sendOrderNotificationEmail({to, orderTotal, items, customerEmail}): Promise<void>`, where `items: {title: string; price: number}[]`.
- Consumes (later): Task 20 (webhook) calls both after recording the order.

- [ ] **Step 1: Write the failing test**

Create `aamir/src/lib/email.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMock = vi.fn().mockResolvedValue({ data: { id: "email_1" }, error: null });
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd aamir && npx vitest run src/lib/email.test.ts`
Expected: FAIL — `./email` module does not exist yet.

- [ ] **Step 3: Implement the email module**

Create `aamir/src/lib/email.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd aamir && npx vitest run src/lib/email.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/lib/email.test.ts
git commit -m "feat: add order confirmation/notification emails via Resend"
```

---

### Task 9: i18n messages for cart, checkout, and product purchase states

**Files:**
- Modify: `aamir/src/i18n/messages/it.json`
- Modify: `aamir/src/i18n/messages/en.json`

**Interfaces:**
- Produces: new `nav.cart`, new `product.addToCart` / `product.inCart` / `product.priceOnRequest` / `product.sold`, removed `product.requestInfo` / `product.messageCopied` / `product.unavailable`, new `cart.*` namespace, new `checkout.*` namespace, new `terms.*` namespace.
- Consumes (later): Tasks 12–22 call `t("...")` for these keys.

- [ ] **Step 1: Replace `aamir/src/i18n/messages/it.json`**

```json
{
  "nav": { "home": "Home", "collections": "Collezioni", "about": "Chi Siamo", "contact": "Contatti", "cart": "Carrello" },
  "hero": { "cta": "Scopri le collezioni" },
  "collections": { "title": "Collezioni", "all": "Tutti" },
  "craft": { "title": "La Lavorazione" },
  "categories": { "collane": "Collane", "bracciali": "Bracciali", "orecchini": "Orecchini", "anelli": "Anelli" },
  "product": {
    "addToCart": "Aggiungi al carrello",
    "inCart": "Nel carrello",
    "priceOnRequest": "Prezzo su richiesta",
    "sold": "Venduto",
    "materials": "Materiali",
    "backToCollections": "Torna alle collezioni"
  },
  "cart": {
    "title": "Carrello",
    "empty": "Il carrello è vuoto.",
    "remove": "Rimuovi",
    "total": "Totale",
    "consent": "Ho letto e accetto i",
    "terms": "Termini e Condizioni",
    "checkout": "Vai al pagamento",
    "checkoutError": "Qualcosa è andato storto. Riprova.",
    "itemRemovedWarning": "Alcuni articoli non sono più disponibili e sono stati rimossi dal carrello."
  },
  "checkout": {
    "successTitle": "Grazie per il tuo acquisto!",
    "successBody": "Riceverai a breve un'email di conferma con i dettagli del tuo ordine.",
    "backToShop": "Torna alle collezioni",
    "cancelTitle": "Pagamento annullato",
    "cancelBody": "Il tuo carrello è ancora qui, puoi riprovare quando vuoi.",
    "backToCart": "Torna al carrello"
  },
  "terms": {
    "title": "Termini e Condizioni",
    "toComplete": "[Da completare su Sanity Studio → Impostazioni sito]"
  },
  "about": { "title": "Chi Siamo" },
  "contact": {
    "title": "Contatti",
    "intro": "Per informazioni sui nostri pezzi, scrivici.",
    "emailLabel": "Email"
  },
  "common": { "instagram": "Instagram" },
  "notFound": { "title": "Pagina non trovata", "cta": "Torna alla home" }
}
```

- [ ] **Step 2: Replace `aamir/src/i18n/messages/en.json`**

```json
{
  "nav": { "home": "Home", "collections": "Collections", "about": "About", "contact": "Contact", "cart": "Cart" },
  "hero": { "cta": "Explore the collections" },
  "collections": { "title": "Collections", "all": "All" },
  "craft": { "title": "The Craft" },
  "categories": { "collane": "Necklaces", "bracciali": "Bracelets", "orecchini": "Earrings", "anelli": "Rings" },
  "product": {
    "addToCart": "Add to cart",
    "inCart": "In cart",
    "priceOnRequest": "Price on request",
    "sold": "Sold",
    "materials": "Materials",
    "backToCollections": "Back to collections"
  },
  "cart": {
    "title": "Cart",
    "empty": "Your cart is empty.",
    "remove": "Remove",
    "total": "Total",
    "consent": "I have read and accept the",
    "terms": "Terms and Conditions",
    "checkout": "Proceed to payment",
    "checkoutError": "Something went wrong. Please try again.",
    "itemRemovedWarning": "Some items are no longer available and were removed from your cart."
  },
  "checkout": {
    "successTitle": "Thank you for your purchase!",
    "successBody": "You'll receive a confirmation email shortly with your order details.",
    "backToShop": "Back to collections",
    "cancelTitle": "Payment cancelled",
    "cancelBody": "Your cart is still here — try again whenever you're ready.",
    "backToCart": "Back to cart"
  },
  "terms": {
    "title": "Terms and Conditions",
    "toComplete": "[To complete in Sanity Studio → Site Settings]"
  },
  "about": { "title": "About" },
  "contact": {
    "title": "Contact",
    "intro": "For enquiries about our pieces, get in touch.",
    "emailLabel": "Email"
  },
  "common": { "instagram": "Instagram" },
  "notFound": { "title": "Page not found", "cta": "Back to home" }
}
```

- [ ] **Step 3: Verify the app still builds with the new messages**

Run: `cd aamir && npx tsc --noEmit`
Expected: no errors (JSON changes don't affect typecheck directly, but this confirms nothing else broke).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/messages/it.json src/i18n/messages/en.json
git commit -m "feat(i18n): add cart, checkout, and terms translation keys"
```

---

### Task 10: Cart core logic (pure functions)

**Files:**
- Create: `aamir/src/lib/cart.ts`
- Test: `aamir/src/lib/cart.test.ts`

**Interfaces:**
- Produces: `CartItem` type `{productId: string; slug: string; categorySlug: string; title: {it?: string; en?: string}; price: number; imageUrl?: string}`; `addItem(items, item): CartItem[]`; `removeItem(items, productId): CartItem[]`; `cartTotal(items): number`.
- Consumes (later): Task 11 (`CartProvider`) wraps these; Task 18 (`CartPageClient`) reads `CartItem`.

- [ ] **Step 1: Write the failing test**

Create `aamir/src/lib/cart.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { addItem, removeItem, cartTotal, type CartItem } from "./cart";

const item = (id: string, price: number): CartItem => ({
  productId: id,
  slug: `slug-${id}`,
  categorySlug: "collane",
  title: { it: `Prodotto ${id}`, en: `Product ${id}` },
  price,
});

describe("addItem", () => {
  it("adds a new item to an empty cart", () => {
    expect(addItem([], item("1", 100))).toEqual([item("1", 100)]);
  });
  it("does not duplicate an item already in the cart", () => {
    const cart = [item("1", 100)];
    expect(addItem(cart, item("1", 100))).toEqual(cart);
  });
});

describe("removeItem", () => {
  it("removes the matching item", () => {
    const cart = [item("1", 100), item("2", 200)];
    expect(removeItem(cart, "1")).toEqual([item("2", 200)]);
  });
  it("is a no-op when the item is not in the cart", () => {
    const cart = [item("1", 100)];
    expect(removeItem(cart, "2")).toEqual(cart);
  });
});

describe("cartTotal", () => {
  it("sums the price of every item", () => {
    expect(cartTotal([item("1", 100), item("2", 250)])).toBe(350);
  });
  it("is zero for an empty cart", () => {
    expect(cartTotal([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd aamir && npx vitest run src/lib/cart.test.ts`
Expected: FAIL — `./cart` module does not exist yet.

- [ ] **Step 3: Implement the cart module**

Create `aamir/src/lib/cart.ts`:

```typescript
export type CartItem = {
  productId: string;
  slug: string;
  categorySlug: string;
  title: { it?: string; en?: string };
  price: number;
  imageUrl?: string;
};

export function addItem(items: CartItem[], item: CartItem): CartItem[] {
  if (items.some((i) => i.productId === item.productId)) return items;
  return [...items, item];
}

export function removeItem(items: CartItem[], productId: string): CartItem[] {
  return items.filter((i) => i.productId !== productId);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price, 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd aamir && npx vitest run src/lib/cart.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cart.ts src/lib/cart.test.ts
git commit -m "feat: add pure cart logic (add/remove/total)"
```

---

### Task 11: CartProvider (React Context + localStorage)

**Files:**
- Create: `aamir/src/components/CartProvider.tsx`
- Test: `aamir/src/components/CartProvider.test.tsx`

**Interfaces:**
- Consumes: `CartItem`, `addItem`, `removeItem`, `cartTotal` from `@/lib/cart` (Task 10).
- Produces: `CartProvider({children})` component; `useCart(): {items: CartItem[]; addItem(item): void; removeItem(productId): void; isInCart(productId): boolean; total: number; count: number}`.
- Consumes (later): Task 12 (`CartIcon`), Task 14 (`AddToCartButton`), Task 18 (`CartPageClient`) all call `useCart()`. Task 13 wraps the app in `<CartProvider>`.

- [ ] **Step 1: Write the failing test**

Create `aamir/src/components/CartProvider.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CartProvider, useCart } from "./CartProvider";
import type { CartItem } from "@/lib/cart";

const item: CartItem = {
  productId: "1",
  slug: "collana-onda",
  categorySlug: "collane",
  title: { it: "Collana Onda", en: "Onda Necklace" },
  price: 450,
};

function TestConsumer() {
  const cart = useCart();
  return (
    <div>
      <p data-testid="count">{cart.count}</p>
      <p data-testid="total">{cart.total}</p>
      <p data-testid="in-cart">{String(cart.isInCart("1"))}</p>
      <button onClick={() => cart.addItem(item)}>add</button>
      <button onClick={() => cart.removeItem("1")}>remove</button>
    </div>
  );
}

describe("CartProvider", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty", () => {
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("adds an item and updates count/total/isInCart", () => {
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("total")).toHaveTextContent("450");
    expect(screen.getByTestId("in-cart")).toHaveTextContent("true");
  });

  it("removes an item", () => {
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("add"));
    fireEvent.click(screen.getByText("remove"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("persists the cart to localStorage and rehydrates on next mount", async () => {
    const { unmount } = render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("add"));
    unmount();

    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>,
    );
    expect(await screen.findByTestId("count")).toHaveTextContent("1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd aamir && npx vitest run src/components/CartProvider.test.tsx`
Expected: FAIL — `./CartProvider` module does not exist yet.

- [ ] **Step 3: Implement CartProvider**

Create `aamir/src/components/CartProvider.tsx`:

```tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { addItem, removeItem, cartTotal, type CartItem } from "@/lib/cart";

const STORAGE_KEY = "aamir-cart";

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  isInCart: (productId: string) => boolean;
  total: number;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Cart starts empty on the server (and on first client render, to avoid a
  // hydration mismatch), then loads from localStorage once mounted.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // Corrupt or inaccessible storage — start with an empty cart.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage full/unavailable — cart still works for this session.
    }
  }, [items, hydrated]);

  const value: CartContextValue = {
    items,
    addItem: (item) => setItems((current) => addItem(current, item)),
    removeItem: (productId) => setItems((current) => removeItem(current, productId)),
    isInCart: (productId) => items.some((i) => i.productId === productId),
    total: cartTotal(items),
    count: items.length,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd aamir && npx vitest run src/components/CartProvider.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/CartProvider.tsx src/components/CartProvider.test.tsx
git commit -m "feat: add CartProvider context with localStorage persistence"
```

---

### Task 12: CartIcon (header cart link with item count)

**Files:**
- Create: `aamir/src/components/CartIcon.tsx`
- Test: `aamir/src/components/CartIcon.test.tsx`

**Interfaces:**
- Consumes: `useCart()` from `@/components/CartProvider` (Task 11).
- Produces: `CartIcon({locale, label}: {locale: string; label: string})`.
- Consumes (later): Task 13 renders `<CartIcon>` inside `Header.tsx`.

- [ ] **Step 1: Write the failing test**

Create `aamir/src/components/CartIcon.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CartProvider } from "./CartProvider";
import { CartIcon } from "./CartIcon";
import type { CartItem } from "@/lib/cart";

const seeded: CartItem = {
  productId: "1",
  slug: "collana-onda",
  categorySlug: "collane",
  title: { it: "Collana Onda", en: "Onda Necklace" },
  price: 450,
};

describe("CartIcon", () => {
  beforeEach(() => localStorage.clear());

  it("shows no count badge when the cart is empty", () => {
    render(
      <CartProvider>
        <CartIcon locale="it" label="Carrello" />
      </CartProvider>,
    );
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows the item count when the cart has items", async () => {
    localStorage.setItem("aamir-cart", JSON.stringify([seeded]));
    render(
      <CartProvider>
        <CartIcon locale="it" label="Carrello" />
      </CartProvider>,
    );
    expect(await screen.findByText("1")).toBeInTheDocument();
  });

  it("links to the cart page for the given locale", () => {
    render(
      <CartProvider>
        <CartIcon locale="en" label="Cart" />
      </CartProvider>,
    );
    expect(screen.getByRole("link", { name: /Cart/ })).toHaveAttribute("href", "/en/carrello");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd aamir && npx vitest run src/components/CartIcon.test.tsx`
Expected: FAIL — `./CartIcon` module does not exist yet.

- [ ] **Step 3: Implement CartIcon**

Create `aamir/src/components/CartIcon.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function CartIcon({ locale, label }: { locale: string; label: string }) {
  const { count } = useCart();
  return (
    <Link
      href={`/${locale}/carrello`}
      className="relative text-sm hover:text-[color:var(--color-primary)] transition-colors"
    >
      {label}
      {count > 0 && (
        <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--color-primary)] text-white text-xs">
          {count}
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd aamir && npx vitest run src/components/CartIcon.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/CartIcon.tsx src/components/CartIcon.test.tsx
git commit -m "feat: add CartIcon header component"
```

---

### Task 13: Wire CartProvider and CartIcon into the app shell

**Files:**
- Modify: `aamir/src/app/[locale]/layout.tsx`
- Modify: `aamir/src/components/Header.tsx`

**Interfaces:**
- Consumes: `CartProvider` (Task 11), `CartIcon` (Task 12).

- [ ] **Step 1: Wrap the locale layout in CartProvider**

Replace the full contents of `aamir/src/app/[locale]/layout.tsx`:

```tsx
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartProvider } from "@/components/CartProvider";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <NextIntlClientProvider>
      <CartProvider>
        <Header locale={locale} />
        <main className="min-h-[60vh]">{children}</main>
        <Footer />
      </CartProvider>
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 2: Add the cart icon to the header**

Replace the full contents of `aamir/src/components/Header.tsx`:

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CartIcon } from "./CartIcon";
import { getSiteSettings } from "@/sanity/queries";
import { instagramUrl } from "@/lib/contact";

export async function Header({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const settings = await getSiteSettings();
  const ig = settings?.instagram ?? "aamir.jewelry";
  const base = `/${locale}`;

  return (
    <header className="sticky top-0 z-40 bg-[color:var(--color-bg)]/90 backdrop-blur border-b border-[color:var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <nav className="hidden md:flex gap-8 text-sm">
          <Link href={base} className="hover:text-[color:var(--color-primary)] transition-colors">{t("home")}</Link>
          <Link href={`${base}/collezioni`} className="hover:text-[color:var(--color-primary)] transition-colors">{t("collections")}</Link>
          <Link href={`${base}/chi-siamo`} className="hover:text-[color:var(--color-primary)] transition-colors">{t("about")}</Link>
          <Link href={`${base}/contatti`} className="hover:text-[color:var(--color-primary)] transition-colors">{t("contact")}</Link>
        </nav>
        <Link href={base} className="font-serif text-2xl tracking-[0.3em] font-semibold">
          AAMIR
        </Link>
        <div className="flex items-center gap-4">
          <a href={instagramUrl(ig)} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-[color:var(--color-primary)] transition-colors">Instagram</a>
          <CartIcon locale={locale} label={t("cart")} />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Typecheck and run the full suite**

Run: `cd aamir && npx tsc --noEmit && npx vitest run`
Expected: no type errors; all existing tests still pass (Header has no dedicated test file today).

- [ ] **Step 4: Commit**

```bash
git add src/app/\[locale\]/layout.tsx src/components/Header.tsx
git commit -m "feat: wire CartProvider and cart icon into the app shell"
```

---

### Task 14: AddToCartButton

**Files:**
- Create: `aamir/src/components/AddToCartButton.tsx`
- Test: `aamir/src/components/AddToCartButton.test.tsx`

**Interfaces:**
- Consumes: `useCart()` (Task 11), `CartItem` (Task 10).
- Produces: `AddToCartButton({product, addLabel, inCartLabel}: {product: CartItem; addLabel: string; inCartLabel: string})`.
- Consumes (later): Task 16 (product detail page) renders this instead of `RequestInfoButton`.

- [ ] **Step 1: Write the failing test**

Create `aamir/src/components/AddToCartButton.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CartProvider } from "./CartProvider";
import { AddToCartButton } from "./AddToCartButton";
import type { CartItem } from "@/lib/cart";

const product: CartItem = {
  productId: "1",
  slug: "collana-onda",
  categorySlug: "collane",
  title: { it: "Collana Onda", en: "Onda Necklace" },
  price: 450,
};

describe("AddToCartButton", () => {
  it("adds the product to the cart when clicked and then shows the in-cart state", () => {
    render(
      <CartProvider>
        <AddToCartButton product={product} addLabel="Aggiungi al carrello" inCartLabel="Nel carrello" />
      </CartProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Aggiungi al carrello" }));
    expect(screen.getByRole("button", { name: "Nel carrello" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd aamir && npx vitest run src/components/AddToCartButton.test.tsx`
Expected: FAIL — `./AddToCartButton` module does not exist yet.

- [ ] **Step 3: Implement AddToCartButton**

Create `aamir/src/components/AddToCartButton.tsx`:

```tsx
"use client";

import { useCart } from "./CartProvider";
import type { CartItem } from "@/lib/cart";

export function AddToCartButton({
  product,
  addLabel,
  inCartLabel,
}: {
  product: CartItem;
  addLabel: string;
  inCartLabel: string;
}) {
  const { addItem, isInCart } = useCart();
  const inCart = isInCart(product.productId);

  return (
    <button
      type="button"
      onClick={() => !inCart && addItem(product)}
      disabled={inCart}
      className="inline-block px-8 py-3 bg-[color:var(--color-primary)] text-white text-sm tracking-wide hover:bg-[color:var(--color-primary-hover)] transition-colors disabled:opacity-60 disabled:cursor-default"
    >
      {inCart ? inCartLabel : addLabel}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd aamir && npx vitest run src/components/AddToCartButton.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AddToCartButton.tsx src/components/AddToCartButton.test.tsx
git commit -m "feat: add AddToCartButton"
```

---

### Task 15: Remove RequestInfoButton and prune contact.ts

**Files:**
- Delete: `aamir/src/components/RequestInfoButton.tsx`
- Delete: `aamir/src/components/RequestInfoButton.test.tsx`
- Modify: `aamir/src/lib/contact.ts`
- Modify: `aamir/src/lib/contact.test.ts`

**Interfaces:**
- Removes: `RequestInfoButton`, `buildRequestInfoMessage`, `instagramDmUrl`.
- Keeps: `instagramUrl` (still used by `Header.tsx`, `Footer.tsx`, and the product page's passive "@handle" link).

The "Richiedi info" Instagram-DM flow is fully replaced by "Aggiungi al carrello" (per the approved spec). Once Task 16 stops rendering `RequestInfoButton`, this component and its now-unused helpers become dead code — delete them rather than leaving them unreferenced.

- [ ] **Step 1: Delete the button component and its test**

```bash
cd aamir
git rm src/components/RequestInfoButton.tsx src/components/RequestInfoButton.test.tsx
```

- [ ] **Step 2: Prune contact.ts**

Replace the full contents of `aamir/src/lib/contact.ts`:

```typescript
export function instagramUrl(handle: string): string {
  const clean = handle.replace(/^@/, "");
  return `https://instagram.com/${clean}`;
}
```

- [ ] **Step 3: Prune contact.test.ts**

Replace the full contents of `aamir/src/lib/contact.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { instagramUrl } from "./contact";

describe("instagramUrl", () => {
  it("strips a leading @ and builds the profile URL", () => {
    expect(instagramUrl("@aamirjewelry")).toBe("https://instagram.com/aamirjewelry");
  });
  it("works without a leading @", () => {
    expect(instagramUrl("aamirjewelry")).toBe("https://instagram.com/aamirjewelry");
  });
});
```

- [ ] **Step 4: Run tests**

Run: `cd aamir && npx vitest run src/lib/contact.test.ts`
Expected: PASS (2 tests). (Task 16 removes the last import of `RequestInfoButton`; until then, `npx tsc --noEmit` will correctly still fail — that's expected and resolved in the next task.)

- [ ] **Step 5: Commit**

```bash
git add -A src/lib/contact.ts src/lib/contact.test.ts
git commit -m "refactor: remove RequestInfoButton and unused Instagram-DM helpers"
```

---

### Task 16: Product detail page — price, AddToCartButton, sold/on-request states

**Files:**
- Modify: `aamir/src/app/[locale]/collezioni/[categoria]/[slug]/page.tsx`

**Interfaces:**
- Consumes: `AddToCartButton` (Task 14), `CartItem` (Task 10), `urlFor` from `@/sanity/client`, new i18n keys from Task 9.

- [ ] **Step 1: Replace the page**

Replace the full contents of `aamir/src/app/[locale]/collezioni/[categoria]/[slug]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ProductGallery } from "@/components/ProductGallery";
import { AddToCartButton } from "@/components/AddToCartButton";
import { getProduct, getSiteSettings } from "@/sanity/queries";
import { localize, type Locale } from "@/sanity/localize";
import { instagramUrl } from "@/lib/contact";
import { urlFor } from "@/sanity/client";

// Product pages depend on live CMS data that changes; render on demand
// (with data-layer revalidation) rather than as build-time static pages.
// This also avoids a static/dynamic collision with getLocale() in the root
// layout when a requested slug isn't in generateStaticParams.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  const title = localize(product.title, locale as Locale);
  return { title: `${title} — AAMIR` };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; categoria: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const l = locale as Locale;
  const [product, settings, t] = await Promise.all([
    getProduct(slug),
    getSiteSettings(),
    getTranslations({ locale, namespace: "product" }),
  ]);
  if (!product) notFound();

  const title = localize(product.title, l);
  const materials = localize(product.materials, l);
  const description = localize(product.description, l);
  const ig = settings?.instagram ?? "aamir.jewelry";
  const purchasable = product.available && typeof product.price === "number";

  return (
    <section className="mx-auto max-w-7xl px-6 pt-12 grid md:grid-cols-2 gap-12">
      <ProductGallery images={product.images ?? []} title={title} />

      <div className="md:pt-8">
        <Link href={`/${locale}/collezioni`} className="text-sm text-[color:var(--color-text)]/70 hover:text-[color:var(--color-primary)] transition-colors">
          ← {t("backToCollections")}
        </Link>
        <h1 className="font-serif text-4xl mt-4">{title}</h1>

        {typeof product.price === "number" && (
          <p className="mt-4 text-2xl font-serif">€{product.price}</p>
        )}

        {materials && (
          <p className="mt-6">
            <span className="block text-xs uppercase tracking-widest text-[color:var(--color-text)]/70">{t("materials")}</span>
            <span className="text-lg">{materials}</span>
          </p>
        )}

        {description && (
          <p className="mt-6 leading-relaxed text-[color:var(--color-text)]/80 max-w-prose">{description}</p>
        )}

        <div className="mt-10 flex items-center gap-6">
          {purchasable ? (
            <AddToCartButton
              product={{
                productId: product._id,
                slug: product.slug,
                categorySlug: product.categorySlug,
                title: product.title,
                price: product.price as number,
                imageUrl: product.images?.[0]
                  ? urlFor(product.images[0]).width(200).auto("format").url()
                  : undefined,
              }}
              addLabel={t("addToCart")}
              inCartLabel={t("inCart")}
            />
          ) : (
            <span className="text-sm text-[color:var(--color-text)]/70">
              {product.available ? t("priceOnRequest") : t("sold")}
            </span>
          )}
          <a href={instagramUrl(ig)} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-[color:var(--color-primary)] transition-colors">
            @{ig}
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd aamir && npx tsc --noEmit`
Expected: no errors (this resolves the dangling `RequestInfoButton` import removed in Task 15).

- [ ] **Step 3: Run the full test suite**

Run: `cd aamir && npx vitest run`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/\[locale\]/collezioni/\[categoria\]/\[slug\]/page.tsx
git commit -m "feat: replace Richiedi-info with Aggiungi-al-carrello on the product page"
```

---

### Task 17: ProductCard — show price in the grid

**Files:**
- Modify: `aamir/src/components/ProductCard.tsx`
- Modify: `aamir/src/components/ProductCard.test.tsx`

**Interfaces:**
- Consumes: `product.price?: number` (Task 5).

- [ ] **Step 1: Add a test for the price display**

In `aamir/src/components/ProductCard.test.tsx`, add a new `it` inside the existing `describe("ProductCard", ...)` block (keep the existing test as-is):

```tsx
  it("shows the price when the product has one", () => {
    render(<ProductCard product={{ ...product, price: 450 }} locale="en" />);
    expect(screen.getByText("€450")).toBeInTheDocument();
  });

  it("shows nothing extra when the product has no price", () => {
    render(<ProductCard product={product} locale="en" />);
    expect(screen.queryByText(/€/)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd aamir && npx vitest run src/components/ProductCard.test.tsx`
Expected: FAIL — no price is rendered yet.

- [ ] **Step 3: Add the price line to ProductCard**

Replace the full contents of `aamir/src/components/ProductCard.tsx`:

```tsx
import Link from "next/link";
import { SafeImage } from "./SafeImage";
import { localize, type Locale } from "@/sanity/localize";
import type { Product } from "@/sanity/types";

export function ProductCard({
  product,
  locale,
}: {
  product: Product;
  locale: Locale;
}) {
  const title = localize(product.title, locale);
  const materials = localize(product.materials, locale);
  return (
    <Link
      href={`/${locale}/collezioni/${product.categorySlug}/${product.slug}`}
      className="group block"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--color-surface)]">
        <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]">
          <SafeImage image={product.images?.[0]} alt={product.images?.[0]?.alt || title} sizes="(max-width: 768px) 100vw, 33vw" />
        </div>
      </div>
      <h3 className="mt-4 font-serif text-xl">{title}</h3>
      {materials && <p className="text-sm text-[color:var(--color-text)]/70">{materials}</p>}
      {typeof product.price === "number" && (
        <p className="text-sm text-[color:var(--color-gold)]">€{product.price}</p>
      )}
    </Link>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd aamir && npx vitest run src/components/ProductCard.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ProductCard.tsx src/components/ProductCard.test.tsx
git commit -m "feat: show price on product grid cards"
```

---

### Task 18: Cart page

**Files:**
- Create: `aamir/src/components/CartPageClient.tsx`
- Test: `aamir/src/components/CartPageClient.test.tsx`
- Create: `aamir/src/app/[locale]/carrello/page.tsx`

**Interfaces:**
- Consumes: `useCart()` (Task 11), `localize` (`@/sanity/localize`).
- Produces: `CartPageClient({locale, labels})` — posts to `/api/checkout` (Task 19) with body `{items: {productId: string}[], locale}`; on `200` redirects the browser to `data.url`; on `409` removes the returned `removedIds` from the cart and shows a warning; on any other non-OK response shows `labels.checkoutError`.

- [ ] **Step 1: Write the failing test**

Create `aamir/src/components/CartPageClient.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CartProvider } from "./CartProvider";
import { CartPageClient } from "./CartPageClient";
import type { CartItem } from "@/lib/cart";

const seeded: CartItem = {
  productId: "1",
  slug: "collana-onda",
  categorySlug: "collane",
  title: { it: "Collana Onda", en: "Onda Necklace" },
  price: 450,
};

const labels = {
  empty: "Il carrello è vuoto.",
  remove: "Rimuovi",
  total: "Totale",
  consent: "Ho letto e accetto i",
  terms: "Termini e Condizioni",
  checkout: "Vai al pagamento",
  checkoutError: "Qualcosa è andato storto. Riprova.",
  itemRemovedWarning: "Alcuni articoli non sono più disponibili e sono stati rimossi dal carrello.",
};

describe("CartPageClient", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows the empty-cart message when there are no items", () => {
    render(
      <CartProvider>
        <CartPageClient locale="it" labels={labels} />
      </CartProvider>,
    );
    expect(screen.getByText(labels.empty)).toBeInTheDocument();
  });

  it("lists items and disables checkout until consent is checked", () => {
    localStorage.setItem("aamir-cart", JSON.stringify([seeded]));
    render(
      <CartProvider>
        <CartPageClient locale="it" labels={labels} />
      </CartProvider>,
    );
    expect(screen.getByText("Collana Onda")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: labels.checkout })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: labels.checkout })).toBeEnabled();
  });

  it("posts the cart to /api/checkout and redirects on success", async () => {
    localStorage.setItem("aamir-cart", JSON.stringify([seeded]));
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ url: "https://checkout.stripe.com/session/abc" }),
    });
    delete (window as unknown as { location: unknown }).location;
    (window as unknown as { location: { href: string } }).location = { href: "" };

    render(
      <CartProvider>
        <CartPageClient locale="it" labels={labels} />
      </CartProvider>,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: labels.checkout }));

    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.stripe.com/session/abc");
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/checkout",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ items: [{ productId: "1" }], locale: "it" }),
      }),
    );
  });

  it("removes items and shows a warning when the server reports them unavailable", async () => {
    localStorage.setItem("aamir-cart", JSON.stringify([seeded]));
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ removedIds: ["1"], removed: ["Collana Onda"] }),
    });

    render(
      <CartProvider>
        <CartPageClient locale="it" labels={labels} />
      </CartProvider>,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: labels.checkout }));

    expect(await screen.findByText(labels.itemRemovedWarning)).toBeInTheDocument();
    expect(await screen.findByText(labels.empty)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd aamir && npx vitest run src/components/CartPageClient.test.tsx`
Expected: FAIL — `./CartPageClient` module does not exist yet.

- [ ] **Step 3: Implement CartPageClient**

Create `aamir/src/components/CartPageClient.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { localize, type Locale } from "@/sanity/localize";

type Labels = {
  empty: string;
  remove: string;
  total: string;
  consent: string;
  terms: string;
  checkout: string;
  checkoutError: string;
  itemRemovedWarning: string;
};

export function CartPageClient({ locale, labels }: { locale: Locale; labels: Labels }) {
  const { items, removeItem, total } = useCart();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removedWarning, setRemovedWarning] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    setRemovedWarning(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId })),
          locale,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        (data.removedIds as string[]).forEach((id) => removeItem(id));
        setRemovedWarning(labels.itemRemovedWarning);
        return;
      }
      if (!res.ok) throw new Error("checkout-failed");

      const data = await res.json();
      window.location.href = data.url;
    } catch {
      setError(labels.checkoutError);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return <p className="text-[color:var(--color-text)]/70">{labels.empty}</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-[color:var(--color-border)]">
        {items.map((item) => (
          <li key={item.productId} className="flex items-center justify-between py-4">
            <div>
              <p className="font-serif">{localize(item.title, locale)}</p>
              <p className="text-sm text-[color:var(--color-text)]/70">€{item.price}</p>
            </div>
            <button
              type="button"
              onClick={() => removeItem(item.productId)}
              className="text-sm text-[color:var(--color-text)]/70 hover:text-[color:var(--color-primary)] transition-colors"
            >
              {labels.remove}
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xl font-serif">
        {labels.total}: €{total}
      </p>

      <label className="mt-8 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1"
        />
        <span>
          {labels.consent}{" "}
          <Link href={`/${locale}/termini`} className="underline hover:text-[color:var(--color-primary)]">
            {labels.terms}
          </Link>
        </span>
      </label>

      {removedWarning && <p className="mt-4 text-sm text-[color:var(--color-primary)]">{removedWarning}</p>}
      {error && <p className="mt-4 text-sm text-[color:var(--color-primary)]">{error}</p>}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={!accepted || loading}
        className="mt-6 inline-block px-8 py-3 bg-[color:var(--color-primary)] text-white text-sm tracking-wide hover:bg-[color:var(--color-primary-hover)] transition-colors disabled:opacity-60 disabled:cursor-default"
      >
        {labels.checkout}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd aamir && npx vitest run src/components/CartPageClient.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Create the page that renders it**

Create `aamir/src/app/[locale]/carrello/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { CartPageClient } from "@/components/CartPageClient";
import type { Locale } from "@/sanity/localize";

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "cart" });

  return (
    <section className="mx-auto max-w-3xl px-6 pt-16 pb-24">
      <h1 className="font-serif text-4xl mb-10">{t("title")}</h1>
      <CartPageClient
        locale={locale as Locale}
        labels={{
          empty: t("empty"),
          remove: t("remove"),
          total: t("total"),
          consent: t("consent"),
          terms: t("terms"),
          checkout: t("checkout"),
          checkoutError: t("checkoutError"),
          itemRemovedWarning: t("itemRemovedWarning"),
        }}
      />
    </section>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `cd aamir && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/CartPageClient.tsx src/components/CartPageClient.test.tsx "src/app/[locale]/carrello/page.tsx"
git commit -m "feat: add the cart page"
```

---

### Task 19: Checkout API route

**Files:**
- Create: `aamir/src/app/api/checkout/route.ts`
- Test: `aamir/src/app/api/checkout/route.test.ts`

**Interfaces:**
- Consumes: `stripe` (Task 7), `getProductsForCheckout` (Task 5).
- Produces: `POST` handler. Request body `{items: {productId: string}[], locale?: "it" | "en"}`. Responses: `400` empty cart; `503` Sanity unreachable; `409 {removedIds: string[], removed: string[]}` when any item is no longer purchasable; `200 {url: string}` with the Stripe Checkout Session URL on success.

- [ ] **Step 1: Write the failing test**

Create `aamir/src/app/api/checkout/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const getProductsForCheckoutMock = vi.fn();
vi.mock("@/sanity/queries", () => ({
  getProductsForCheckout: (...args: unknown[]) => getProductsForCheckoutMock(...args),
}));

const createSessionMock = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { create: (...args: unknown[]) => createSessionMock(...args) } } },
}));

import { POST } from "./route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/checkout", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout", () => {
  beforeEach(() => {
    getProductsForCheckoutMock.mockReset();
    createSessionMock.mockReset();
  });

  it("returns 400 for an empty cart", async () => {
    const res = await POST(makeRequest({ items: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 503 when Sanity is unreachable", async () => {
    getProductsForCheckoutMock.mockRejectedValue(new Error("network"));
    const res = await POST(makeRequest({ items: [{ productId: "1" }] }));
    expect(res.status).toBe(503);
  });

  it("returns 409 and lists removed items when a product is no longer available", async () => {
    getProductsForCheckoutMock.mockResolvedValue([
      { _id: "1", title: { it: "Collana Onda" }, price: 450, available: false },
    ]);
    const res = await POST(makeRequest({ items: [{ productId: "1" }] }));
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.removedIds).toEqual(["1"]);
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  it("creates a Stripe session with EUR-cents line items for available, priced products", async () => {
    getProductsForCheckoutMock.mockResolvedValue([
      { _id: "1", title: { it: "Collana Onda" }, price: 450, available: true },
    ]);
    createSessionMock.mockResolvedValue({ url: "https://checkout.stripe.com/session/abc" });

    const res = await POST(makeRequest({ items: [{ productId: "1" }], locale: "it" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.url).toBe("https://checkout.stripe.com/session/abc");

    const sessionArgs = createSessionMock.mock.calls[0][0];
    expect(sessionArgs.mode).toBe("payment");
    expect(sessionArgs.line_items[0].price_data.unit_amount).toBe(45000);
    expect(sessionArgs.line_items[0].price_data.currency).toBe("eur");
    expect(sessionArgs.metadata.productIds).toBe(JSON.stringify(["1"]));
    expect(sessionArgs.success_url).toContain("/it/checkout/successo");
    expect(sessionArgs.cancel_url).toContain("/it/checkout/annullato");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd aamir && npx vitest run src/app/api/checkout/route.test.ts`
Expected: FAIL — `./route` module does not exist yet.

- [ ] **Step 3: Implement the route**

Create `aamir/src/app/api/checkout/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getProductsForCheckout } from "@/sanity/queries";
import { localize, type Locale } from "@/sanity/localize";

const SHIPPING_CENTS = 900; // flat rate, Italy only

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const requestedIds: string[] = Array.isArray(body?.items)
    ? body.items.map((i: { productId: string }) => i.productId).filter(Boolean)
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd aamir && npx vitest run src/app/api/checkout/route.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/checkout/route.ts" "src/app/api/checkout/route.test.ts"
git commit -m "feat: add /api/checkout — creates a Stripe Checkout Session"
```

---

### Task 20: Stripe webhook — record order, mark pieces sold, send emails

**Files:**
- Create: `aamir/src/app/api/webhooks/stripe/route.ts`
- Test: `aamir/src/app/api/webhooks/stripe/route.test.ts`

**Interfaces:**
- Consumes: `stripe` (Task 7), `writeClient` (Task 6), `getSiteSettings` (`@/sanity/queries`), `sendOrderConfirmationEmail` / `sendOrderNotificationEmail` (Task 8).
- Produces: `POST` handler verifying the `stripe-signature` header; on `checkout.session.completed`, idempotently creates a Sanity `order` document, patches each purchased product to `available: false`, and sends both emails.

- [ ] **Step 1: Write the failing test**

Create `aamir/src/app/api/webhooks/stripe/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

const constructEventMock = vi.fn();
const listLineItemsMock = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: (...args: unknown[]) => constructEventMock(...args) },
    checkout: { sessions: { listLineItems: (...args: unknown[]) => listLineItemsMock(...args) } },
  },
}));

const fetchMock = vi.fn();
const createMock = vi.fn();
const patchCommitMock = vi.fn();
const patchSetMock = vi.fn(() => ({ commit: patchCommitMock }));
vi.mock("@/sanity/writeClient", () => ({
  writeClient: {
    fetch: (...args: unknown[]) => fetchMock(...args),
    create: (...args: unknown[]) => createMock(...args),
    patch: () => ({ set: patchSetMock }),
  },
}));

vi.mock("@/sanity/queries", () => ({
  getSiteSettings: vi.fn().mockResolvedValue({ email: "info@aamirjewelry.it" }),
}));

const sendConfirmationMock = vi.fn().mockResolvedValue(undefined);
const sendNotificationMock = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email", () => ({
  sendOrderConfirmationEmail: (...args: unknown[]) => sendConfirmationMock(...args),
  sendOrderNotificationEmail: (...args: unknown[]) => sendNotificationMock(...args),
}));

import { POST } from "./route";

function makeRequest(body: string) {
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "test-sig" },
    body,
  });
}

const completedSession = {
  id: "cs_test_123",
  amount_total: 45900,
  payment_intent: "pi_123",
  metadata: { productIds: JSON.stringify(["1"]) },
  customer_details: {
    email: "cliente@example.com",
    name: "Mario Rossi",
    address: { line1: "Via Roma 1", line2: null, city: "Salerno", postal_code: "84100", country: "IT" },
  },
};

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    constructEventMock.mockReset();
    listLineItemsMock.mockReset();
    fetchMock.mockReset();
    createMock.mockReset();
    patchCommitMock.mockReset();
    sendConfirmationMock.mockClear();
    sendNotificationMock.mockClear();
  });

  it("returns 400 for an invalid signature", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("bad signature");
    });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(400);
  });

  it("ignores event types other than checkout.session.completed", async () => {
    constructEventMock.mockReturnValue({ type: "payment_intent.created", data: { object: {} } });
    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("records the order, marks purchased products unavailable, and sends both emails", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    listLineItemsMock.mockResolvedValue({
      data: [{ description: "Collana Onda", amount_total: 45000 }],
    });
    fetchMock.mockResolvedValue(null); // no existing order with this session id

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: "order",
        stripeSessionId: "cs_test_123",
        stripePaymentIntentId: "pi_123",
        total: 459,
        customerEmail: "cliente@example.com",
        status: "paid",
      }),
    );
    expect(patchSetMock).toHaveBeenCalledWith({ available: false });
    expect(sendConfirmationMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "cliente@example.com", orderTotal: 459 }),
    );
    expect(sendNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "info@aamirjewelry.it", customerEmail: "cliente@example.com" }),
    );
  });

  it("is idempotent: skips creating a duplicate order if one already exists for this session", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: completedSession },
    });
    listLineItemsMock.mockResolvedValue({ data: [] });
    fetchMock.mockResolvedValue({ _id: "order-existing" });

    const res = await POST(makeRequest("{}"));
    expect(res.status).toBe(200);
    expect(createMock).not.toHaveBeenCalled();
    expect(patchSetMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd aamir && npx vitest run src/app/api/webhooks/stripe/route.test.ts`
Expected: FAIL — `./route` module does not exist yet.

- [ ] **Step 3: Implement the webhook route**

Create `aamir/src/app/api/webhooks/stripe/route.ts`:

```typescript
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

      await Promise.all(
        productIds.map((id) => writeClient.patch(id).set({ available: false }).commit()),
      );
    } catch (err) {
      console.error("[webhook] failed to record order:", err);
      // Return 500 so Stripe retries — no order was recorded, so a retry is
      // safe and required to not lose the sale record.
      return NextResponse.json({ error: "order-recording-failed" }, { status: 500 });
    }
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd aamir && npx vitest run src/app/api/webhooks/stripe/route.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/webhooks/stripe/route.ts" "src/app/api/webhooks/stripe/route.test.ts"
git commit -m "feat: add Stripe webhook — records orders, marks pieces sold, sends emails"
```

---

### Task 21: Checkout success and cancel pages

**Files:**
- Create: `aamir/src/app/[locale]/checkout/successo/page.tsx`
- Create: `aamir/src/app/[locale]/checkout/annullato/page.tsx`

**Interfaces:**
- Consumes: `checkout.*` i18n keys (Task 9).

Note: these pages are purely informational — the order is already recorded by the webhook (Task 20) independently of whether the customer's browser ever reaches this page.

- [ ] **Step 1: Create the success page**

Create `aamir/src/app/[locale]/checkout/successo/page.tsx`:

```tsx
import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "checkout" });

  return (
    <section className="mx-auto max-w-xl px-6 pt-24 pb-24 text-center">
      <h1 className="font-serif text-4xl mb-6">{t("successTitle")}</h1>
      <p className="text-[color:var(--color-text)]/80 mb-10">{t("successBody")}</p>
      <Link
        href={`/${locale}/collezioni`}
        className="inline-block px-8 py-3 bg-[color:var(--color-primary)] text-white text-sm tracking-wide hover:bg-[color:var(--color-primary-hover)] transition-colors"
      >
        {t("backToShop")}
      </Link>
    </section>
  );
}
```

- [ ] **Step 2: Create the cancel page**

Create `aamir/src/app/[locale]/checkout/annullato/page.tsx`:

```tsx
import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function CheckoutCancelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "checkout" });

  return (
    <section className="mx-auto max-w-xl px-6 pt-24 pb-24 text-center">
      <h1 className="font-serif text-4xl mb-6">{t("cancelTitle")}</h1>
      <p className="text-[color:var(--color-text)]/80 mb-10">{t("cancelBody")}</p>
      <Link
        href={`/${locale}/carrello`}
        className="inline-block px-8 py-3 bg-[color:var(--color-primary)] text-white text-sm tracking-wide hover:bg-[color:var(--color-primary-hover)] transition-colors"
      >
        {t("backToCart")}
      </Link>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd aamir && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/checkout/successo/page.tsx" "src/app/[locale]/checkout/annullato/page.tsx"
git commit -m "feat: add checkout success/cancel pages"
```

---

### Task 22: Terms & Conditions page

**Files:**
- Create: `aamir/src/app/[locale]/termini/page.tsx`
- Modify: `aamir/src/components/Footer.tsx`

**Interfaces:**
- Consumes: `terms.*` i18n keys (Task 9), `getSiteSettings()` (`legalBusinessName`, `vatNumber`, `businessAddress` from Task 4).

This page's structural clauses (14-day EU withdrawal right, generic return/payment/shipping info) are standard and not Aamir-specific, so they're hardcoded content — consistent with how `chi-siamo/page.tsx` hardcodes its fallback text. The business-identifying details (VAT number, legal name, address) are **not** invented — they're pulled from the new `siteSettings` fields and shown with a visible "to complete" placeholder until Aamir fills them in via Studio.

- [ ] **Step 1: Create the terms page**

Create `aamir/src/app/[locale]/termini/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSiteSettings } from "@/sanity/queries";
import type { Locale } from "@/sanity/localize";

const SECTIONS: Record<Locale, { heading: string; body: string }[]> = {
  it: [
    {
      heading: "Chi vende",
      body: "I prodotti sono venduti da",
    },
    {
      heading: "Metodi di pagamento",
      body: "Accettiamo pagamento con carta e i metodi supportati da Stripe (inclusi Apple Pay e Google Pay dove disponibili). Il pagamento avviene su una pagina sicura gestita da Stripe; non conserviamo i dati della tua carta.",
    },
    {
      heading: "Spedizione",
      body: "Spediamo attualmente solo in Italia, con corriere a tariffa fissa indicata al momento del pagamento. I tempi di consegna ti verranno comunicati via email dopo la spedizione.",
    },
    {
      heading: "Diritto di recesso",
      body: "Hai diritto di recedere dal contratto entro 14 giorni dalla ricezione del prodotto, senza dover fornire alcuna motivazione, ai sensi del Codice del Consumo (D.Lgs. 206/2005) e della direttiva 2011/83/UE. Per esercitare il diritto di recesso, contattaci scrivendo all'indirizzo email indicato nella pagina Contatti. Il prodotto dovrà essere restituito integro, nelle condizioni originali. Le spese di restituzione sono a carico del cliente salvo diversamente comunicato.",
    },
    {
      heading: "Rimborsi",
      body: "In caso di recesso valido, il rimborso verrà effettuato con lo stesso metodo di pagamento utilizzato per l'acquisto, entro 14 giorni dalla ricezione del reso.",
    },
  ],
  en: [
    {
      heading: "Who sells",
      body: "Products are sold by",
    },
    {
      heading: "Payment methods",
      body: "We accept card payment and the methods supported by Stripe (including Apple Pay and Google Pay where available). Payment happens on a secure page hosted by Stripe; we never store your card details.",
    },
    {
      heading: "Shipping",
      body: "We currently ship within Italy only, via courier at the flat rate shown at checkout. Delivery times will be communicated by email once your order ships.",
    },
    {
      heading: "Right of withdrawal",
      body: "You have the right to withdraw from this contract within 14 days of receiving the product, without giving any reason, under EU Directive 2011/83/EU. To exercise this right, contact us at the email address listed on the Contact page. The product must be returned intact, in its original condition. Return shipping costs are borne by the customer unless otherwise stated.",
    },
    {
      heading: "Refunds",
      body: "If withdrawal is valid, the refund will be issued using the same payment method as the original purchase, within 14 days of receiving the return.",
    },
  ],
};

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations({ locale, namespace: "terms" });
  const settings = await getSiteSettings();

  const businessName = settings?.legalBusinessName || t("toComplete");
  const vatNumber = settings?.vatNumber || t("toComplete");
  const address = settings?.businessAddress || t("toComplete");

  return (
    <section className="mx-auto max-w-3xl px-6 pt-16 pb-24">
      <h1 className="font-serif text-4xl mb-10">{t("title")}</h1>

      {SECTIONS[l].map((section, i) => (
        <div key={section.heading} className="mb-8">
          <h2 className="font-serif text-xl mb-2">{section.heading}</h2>
          <p className="text-[color:var(--color-text)]/80 leading-relaxed">
            {section.body}
            {i === 0 && ` ${businessName} — P.IVA ${vatNumber} — ${address}.`}
          </p>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Link to the terms page from the footer**

In `aamir/src/components/Footer.tsx`, add a link. Replace the full contents:

```tsx
import { getSiteSettings } from "@/sanity/queries";
import { instagramUrl } from "@/lib/contact";

export async function Footer() {
  const settings = await getSiteSettings();
  const email = settings?.email ?? "info@aamirjewelry.it";
  const ig = settings?.instagram ?? "aamir.jewelry";

  return (
    <footer className="mt-24 border-t border-[color:var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <span className="font-serif text-lg tracking-[0.3em]">AAMIR</span>
        <div className="flex gap-6">
          <a href={`mailto:${email}`} className="hover:text-[color:var(--color-primary)] transition-colors">{email}</a>
          <a href={instagramUrl(ig)} target="_blank" rel="noopener noreferrer" className="hover:text-[color:var(--color-primary)] transition-colors">@{ig}</a>
          <a href="/it/termini" className="hover:text-[color:var(--color-primary)] transition-colors">Termini</a>
        </div>
        <span className="text-[color:var(--color-text)]/70">Salerno, Italia</span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd aamir && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/termini/page.tsx" src/components/Footer.tsx
git commit -m "feat: add Terms and Conditions page (EU withdrawal-right disclosure)"
```

---

### Task 23: README — document the e-commerce setup

**Files:**
- Modify: `aamir/README.md`

- [ ] **Step 1: Replace the file**

Replace the full contents of `aamir/README.md`:

```markdown
# AAMIR — Sito gioielleria

Sito e-commerce (Next.js + Sanity CMS + Stripe). I clienti acquistano i gioielli
online con pagamento tramite Stripe Checkout.

## Requisiti
- Node.js 20+
- Un account Sanity gratuito (https://sanity.io)
- Un account Stripe (https://stripe.com) collegato a un'attività con P.IVA
- Un account Resend (https://resend.com) per le email di conferma ordine

## Configurazione iniziale (una volta sola)
1. `npm install`
2. Crea il progetto Sanity: `npx sanity login` poi `npx sanity init --env .env.local`
   (crea il file `.env.local` con projectId e dataset).
3. Crea un token "Editor" su sanity.io/manage → API → Tokens, aggiungilo in
   `.env.local` come `SANITY_WRITE_TOKEN=...` (serve sia per `npm run seed`
   sia per registrare gli ordini in produzione).
4. Dati di esempio: `npm run seed`.
5. Su dashboard.stripe.com, prendi la chiave segreta (modalità test per
   iniziare) e mettila in `.env.local` come `STRIPE_SECRET_KEY=...`.
6. Con la Stripe CLI (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`)
   ottieni un webhook secret di test e mettilo come `STRIPE_WEBHOOK_SECRET=...`.
7. Su resend.com prendi una API key e mettila come `RESEND_API_KEY=...`.
8. In `/studio` → Impostazioni sito, compila Ragione sociale, Partita IVA e
   Sede legale (compaiono nella pagina Termini e Condizioni pubblica).

## Sviluppo
- `npm run dev` → sito su http://localhost:3000 (redirect a /it)
- Pannello di gestione prodotti e ordini: http://localhost:3000/studio

## Come Aamir aggiunge un gioiello
1. Apri `/studio` e accedi.
2. "Gioiello" → crea nuovo → nome (IT/EN), categoria, immagini (con testo
   alternativo), materiali, descrizione, **prezzo in EUR**. Spunta "In
   evidenza" per mostrarlo in home. Senza prezzo, il pezzo mostra "Prezzo su
   richiesta" e non è acquistabile online.
3. Salva/pubblica. Il sito si aggiorna entro un minuto.

## Come funzionano gli ordini
Quando un cliente paga, un webhook Stripe crea automaticamente un documento
"Ordine" in `/studio`, segna il pezzo acquistato come non più disponibile
(sono pezzi unici), e invia un'email di conferma al cliente e una di
notifica ad Aamir. Aamir aggiorna lo stato dell'ordine a "Spedito" da
`/studio` una volta spedito il pacco.

## Deploy
- Frontend: Render (Web Service, root directory `aamir`, vedi `render.yaml`
  alla radice del repository).
- CMS: già hosted su Sanity. Aggiungi l'URL di produzione ai CORS origins su
  sanity.io/manage → API → CORS.
- Variabili d'ambiente da impostare su Render (oltre a quelle già in uso):
  `SANITY_WRITE_TOKEN`, `STRIPE_SECRET_KEY` (chiave live), `STRIPE_WEBHOOK_SECRET`
  (dal webhook endpoint configurato su dashboard.stripe.com puntato a
  `https://<dominio>/api/webhooks/stripe`), `RESEND_API_KEY`,
  `RESEND_FROM_EMAIL` (da un dominio verificato su Resend),
  `NEXT_PUBLIC_SITE_URL` (URL pubblico del sito, es.
  `https://aamir-y6o6.onrender.com`).
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document the Stripe/Resend e-commerce setup"
```

---

### Task 24: Pre-launch checklist (not code — verify manually)

This task has no automated steps; it's a checklist to run through before
enabling real payments, since some of it (Stripe/Resend account setup,
Render environment variables) cannot be scripted from this repository.

- [ ] Register the Stripe webhook endpoint on dashboard.stripe.com pointing
      to `https://<production-domain>/api/webhooks/stripe`, subscribed to
      `checkout.session.completed`, and copy its signing secret into Render's
      `STRIPE_WEBHOOK_SECRET`.
- [ ] Verify a sending domain on resend.com and set `RESEND_FROM_EMAIL` to an
      address on that domain (the default `onboarding@resend.dev` only works
      for testing).
- [ ] Set all Task 1/23 environment variables on the Render service (`Render
      → aamir → Environment`): `SANITY_WRITE_TOKEN`, `STRIPE_SECRET_KEY`,
      `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
      `NEXT_PUBLIC_SITE_URL`.
- [ ] In `/studio` → Impostazioni sito, fill in `legalBusinessName`,
      `vatNumber`, `businessAddress` — the Terms page shows a visible
      "[Da completare]" placeholder until these are set, and payments should
      not go live with that placeholder showing.
- [ ] Assign a `price` to every product in `/studio` intended to be sellable
      (unpriced products show "Prezzo su richiesta", not a cart button).
- [ ] Run one full purchase in Stripe **test mode** (test card `4242 4242
      4242 4242`, any future expiry/CVC) against the deployed site: add to
      cart → checkout → confirm the order appears in `/studio`, the product
      flips to unavailable, and both emails arrive.
- [ ] Only after the above passes, switch `STRIPE_SECRET_KEY` (and the
      webhook's signing secret, which is per-mode) to the **live** values.

---

## Plan Self-Review

**Spec coverage:**
- Sanity price + order schema → Tasks 2, 3, 5 ✓
- Client-side cart, qty always 1, "Nel carrello" state → Tasks 10, 11, 14 ✓
- Checkout re-verifies price/availability server-side → Task 19 ✓
- Flat-rate Italy-only shipping via Stripe → Task 19 (`shipping_options`, `allowed_countries: ["IT"]`) ✓
- Webhook records order, marks pieces unavailable, sends both emails → Task 20 ✓
- Order visible/manageable in Sanity Studio → Task 3 (default `structureTool` auto-lists every registered document type — no custom desk structure needed) ✓
- Mandatory legal minimum (T&C page, 14-day withdrawal, consent checkbox before payment) → Tasks 18, 22 ✓
- "Richiedi info" replaced by "Aggiungi al carrello"; Instagram stays in header/footer → Tasks 15, 16, 13 ✓
- Error handling: item removed mid-cart (409 flow), payment cancelled (cart intact), webhook retry safety (idempotency check) → Tasks 18, 19, 20 ✓
- Automated tests for cart logic and server-side price/availability checkout logic → Tasks 10, 19 ✓; webhook idempotency also covered → Task 20 ✓
- No fabricated legal/business data → Task 4 (CMS-editable fields with visible placeholder) ✓

**Gaps found and resolved during planning:**
- The existing test suite encoded a "no price field" policy (`schemaTypes.test.ts`, `queries.test.ts`) that directly contradicts this feature — flipped in Task 2 rather than left to break CI.
- Webhook idempotency wasn't in the original spec's error-handling section as an explicit mechanism — added the `stripeSessionId` existence check in Task 20 so Stripe's documented at-least-once delivery can't create duplicate orders.
- `NEXT_PUBLIC_SITE_URL` is required to build absolute Stripe `success_url`/`cancel_url` but wasn't in the spec's env var list — added to Task 1/23.

**Type consistency:** `CartItem` (Task 10) is used identically in `CartProvider`, `CartIcon`, `AddToCartButton`, and `CartPageClient`. `getProductsForCheckout`'s return shape (`_id`, `title`, `price`, `available`) matches what Task 19's route destructures. The webhook's Sanity `order` write matches the `order` schema fields from Task 3 exactly (`stripeSessionId`, `stripePaymentIntentId`, `items`, `total`, `customerEmail`, `shippingAddress`, `status`, `createdAt`).
