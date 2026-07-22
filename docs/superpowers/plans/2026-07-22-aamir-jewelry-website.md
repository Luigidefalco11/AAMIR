# AAMIR Jewelry Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an elegant, self-managed showcase website for AAMIR, an artisan jewelry boutique in Salerno, where the owner can add products (necklaces, bracelets, earrings, rings) via a no-code CMS, with no online checkout.

**Architecture:** Next.js (App Router) frontend renders content from a Sanity CMS. Products and site copy live in Sanity and are edited through an embedded Studio at `/studio`. Pages are statically generated with incremental revalidation. UI chrome is localized (IT/EN) via `next-intl`; content is localized via paired IT/EN fields in Sanity. Animations use GSAP + ScrollTrigger, gated on `prefers-reduced-motion`.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, `next-sanity` + Sanity Studio v3, `next-intl`, GSAP + ScrollTrigger, Vitest + React Testing Library, deployed on Vercel + Sanity hosted.

## Global Constraints

- **No checkout / no payments / no cart** — the site never sells online.
- **No phone number** published anywhere on the site.
- **No visible prices** — policy is "prezzo su richiesta"; there is no price field anywhere.
- **Placeholder content only** in this phase (photos, logo, email, Instagram handle, address). Real values are entered later through the CMS. Use `info@aamirjewelry.it` and `@aamirjewelry` as placeholders.
- **Two locales:** `it` (default) and `en`. Every user-facing string is either a `next-intl` key or a localized Sanity field — never a hardcoded literal in a component.
- **Palette (exact):** bg `#FAF9F6`, surface `#FFFFFF`, text `#14212B`, primary `#1B4B66`, primary-hover `#4A7C95`, gold `#B08D57`, border `#E4E9EC`.
- **Fonts:** Cormorant (serif, headings), Montserrat (sans, body/UI).
- **Categories (fixed set):** Collane/Necklaces, Bracciali/Bracelets, Orecchini/Earrings, Anelli/Rings.
- **Accessibility:** contrast ≥ 4.5:1, keyboard-navigable, mandatory alt text on images, `prefers-reduced-motion` respected.
- **Animations:** only `transform`/`opacity`, 150–300ms micro / 400–600ms reveals.
- **Commit** after every green step. Never use `--no-verify`.

## File Structure

```
aamir/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx              # locale shell: fonts, header, footer, intl provider
│   │   │   ├── page.tsx                # Home
│   │   │   ├── collezioni/
│   │   │   │   ├── page.tsx            # all products, category filter
│   │   │   │   └── [categoria]/
│   │   │   │       ├── page.tsx        # products in one category
│   │   │   │       └── [slug]/page.tsx # product detail (PDP)
│   │   │   ├── chi-siamo/page.tsx
│   │   │   ├── contatti/page.tsx
│   │   │   └── not-found.tsx
│   │   ├── studio/[[...tool]]/page.tsx # embedded Sanity Studio
│   │   ├── layout.tsx                  # root <html>, global css
│   │   └── globals.css
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── LanguageSwitcher.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductGallery.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── RequestInfoButton.tsx
│   │   ├── Reveal.tsx                  # GSAP scroll-reveal wrapper
│   │   └── SafeImage.tsx               # next/image + placeholder fallback
│   ├── i18n/
│   │   ├── routing.ts                  # next-intl routing config
│   │   ├── request.ts                  # next-intl request config
│   │   └── messages/{it,en}.json       # UI chrome strings
│   ├── sanity/
│   │   ├── client.ts                   # sanity client + image url builder
│   │   ├── queries.ts                  # GROQ queries + typed fetchers
│   │   ├── localize.ts                 # pick it/en field helper
│   │   └── env.ts                      # projectId/dataset/apiVersion
│   ├── lib/
│   │   ├── contact.ts                  # mailto builder
│   │   └── categories.ts              # fixed category slugs + labels
│   └── middleware.ts                   # next-intl locale routing
├── sanity/
│   └── schemaTypes/
│       ├── index.ts
│       ├── localeString.ts
│       ├── localeText.ts
│       ├── category.ts
│       ├── product.ts
│       └── siteSettings.ts
├── sanity.config.ts
├── sanity.cli.ts
├── vitest.config.ts
├── vitest.setup.ts
├── next.config.ts
├── tsconfig.json
├── package.json
├── .env.local                          # gitignored
├── .env.example
└── README.md                           # setup + how-to for the owner
```

**Testing strategy:** Logic-bearing units (mailto builder, locale field picker, category helpers, GROQ fetchers, i18n routing, reduced-motion guard) get real Vitest unit tests. Visual pages get a render smoke test (renders without throwing, key text present) plus a manual verification step (`npm run build` passes + browser check at the four breakpoints). We do not attempt pixel-level TDD on layout.

---

### Task 1: Scaffold Next.js + Tailwind + Vitest

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/globals.css`, `vitest.config.ts`, `vitest.setup.ts`, `.gitignore`, `src/lib/sanity-check.ts`
- Test: `src/lib/sanity-check.test.ts`

**Interfaces:**
- Produces: a running Next.js App Router project with Tailwind v4 and a green Vitest run. `npm run dev`, `npm run build`, `npm test` all work.

- [ ] **Step 1: Create the Next.js app non-interactively**

Run from `C:/Users/luigi/Desktop/AAMIR`:
```bash
npx create-next-app@latest aamir --ts --tailwind --app --src-dir --eslint --no-turbopack --import-alias "@/*" --use-npm --yes
```
Expected: a new `aamir/` folder with a Next.js + Tailwind + TypeScript skeleton. Then move into it for all subsequent commands: `cd aamir`.

- [ ] **Step 2: Install test tooling**

```bash
cd aamir
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```
Expected: packages added to devDependencies.

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

Create `vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add the `test` script**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write a failing sanity-check test**

Create `src/lib/sanity-check.ts`:
```ts
export function projectIsWired(): boolean {
  return true;
}
```

Create `src/lib/sanity-check.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { projectIsWired } from "./sanity-check";

describe("project scaffold", () => {
  it("is wired up and test runner works", () => {
    expect(projectIsWired()).toBe(true);
  });
});
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: build completes with no errors.

- [ ] **Step 8: Commit**

```bash
cd ..
git add aamir
git commit -m "chore: scaffold Next.js + Tailwind + Vitest"
```

---

### Task 2: Design tokens, fonts, and global styles

**Files:**
- Modify: `aamir/src/app/globals.css`
- Create: `aamir/src/app/fonts.ts`
- Modify: `aamir/src/app/layout.tsx`

**Interfaces:**
- Produces: CSS custom properties for the full palette, Tailwind v4 `@theme` tokens (`--color-bg`, `--color-primary`, etc.), and two font CSS variables `--font-serif` (Cormorant) and `--font-sans` (Montserrat) available globally.

- [ ] **Step 1: Configure fonts via next/font**

Create `aamir/src/app/fonts.ts`:
```ts
import { Cormorant, Montserrat } from "next/font/google";

export const cormorant = Cormorant({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
```

- [ ] **Step 2: Define theme tokens in globals.css**

Replace the contents of `aamir/src/app/globals.css` with:
```css
@import "tailwindcss";

@theme {
  --color-bg: #faf9f6;
  --color-surface: #ffffff;
  --color-text: #14212b;
  --color-primary: #1b4b66;
  --color-primary-hover: #4a7c95;
  --color-gold: #b08d57;
  --color-border: #e4e9ec;

  --font-serif: var(--font-serif), Georgia, serif;
  --font-sans: var(--font-sans), system-ui, sans-serif;
}

:root {
  color-scheme: light;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4 {
  font-family: var(--font-serif);
  font-weight: 500;
}

a {
  color: inherit;
  text-decoration: none;
}

/* Respect reduced motion at the CSS layer as a baseline */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: Wire fonts into the root layout**

Replace `aamir/src/app/layout.tsx` with:
```tsx
import type { Metadata } from "next";
import { cormorant, montserrat } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "AAMIR — Gioielleria artigianale a Salerno",
  description:
    "Gioielli artigianali lavorati a mano da Aamir a Salerno. Collane, anelli, bracciali e orecchini in pietre preziose.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={`${cormorant.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `cd aamir && npm run build`
Expected: build succeeds, fonts fetched at build time.

- [ ] **Step 5: Commit**

```bash
cd ..
git add aamir
git commit -m "feat: design tokens, palette, and typography"
```

---

### Task 3: Sanity project + schema types

**Files:**
- Create: `aamir/sanity.config.ts`, `aamir/sanity.cli.ts`, `aamir/src/sanity/env.ts`
- Create: `aamir/sanity/schemaTypes/{index,localeString,localeText,category,product,siteSettings}.ts`
- Create: `aamir/.env.example`; modify `aamir/.gitignore`
- Test: `aamir/sanity/schemaTypes/schemaTypes.test.ts`

**Interfaces:**
- Produces:
  - `localeString` / `localeText` object types with fields `it` (string/text) and `en` (string/text).
  - `category` document: `title` (localeString), `slug` (slug, source it), `cover` (image, required alt), `order` (number).
  - `product` document: `title` (localeString), `slug`, `category` (reference→category), `images` (array of image, each with required `alt`), `materials` (localeString), `description` (localeText), `featured` (boolean), `available` (boolean, default true), `order` (number).
  - `siteSettings` document (singleton): `heroTitle` (localeString), `heroSubtitle` (localeText), `aboutText` (localeText), `email` (string), `instagram` (string), `metaDescription` (localeText).
  - `schemaTypes` array exported from `sanity/schemaTypes/index.ts`.

- [ ] **Step 1: Install Sanity deps**

```bash
cd aamir
npm install sanity @sanity/vision next-sanity @sanity/image-url styled-components
```

- [ ] **Step 2: Add env scaffolding**

Create `aamir/src/sanity/env.ts`:
```ts
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-10-01";

export const dataset = assertValue(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  "Missing env var: NEXT_PUBLIC_SANITY_DATASET",
);

export const projectId = assertValue(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  "Missing env var: NEXT_PUBLIC_SANITY_PROJECT_ID",
);

function assertValue<T>(v: T | undefined, errorMessage: string): T {
  if (v === undefined) throw new Error(errorMessage);
  return v;
}
```

Create `aamir/.env.example`:
```
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2024-10-01
```

Append to `aamir/.gitignore`:
```
.env.local
```

- [ ] **Step 3: Write the locale field types**

Create `aamir/sanity/schemaTypes/localeString.ts`:
```ts
import { defineType } from "sanity";

export const localeString = defineType({
  name: "localeString",
  title: "Testo localizzato",
  type: "object",
  fields: [
    { name: "it", title: "Italiano", type: "string" },
    { name: "en", title: "English", type: "string" },
  ],
});
```

Create `aamir/sanity/schemaTypes/localeText.ts`:
```ts
import { defineType } from "sanity";

export const localeText = defineType({
  name: "localeText",
  title: "Testo lungo localizzato",
  type: "object",
  fields: [
    { name: "it", title: "Italiano", type: "text", rows: 4 },
    { name: "en", title: "English", type: "text", rows: 4 },
  ],
});
```

- [ ] **Step 4: Write category and product schemas**

Create `aamir/sanity/schemaTypes/category.ts`:
```ts
import { defineType, defineField } from "sanity";

export const category = defineType({
  name: "category",
  title: "Categoria",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Nome", type: "localeString" }),
    defineField({
      name: "slug",
      title: "Slug (URL)",
      type: "slug",
      options: { source: "title.it", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "cover",
      title: "Immagine di copertina",
      type: "image",
      options: { hotspot: true },
      fields: [
        {
          name: "alt",
          title: "Testo alternativo",
          type: "string",
          validation: (r) => r.required(),
        },
      ],
    }),
    defineField({ name: "order", title: "Ordine", type: "number", initialValue: 0 }),
  ],
  preview: { select: { title: "title.it", media: "cover" } },
});
```

Create `aamir/sanity/schemaTypes/product.ts`:
```ts
import { defineType, defineField } from "sanity";

export const product = defineType({
  name: "product",
  title: "Gioiello",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Nome", type: "localeString" }),
    defineField({
      name: "slug",
      title: "Slug (URL)",
      type: "slug",
      options: { source: "title.it", maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "category",
      title: "Categoria",
      type: "reference",
      to: [{ type: "category" }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: "images",
      title: "Immagini",
      type: "array",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            {
              name: "alt",
              title: "Testo alternativo",
              type: "string",
              validation: (r) => r.required(),
            },
          ],
        },
      ],
    }),
    defineField({ name: "materials", title: "Materiali / pietre", type: "localeString" }),
    defineField({ name: "description", title: "Descrizione", type: "localeText" }),
    defineField({ name: "featured", title: "In evidenza", type: "boolean", initialValue: false }),
    defineField({ name: "available", title: "Disponibile", type: "boolean", initialValue: true }),
    defineField({ name: "order", title: "Ordine", type: "number", initialValue: 0 }),
  ],
  preview: {
    select: { title: "title.it", media: "images.0" },
  },
});
```

- [ ] **Step 5: Write siteSettings schema and the index**

Create `aamir/sanity/schemaTypes/siteSettings.ts`:
```ts
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
  ],
});
```

Create `aamir/sanity/schemaTypes/index.ts`:
```ts
import { localeString } from "./localeString";
import { localeText } from "./localeText";
import { category } from "./category";
import { product } from "./product";
import { siteSettings } from "./siteSettings";

export const schemaTypes = [
  localeString,
  localeText,
  category,
  product,
  siteSettings,
];
```

- [ ] **Step 6: Write a failing schema test**

Create `aamir/sanity/schemaTypes/schemaTypes.test.ts`:
```ts
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
      ]),
    );
  });

  it("product has no price field (price-on-request policy)", () => {
    const product = schemaTypes.find((t) => t.name === "product");
    const fieldNames = (product?.fields ?? []).map((f: { name: string }) => f.name);
    expect(fieldNames).not.toContain("price");
  });
});
```

- [ ] **Step 7: Run the test**

Run: `npm test`
Expected: PASS (both new tests + existing).

- [ ] **Step 8: Add Sanity config and CLI**

Create `aamir/sanity.config.ts`:
```ts
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./sanity/schemaTypes";
import { apiVersion, dataset, projectId } from "./src/sanity/env";

export default defineConfig({
  name: "aamir",
  title: "AAMIR",
  basePath: "/studio",
  projectId,
  dataset,
  plugins: [structureTool(), visionTool({ defaultApiVersion: apiVersion })],
  schema: { types: schemaTypes },
});
```

Create `aamir/sanity.cli.ts`:
```ts
import { defineCliConfig } from "sanity/cli";
import { dataset, projectId } from "./src/sanity/env";

export default defineCliConfig({ api: { projectId, dataset } });
```

- [ ] **Step 9: Create the Sanity project and dataset**

Run (interactive login in a real terminal is required the first time; the maintainer runs this once):
```bash
npx sanity@latest login
npx sanity@latest init --env .env.local --create-project "AAMIR" --dataset production
```
Expected: `.env.local` is written with `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`. **If running non-interactively, skip this step and document it in the README (Task 15); tests do not depend on a live project.**

- [ ] **Step 10: Commit**

```bash
cd ..
git add aamir
git commit -m "feat: sanity schemas for product, category, siteSettings"
```

---

### Task 4: Embedded Studio route

**Files:**
- Create: `aamir/src/app/studio/[[...tool]]/page.tsx`
- Create: `aamir/src/app/studio/[[...tool]]/layout.tsx`
- Modify: `aamir/next.config.ts`

**Interfaces:**
- Consumes: `sanity.config.ts` from Task 3.
- Produces: `/studio` route serving the Sanity Studio.

- [ ] **Step 1: Create the Studio layout (bypasses global styles)**

Create `aamir/src/app/studio/[[...tool]]/layout.tsx`:
```tsx
export const metadata = { title: "AAMIR Studio" };

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

- [ ] **Step 2: Create the Studio page**

Create `aamir/src/app/studio/[[...tool]]/page.tsx`:
```tsx
"use client";

import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";

export const dynamic = "force-static";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
```

- [ ] **Step 3: Allow Studio's styled-components in next config**

Replace `aamir/next.config.ts` with:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
};

export default nextConfig;
```

- [ ] **Step 4: Verify build**

Run: `cd aamir && npm run build`
Expected: build succeeds; `/studio` compiles. (Runtime requires env vars; build must still pass.)

- [ ] **Step 5: Commit**

```bash
cd ..
git add aamir
git commit -m "feat: embedded Sanity Studio at /studio"
```

---

### Task 5: Sanity client, localize helper, and category helpers

**Files:**
- Create: `aamir/src/sanity/client.ts`, `aamir/src/sanity/localize.ts`
- Create: `aamir/src/lib/categories.ts`
- Test: `aamir/src/sanity/localize.test.ts`, `aamir/src/lib/categories.test.ts`

**Interfaces:**
- Produces:
  - `client` (Sanity client), `urlFor(source)` → image URL builder.
  - `type Locale = "it" | "en"`.
  - `localize<T>(field: { it?: T; en?: T } | undefined, locale: Locale): T | ""` — returns the locale value, falling back to `it`, then `""`.
  - `CATEGORY_SLUGS: readonly string[]` = `["collane","bracciali","orecchini","anelli"]`.
  - `isValidCategory(slug: string): boolean`.

- [ ] **Step 1: Write the Sanity client**

Create `aamir/src/sanity/client.ts`:
```ts
import { createClient } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { apiVersion, dataset, projectId } from "./env";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
});

const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}
```

- [ ] **Step 2: Write a failing localize test**

Create `aamir/src/sanity/localize.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { localize } from "./localize";

describe("localize", () => {
  it("returns the requested locale value", () => {
    expect(localize({ it: "Collana", en: "Necklace" }, "en")).toBe("Necklace");
  });
  it("falls back to Italian when the locale value is missing", () => {
    expect(localize({ it: "Collana" }, "en")).toBe("Collana");
  });
  it("returns empty string for undefined field", () => {
    expect(localize(undefined, "it")).toBe("");
  });
});
```

- [ ] **Step 3: Implement localize**

Create `aamir/src/sanity/localize.ts`:
```ts
export type Locale = "it" | "en";

export function localize<T>(
  field: { it?: T; en?: T } | undefined,
  locale: Locale,
): T | "" {
  if (!field) return "";
  return field[locale] ?? field.it ?? "";
}
```

- [ ] **Step 4: Write a failing categories test**

Create `aamir/src/lib/categories.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { CATEGORY_SLUGS, isValidCategory } from "./categories";

describe("categories", () => {
  it("exposes the four fixed category slugs", () => {
    expect(CATEGORY_SLUGS).toEqual(["collane", "bracciali", "orecchini", "anelli"]);
  });
  it("validates known slugs", () => {
    expect(isValidCategory("anelli")).toBe(true);
    expect(isValidCategory("orologi")).toBe(false);
  });
});
```

- [ ] **Step 5: Implement categories**

Create `aamir/src/lib/categories.ts`:
```ts
export const CATEGORY_SLUGS = [
  "collane",
  "bracciali",
  "orecchini",
  "anelli",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export function isValidCategory(slug: string): slug is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(slug);
}
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd ..
git add aamir
git commit -m "feat: sanity client, localize helper, category helpers"
```

---

### Task 6: GROQ queries and typed fetchers

**Files:**
- Create: `aamir/src/sanity/queries.ts`
- Create: `aamir/src/sanity/types.ts`
- Test: `aamir/src/sanity/queries.test.ts`

**Interfaces:**
- Consumes: `client` from Task 5.
- Produces typed shapes and fetchers:
  - `type LocaleField = { it?: string; en?: string }`
  - `type SanityImage = { asset: unknown; alt: string }`
  - `type Product = { _id; title: LocaleField; slug: string; categorySlug: string; images: SanityImage[]; materials: LocaleField; description: LocaleField; available: boolean }`
  - `type Category = { _id; title: LocaleField; slug: string; cover?: SanityImage }`
  - `type SiteSettings = { heroTitle: LocaleField; heroSubtitle: LocaleField; aboutText: LocaleField; email: string; instagram: string; metaDescription: LocaleField }`
  - `getSiteSettings(): Promise<SiteSettings | null>`
  - `getFeaturedProducts(): Promise<Product[]>`
  - `getAllProducts(): Promise<Product[]>`
  - `getProductsByCategory(slug: string): Promise<Product[]>`
  - `getProduct(slug: string): Promise<Product | null>`
  - `getCategories(): Promise<Category[]>`
  - Exported GROQ string constants so they can be unit-tested without a live client.

- [ ] **Step 1: Write shared types**

Create `aamir/src/sanity/types.ts`:
```ts
export type LocaleField = { it?: string; en?: string };

export type SanityImage = { asset: unknown; alt: string };

export type Product = {
  _id: string;
  title: LocaleField;
  slug: string;
  categorySlug: string;
  images: SanityImage[];
  materials: LocaleField;
  description: LocaleField;
  available: boolean;
};

export type Category = {
  _id: string;
  title: LocaleField;
  slug: string;
  cover?: SanityImage;
};

export type SiteSettings = {
  heroTitle: LocaleField;
  heroSubtitle: LocaleField;
  aboutText: LocaleField;
  email: string;
  instagram: string;
  metaDescription: LocaleField;
};
```

- [ ] **Step 2: Write a failing query-constants test**

Create `aamir/src/sanity/queries.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  PRODUCT_PROJECTION,
  productBySlugQuery,
  productsByCategoryQuery,
} from "./queries";

describe("GROQ queries", () => {
  it("projects category slug and never selects a price", () => {
    expect(PRODUCT_PROJECTION).toContain('"categorySlug": category->slug.current');
    expect(PRODUCT_PROJECTION).not.toMatch(/price/i);
  });
  it("product-by-slug query filters on slug param", () => {
    expect(productBySlugQuery).toContain("slug.current == $slug");
  });
  it("products-by-category query filters on category slug param", () => {
    expect(productsByCategoryQuery).toContain("category->slug.current == $slug");
  });
});
```

- [ ] **Step 3: Implement queries and fetchers**

Create `aamir/src/sanity/queries.ts`:
```ts
import { client } from "./client";
import type { Product, Category, SiteSettings } from "./types";

export const PRODUCT_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  "categorySlug": category->slug.current,
  "images": images[]{ asset, alt },
  materials,
  description,
  available
}`;

const CATEGORY_PROJECTION = `{
  _id,
  title,
  "slug": slug.current,
  "cover": cover{ asset, alt }
}`;

export const siteSettingsQuery = `*[_type == "siteSettings"][0]{
  heroTitle, heroSubtitle, aboutText, email, instagram, metaDescription
}`;

export const featuredProductsQuery = `*[_type == "product" && featured == true] | order(order asc) ${PRODUCT_PROJECTION}`;
export const allProductsQuery = `*[_type == "product"] | order(order asc) ${PRODUCT_PROJECTION}`;
export const productsByCategoryQuery = `*[_type == "product" && category->slug.current == $slug] | order(order asc) ${PRODUCT_PROJECTION}`;
export const productBySlugQuery = `*[_type == "product" && slug.current == $slug][0] ${PRODUCT_PROJECTION}`;
export const categoriesQuery = `*[_type == "category"] | order(order asc) ${CATEGORY_PROJECTION}`;

const REVALIDATE = { next: { revalidate: 60 } } as const;

export function getSiteSettings(): Promise<SiteSettings | null> {
  return client.fetch(siteSettingsQuery, {}, REVALIDATE);
}
export function getFeaturedProducts(): Promise<Product[]> {
  return client.fetch(featuredProductsQuery, {}, REVALIDATE);
}
export function getAllProducts(): Promise<Product[]> {
  return client.fetch(allProductsQuery, {}, REVALIDATE);
}
export function getProductsByCategory(slug: string): Promise<Product[]> {
  return client.fetch(productsByCategoryQuery, { slug }, REVALIDATE);
}
export function getProduct(slug: string): Promise<Product | null> {
  return client.fetch(productBySlugQuery, { slug }, REVALIDATE);
}
export function getCategories(): Promise<Category[]> {
  return client.fetch(categoriesQuery, {}, REVALIDATE);
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ..
git add aamir
git commit -m "feat: GROQ queries and typed fetchers"
```

---

### Task 7: Contact mailto builder

**Files:**
- Create: `aamir/src/lib/contact.ts`
- Test: `aamir/src/lib/contact.test.ts`

**Interfaces:**
- Produces: `buildRequestInfoMailto({ email, productName, locale }): string` returning a `mailto:` URL with URL-encoded subject and body. Subject IT: `Richiesta info: <productName>`; EN: `Product enquiry: <productName>`.
- Produces: `instagramUrl(handle: string): string` → `https://instagram.com/<handle>` (strips a leading `@`).

- [ ] **Step 1: Write failing tests**

Create `aamir/src/lib/contact.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildRequestInfoMailto, instagramUrl } from "./contact";

describe("buildRequestInfoMailto", () => {
  it("builds an encoded mailto with the Italian subject", () => {
    const url = buildRequestInfoMailto({
      email: "info@aamirjewelry.it",
      productName: "Collana Onda",
      locale: "it",
    });
    expect(url.startsWith("mailto:info@aamirjewelry.it?")).toBe(true);
    expect(url).toContain("subject=Richiesta%20info%3A%20Collana%20Onda");
  });
  it("uses the English subject for en locale", () => {
    const url = buildRequestInfoMailto({
      email: "info@aamirjewelry.it",
      productName: "Onda Necklace",
      locale: "en",
    });
    expect(url).toContain("subject=Product%20enquiry%3A%20Onda%20Necklace");
  });
});

describe("instagramUrl", () => {
  it("strips a leading @ and builds the profile URL", () => {
    expect(instagramUrl("@aamirjewelry")).toBe("https://instagram.com/aamirjewelry");
  });
  it("works without a leading @", () => {
    expect(instagramUrl("aamirjewelry")).toBe("https://instagram.com/aamirjewelry");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- contact`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `aamir/src/lib/contact.ts`:
```ts
import type { Locale } from "@/sanity/localize";

const SUBJECTS: Record<Locale, string> = {
  it: "Richiesta info",
  en: "Product enquiry",
};

const BODIES: Record<Locale, (name: string) => string> = {
  it: (name) => `Salve, sono interessato/a a questo pezzo: ${name}.`,
  en: (name) => `Hello, I'm interested in this piece: ${name}.`,
};

export function buildRequestInfoMailto({
  email,
  productName,
  locale,
}: {
  email: string;
  productName: string;
  locale: Locale;
}): string {
  const subject = encodeURIComponent(`${SUBJECTS[locale]}: ${productName}`);
  const body = encodeURIComponent(BODIES[locale](productName));
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

export function instagramUrl(handle: string): string {
  const clean = handle.replace(/^@/, "");
  return `https://instagram.com/${clean}`;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- contact`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ..
git add aamir
git commit -m "feat: contact mailto and instagram url builders"
```

---

### Task 8: i18n routing with next-intl

**Files:**
- Create: `aamir/src/i18n/routing.ts`, `aamir/src/i18n/request.ts`
- Create: `aamir/src/i18n/messages/it.json`, `aamir/src/i18n/messages/en.json`
- Create: `aamir/src/middleware.ts`
- Modify: `aamir/next.config.ts`
- Test: `aamir/src/i18n/routing.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `routing` (locales `["it","en"]`, defaultLocale `it`), a middleware that redirects `/` → `/it`, and message catalogs. UI keys used later: `nav.home`, `nav.collections`, `nav.about`, `nav.contact`, `hero.cta`, `product.requestInfo`, `product.unavailable`, `product.materials`, `common.instagram`, `notFound.title`, `notFound.cta`, `collections.all`, `collections.title`, `about.title`, `contact.title`, `contact.intro`, `contact.emailLabel`.

- [ ] **Step 1: Install next-intl**

```bash
cd aamir
npm install next-intl
```

- [ ] **Step 2: Write a failing routing test**

Create `aamir/src/i18n/routing.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { routing } from "./routing";

describe("i18n routing", () => {
  it("supports it and en with it as default", () => {
    expect(routing.locales).toEqual(["it", "en"]);
    expect(routing.defaultLocale).toBe("it");
  });
});
```

- [ ] **Step 3: Implement routing config**

Create `aamir/src/i18n/routing.ts`:
```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["it", "en"],
  defaultLocale: "it",
});
```

- [ ] **Step 4: Implement request config**

Create `aamir/src/i18n/request.ts`:
```ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "it" | "en")) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 5: Create message catalogs**

Create `aamir/src/i18n/messages/it.json`:
```json
{
  "nav": { "home": "Home", "collections": "Collezioni", "about": "Chi Siamo", "contact": "Contatti" },
  "hero": { "cta": "Scopri le collezioni" },
  "collections": { "title": "Collezioni", "all": "Tutti" },
  "product": {
    "requestInfo": "Richiedi info",
    "unavailable": "Non disponibile",
    "materials": "Materiali",
    "backToCollections": "Torna alle collezioni"
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

Create `aamir/src/i18n/messages/en.json`:
```json
{
  "nav": { "home": "Home", "collections": "Collections", "about": "About", "contact": "Contact" },
  "hero": { "cta": "Explore the collections" },
  "collections": { "title": "Collections", "all": "All" },
  "product": {
    "requestInfo": "Request info",
    "unavailable": "Unavailable",
    "materials": "Materials",
    "backToCollections": "Back to collections"
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

- [ ] **Step 6: Create middleware**

Create `aamir/src/middleware.ts`:
```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|studio|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 7: Wire the plugin into next.config**

Replace `aamir/next.config.ts` with:
```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 8: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
cd ..
git add aamir
git commit -m "feat: next-intl i18n routing (it default, en)"
```

---

### Task 9: Reveal animation wrapper and SafeImage

**Files:**
- Create: `aamir/src/components/Reveal.tsx`, `aamir/src/components/SafeImage.tsx`
- Create: `aamir/src/lib/motion.ts`
- Test: `aamir/src/lib/motion.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `prefersReducedMotion(): boolean` — safe in SSR (returns `false` when `window`/`matchMedia` unavailable).
  - `<Reveal>` client component: wraps children, applies a GSAP fade+translateY(24px→0) on scroll into view over 500ms; if `prefersReducedMotion()` is true, renders children visible with no animation.
  - `<SafeImage>`: wraps `next/image`; when `src` is falsy renders a neutral placeholder box with the palette border and a small centered gold monogram; always requires `alt`.

- [ ] **Step 1: Install GSAP**

```bash
cd aamir
npm install gsap
```

- [ ] **Step 2: Write a failing motion test**

Create `aamir/src/lib/motion.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { prefersReducedMotion } from "./motion";

afterEach(() => vi.unstubAllGlobals());

describe("prefersReducedMotion", () => {
  it("returns true when the media query matches", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce"),
      media: q,
    }));
    expect(prefersReducedMotion()).toBe(true);
  });
  it("returns false when matchMedia is unavailable (SSR-safe)", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});
```

- [ ] **Step 3: Implement motion helper**

Create `aamir/src/lib/motion.ts`:
```ts
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- motion`
Expected: PASS.

- [ ] **Step 5: Implement Reveal**

Create `aamir/src/components/Reveal.tsx`:
```tsx
"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        },
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className={className} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Implement SafeImage**

Create `aamir/src/components/SafeImage.tsx`:
```tsx
import Image from "next/image";
import { urlFor } from "@/sanity/client";
import type { SanityImage } from "@/sanity/types";

export function SafeImage({
  image,
  alt,
  sizes,
  priority,
  className,
}: {
  image?: SanityImage | null;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (!image?.asset) {
    return (
      <div
        className={`flex items-center justify-center bg-[color:var(--color-surface)] border border-[color:var(--color-border)] ${className ?? ""}`}
        aria-label={alt}
        role="img"
      >
        <span className="font-serif text-3xl text-[color:var(--color-gold)]">A</span>
      </div>
    );
  }
  const src = urlFor(image).width(1200).auto("format").url();
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? "(max-width: 768px) 100vw, 50vw"}
      priority={priority}
      className={`object-cover ${className ?? ""}`}
    />
  );
}
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
cd ..
git add aamir
git commit -m "feat: Reveal animation wrapper and SafeImage placeholder"
```

---

### Task 10: Header, Footer, LanguageSwitcher, and locale layout

**Files:**
- Create: `aamir/src/components/Header.tsx`, `aamir/src/components/Footer.tsx`, `aamir/src/components/LanguageSwitcher.tsx`
- Create: `aamir/src/app/[locale]/layout.tsx`
- Delete: `aamir/src/app/page.tsx` (replaced by locale route)
- Modify: `aamir/src/app/layout.tsx` (strip `lang` hardcode — moved to locale layout)

**Interfaces:**
- Consumes: `routing` (Task 8), `getSiteSettings` (Task 6), `instagramUrl` (Task 7), `localize` (Task 5).
- Produces: a shared shell with a header (brand wordmark, nav links, language switcher, Instagram link) and footer, wrapping every localized page. Uses `NextIntlClientProvider` + `setRequestLocale`.

- [ ] **Step 1: Language switcher**

Create `aamir/src/components/LanguageSwitcher.tsx`:
```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: "it" | "en") {
    if (next === locale) return;
    const segments = pathname.split("/");
    segments[1] = next; // first segment after leading slash is the locale
    router.push(segments.join("/") || "/");
  }

  return (
    <div className="flex items-center gap-2 text-xs tracking-wide">
      {(["it", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          aria-current={l === locale ? "true" : undefined}
          className={
            l === locale
              ? "text-[color:var(--color-primary)] font-semibold"
              : "text-[color:var(--color-text)]/60 hover:text-[color:var(--color-primary)] transition-colors"
          }
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Header**

Create `aamir/src/components/Header.tsx`:
```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { getSiteSettings } from "@/sanity/queries";
import { instagramUrl } from "@/lib/contact";

export async function Header({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const settings = await getSiteSettings();
  const ig = settings?.instagram ?? "aamirjewelry";
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
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Footer**

Create `aamir/src/components/Footer.tsx`:
```tsx
import { getSiteSettings } from "@/sanity/queries";
import { instagramUrl } from "@/lib/contact";

export async function Footer() {
  const settings = await getSiteSettings();
  const email = settings?.email ?? "info@aamirjewelry.it";
  const ig = settings?.instagram ?? "aamirjewelry";

  return (
    <footer className="mt-24 border-t border-[color:var(--color-border)]">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <span className="font-serif text-lg tracking-[0.3em]">AAMIR</span>
        <div className="flex gap-6">
          <a href={`mailto:${email}`} className="hover:text-[color:var(--color-primary)] transition-colors">{email}</a>
          <a href={instagramUrl(ig)} target="_blank" rel="noopener noreferrer" className="hover:text-[color:var(--color-primary)] transition-colors">@{ig}</a>
        </div>
        <span className="text-[color:var(--color-text)]/50">Salerno, Italia</span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Locale layout**

Delete the default home page so the locale route owns `/`:
```bash
cd aamir && rm src/app/page.tsx
```

Create `aamir/src/app/[locale]/layout.tsx`:
```tsx
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

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
      <Header locale={locale} />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 5: Simplify the root layout**

Replace `aamir/src/app/layout.tsx` with:
```tsx
import type { Metadata } from "next";
import { cormorant, montserrat } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "AAMIR — Gioielleria artigianale a Salerno",
  description:
    "Gioielli artigianali lavorati a mano da Aamir a Salerno. Collane, anelli, bracciali e orecchini in pietre preziose.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={`${cormorant.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: build succeeds; `/it` and `/en` static params generated.

- [ ] **Step 7: Commit**

```bash
cd ..
git add aamir
git commit -m "feat: header, footer, language switcher, locale layout"
```

---

### Task 11: ProductCard and Home page

**Files:**
- Create: `aamir/src/components/ProductCard.tsx`
- Create: `aamir/src/app/[locale]/page.tsx`
- Test: `aamir/src/components/ProductCard.test.tsx`

**Interfaces:**
- Consumes: `Product` (Task 6), `localize` (Task 5), `SafeImage` (Task 9), `getFeaturedProducts`/`getSiteSettings` (Task 6), `Reveal` (Task 9).
- Produces: `<ProductCard product locale>` linking to `/[locale]/collezioni/[categorySlug]/[slug]`, showing image + localized title + localized materials; and the Home page.

- [ ] **Step 1: Write a failing ProductCard test**

Create `aamir/src/components/ProductCard.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/sanity/types";

vi.mock("@/sanity/client", () => ({
  urlFor: () => ({ width: () => ({ auto: () => ({ url: () => "https://cdn.sanity.io/x.jpg" }) }) }),
}));

const product: Product = {
  _id: "1",
  title: { it: "Collana Onda", en: "Onda Necklace" },
  slug: "collana-onda",
  categorySlug: "collane",
  images: [{ asset: { _ref: "image-1" }, alt: "Collana" }],
  materials: { it: "Oro 18k", en: "18k gold" },
  description: { it: "", en: "" },
  available: true,
};

describe("ProductCard", () => {
  it("renders the localized title and links to the PDP", () => {
    render(<ProductCard product={product} locale="en" />);
    expect(screen.getByText("Onda Necklace")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/en/collezioni/collane/collana-onda");
  });
});
```

- [ ] **Step 2: Implement ProductCard**

Create `aamir/src/components/ProductCard.tsx`:
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
      {materials && <p className="text-sm text-[color:var(--color-text)]/60">{materials}</p>}
    </Link>
  );
}
```

- [ ] **Step 3: Run the test**

Run: `npm test -- ProductCard`
Expected: PASS.

- [ ] **Step 4: Implement the Home page**

Create `aamir/src/app/[locale]/page.tsx`:
```tsx
import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/Reveal";
import { ProductCard } from "@/components/ProductCard";
import { SafeImage } from "@/components/SafeImage";
import { getFeaturedProducts, getSiteSettings } from "@/sanity/queries";
import { localize, type Locale } from "@/sanity/localize";

const HERO_FALLBACK = {
  it: { title: "Gioielli lavorati a mano a Salerno", subtitle: "Pietre preziose, forma e precisione. Ogni pezzo nasce dalle mani di Aamir." },
  en: { title: "Handcrafted jewelry in Salerno", subtitle: "Precious stones, form and precision. Every piece is made by Aamir's hands." },
};

const ABOUT_FALLBACK = {
  it: "Aamir lavora l'oreficeria da oltre dieci anni, qui in Italia. Seleziona e lavora pietre preziose con la precisione di chi conosce il mestiere fino in fondo, trasformandole a mano in collane, anelli, bracciali e orecchini. Nessuna produzione in serie: solo la ricerca costante di equilibrio, forma e qualità, a pochi passi dal mare di Salerno.",
  en: "Aamir has worked in goldsmithing for over ten years, here in Italy. He selects and works precious stones with the precision of a true master of the craft, shaping them by hand into necklaces, rings, bracelets and earrings. No mass production: only a constant pursuit of balance, form and quality, steps away from the sea of Salerno.",
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations({ locale, namespace: "hero" });
  const tc = await getTranslations({ locale, namespace: "collections" });
  const [featured, settings] = await Promise.all([
    getFeaturedProducts(),
    getSiteSettings(),
  ]);

  const heroTitle = localize(settings?.heroTitle, l) || HERO_FALLBACK[l].title;
  const heroSubtitle = localize(settings?.heroSubtitle, l) || HERO_FALLBACK[l].subtitle;
  const about = localize(settings?.aboutText, l) || ABOUT_FALLBACK[l];

  return (
    <>
      <section className="mx-auto max-w-7xl px-6 pt-16 md:pt-24 grid md:grid-cols-2 gap-10 items-center">
        <Reveal>
          <h1 className="font-serif text-4xl md:text-6xl leading-tight">{heroTitle}</h1>
          <p className="mt-6 text-lg text-[color:var(--color-text)]/70 max-w-md">{heroSubtitle}</p>
          <Link
            href={`/${locale}/collezioni`}
            className="inline-block mt-8 px-6 py-3 bg-[color:var(--color-primary)] text-white text-sm tracking-wide hover:bg-[color:var(--color-primary-hover)] transition-colors"
          >
            {t("cta")}
          </Link>
        </Reveal>
        <Reveal>
          <div className="relative aspect-[4/5] w-full">
            <SafeImage image={featured[0]?.images?.[0]} alt={heroTitle} sizes="(max-width: 768px) 100vw, 50vw" priority />
          </div>
        </Reveal>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 mt-24">
          <Reveal>
            <h2 className="font-serif text-3xl mb-10">{tc("title")}</h2>
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {featured.slice(0, 6).map((p) => (
              <Reveal key={p._id}>
                <ProductCard product={p} locale={l} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-3xl px-6 mt-28 text-center">
        <Reveal>
          <p className="font-serif text-2xl md:text-3xl leading-relaxed text-[color:var(--color-text)]/85">{about}</p>
        </Reveal>
      </section>
    </>
  );
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
cd ..
git add aamir
git commit -m "feat: ProductCard and Home page"
```

---

### Task 12: Collections index + category page + CategoryFilter

**Files:**
- Create: `aamir/src/components/CategoryFilter.tsx`
- Create: `aamir/src/app/[locale]/collezioni/page.tsx`
- Create: `aamir/src/app/[locale]/collezioni/[categoria]/page.tsx`
- Test: `aamir/src/components/CategoryFilter.test.tsx`

**Interfaces:**
- Consumes: `CATEGORY_SLUGS`/`isValidCategory` (Task 5), `getAllProducts`/`getProductsByCategory`/`getCategories` (Task 6), `ProductCard`, `Reveal`.
- Produces: a filter row (All + four categories) as links, the all-products grid, and a per-category grid. Invalid category slug → `notFound()`.

- [ ] **Step 1: Write a failing CategoryFilter test**

Create `aamir/src/components/CategoryFilter.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryFilter } from "./CategoryFilter";

describe("CategoryFilter", () => {
  it("renders All plus the four categories with correct hrefs", () => {
    render(
      <CategoryFilter
        locale="it"
        active={null}
        labels={{ all: "Tutti", collane: "Collane", bracciali: "Bracciali", orecchini: "Orecchini", anelli: "Anelli" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Tutti" })).toHaveAttribute("href", "/it/collezioni");
    expect(screen.getByRole("link", { name: "Anelli" })).toHaveAttribute("href", "/it/collezioni/anelli");
  });
});
```

- [ ] **Step 2: Implement CategoryFilter**

Create `aamir/src/components/CategoryFilter.tsx`:
```tsx
import Link from "next/link";
import { CATEGORY_SLUGS } from "@/lib/categories";

export function CategoryFilter({
  locale,
  active,
  labels,
}: {
  locale: string;
  active: string | null;
  labels: Record<string, string>;
}) {
  const base = `/${locale}/collezioni`;
  const linkCls = (isActive: boolean) =>
    `text-sm tracking-wide pb-1 border-b-2 transition-colors ${
      isActive
        ? "border-[color:var(--color-primary)] text-[color:var(--color-primary)]"
        : "border-transparent text-[color:var(--color-text)]/60 hover:text-[color:var(--color-primary)]"
    }`;

  return (
    <div className="flex flex-wrap gap-6 mb-12">
      <Link href={base} className={linkCls(active === null)}>{labels.all}</Link>
      {CATEGORY_SLUGS.map((slug) => (
        <Link key={slug} href={`${base}/${slug}`} className={linkCls(active === slug)}>
          {labels[slug]}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Run the test**

Run: `npm test -- CategoryFilter`
Expected: PASS.

- [ ] **Step 4: Category labels helper (localized, from message catalog)**

Add to `aamir/src/i18n/messages/it.json` under a new `categories` key:
```json
"categories": { "collane": "Collane", "bracciali": "Bracciali", "orecchini": "Orecchini", "anelli": "Anelli" }
```
Add to `aamir/src/i18n/messages/en.json`:
```json
"categories": { "collane": "Necklaces", "bracciali": "Bracelets", "orecchini": "Earrings", "anelli": "Rings" }
```

- [ ] **Step 5: Collections index page**

Create `aamir/src/app/[locale]/collezioni/page.tsx`:
```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/Reveal";
import { ProductCard } from "@/components/ProductCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { getAllProducts } from "@/sanity/queries";
import { type Locale } from "@/sanity/localize";
import { CATEGORY_SLUGS } from "@/lib/categories";

export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations({ locale, namespace: "collections" });
  const tcat = await getTranslations({ locale, namespace: "categories" });
  const products = await getAllProducts();

  const labels: Record<string, string> = { all: t("all") };
  CATEGORY_SLUGS.forEach((s) => (labels[s] = tcat(s)));

  return (
    <section className="mx-auto max-w-7xl px-6 pt-16">
      <h1 className="font-serif text-4xl mb-10">{t("title")}</h1>
      <CategoryFilter locale={locale} active={null} labels={labels} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
        {products.map((p) => (
          <Reveal key={p._id}>
            <ProductCard product={p} locale={l} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Category page**

Create `aamir/src/app/[locale]/collezioni/[categoria]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/Reveal";
import { ProductCard } from "@/components/ProductCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { getProductsByCategory } from "@/sanity/queries";
import { type Locale } from "@/sanity/localize";
import { CATEGORY_SLUGS, isValidCategory } from "@/lib/categories";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    CATEGORY_SLUGS.map((categoria) => ({ locale, categoria })),
  );
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; categoria: string }>;
}) {
  const { locale, categoria } = await params;
  if (!isValidCategory(categoria)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations({ locale, namespace: "collections" });
  const tcat = await getTranslations({ locale, namespace: "categories" });
  const products = await getProductsByCategory(categoria);

  const labels: Record<string, string> = { all: t("all") };
  CATEGORY_SLUGS.forEach((s) => (labels[s] = tcat(s)));

  return (
    <section className="mx-auto max-w-7xl px-6 pt-16">
      <h1 className="font-serif text-4xl mb-10">{tcat(categoria)}</h1>
      <CategoryFilter locale={locale} active={categoria} labels={labels} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
        {products.map((p) => (
          <Reveal key={p._id}>
            <ProductCard product={p} locale={l} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Run tests + build**

Run: `npm test && npm run build`
Expected: PASS + build succeeds.

- [ ] **Step 8: Commit**

```bash
cd ..
git add aamir
git commit -m "feat: collections index and category pages with filter"
```

---

### Task 13: ProductGallery, RequestInfoButton, and PDP

**Files:**
- Create: `aamir/src/components/ProductGallery.tsx`, `aamir/src/components/RequestInfoButton.tsx`
- Create: `aamir/src/app/[locale]/collezioni/[categoria]/[slug]/page.tsx`
- Test: `aamir/src/components/RequestInfoButton.test.tsx`

**Interfaces:**
- Consumes: `getProduct`/`getAllProducts`/`getSiteSettings` (Task 6), `buildRequestInfoMailto`/`instagramUrl` (Task 7), `SafeImage`, `localize`.
- Produces: a two-column PDP (gallery left, details right) with materials, description, a "Richiedi info" mailto button and an Instagram link. Unknown slug → `notFound()`. No price anywhere.

- [ ] **Step 1: Write a failing RequestInfoButton test**

Create `aamir/src/components/RequestInfoButton.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RequestInfoButton } from "./RequestInfoButton";

describe("RequestInfoButton", () => {
  it("renders a mailto link with the encoded product name", () => {
    render(
      <RequestInfoButton email="info@aamirjewelry.it" productName="Collana Onda" locale="it" label="Richiedi info" />,
    );
    const link = screen.getByRole("link", { name: "Richiedi info" });
    expect(link.getAttribute("href")).toContain("mailto:info@aamirjewelry.it");
    expect(link.getAttribute("href")).toContain("Collana%20Onda");
  });
});
```

- [ ] **Step 2: Implement RequestInfoButton**

Create `aamir/src/components/RequestInfoButton.tsx`:
```tsx
import { buildRequestInfoMailto } from "@/lib/contact";
import type { Locale } from "@/sanity/localize";

export function RequestInfoButton({
  email,
  productName,
  locale,
  label,
}: {
  email: string;
  productName: string;
  locale: Locale;
  label: string;
}) {
  const href = buildRequestInfoMailto({ email, productName, locale });
  return (
    <a
      href={href}
      className="inline-block px-8 py-3 bg-[color:var(--color-primary)] text-white text-sm tracking-wide hover:bg-[color:var(--color-primary-hover)] transition-colors"
    >
      {label}
    </a>
  );
}
```

- [ ] **Step 3: Run the test**

Run: `npm test -- RequestInfoButton`
Expected: PASS.

- [ ] **Step 4: Implement ProductGallery**

Create `aamir/src/components/ProductGallery.tsx`:
```tsx
"use client";

import { useState } from "react";
import { SafeImage } from "./SafeImage";
import type { SanityImage } from "@/sanity/types";

export function ProductGallery({
  images,
  title,
}: {
  images: SanityImage[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const current = images?.[active];

  return (
    <div>
      <div className="relative aspect-[4/5] w-full bg-[color:var(--color-surface)]">
        <SafeImage image={current} alt={current?.alt || title} sizes="(max-width: 768px) 100vw, 50vw" priority />
      </div>
      {images?.length > 1 && (
        <div className="mt-4 flex gap-3">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`${title} — ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              className={`relative w-20 h-24 bg-[color:var(--color-surface)] border ${
                i === active ? "border-[color:var(--color-primary)]" : "border-[color:var(--color-border)]"
              }`}
            >
              <SafeImage image={img} alt={img.alt} sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Implement the PDP**

Create `aamir/src/app/[locale]/collezioni/[categoria]/[slug]/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ProductGallery } from "@/components/ProductGallery";
import { RequestInfoButton } from "@/components/RequestInfoButton";
import { getProduct, getAllProducts, getSiteSettings } from "@/sanity/queries";
import { localize, type Locale } from "@/sanity/localize";
import { instagramUrl } from "@/lib/contact";

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.flatMap((p) =>
    ["it", "en"].map((locale) => ({
      locale,
      categoria: p.categorySlug,
      slug: p.slug,
    })),
  );
}

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
  const email = settings?.email ?? "info@aamirjewelry.it";
  const ig = settings?.instagram ?? "aamirjewelry";

  return (
    <section className="mx-auto max-w-7xl px-6 pt-12 grid md:grid-cols-2 gap-12">
      <ProductGallery images={product.images ?? []} title={title} />

      <div className="md:pt-8">
        <Link href={`/${locale}/collezioni`} className="text-sm text-[color:var(--color-text)]/60 hover:text-[color:var(--color-primary)] transition-colors">
          ← {t("backToCollections")}
        </Link>
        <h1 className="font-serif text-4xl mt-4">{title}</h1>

        {materials && (
          <p className="mt-6">
            <span className="block text-xs uppercase tracking-widest text-[color:var(--color-text)]/50">{t("materials")}</span>
            <span className="text-lg">{materials}</span>
          </p>
        )}

        {description && (
          <p className="mt-6 leading-relaxed text-[color:var(--color-text)]/80 max-w-prose">{description}</p>
        )}

        <div className="mt-10 flex items-center gap-6">
          {product.available ? (
            <RequestInfoButton email={email} productName={title} locale={l} label={t("requestInfo")} />
          ) : (
            <span className="text-sm text-[color:var(--color-text)]/50">{t("unavailable")}</span>
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

- [ ] **Step 6: Run tests + build**

Run: `npm test && npm run build`
Expected: PASS + build succeeds.

- [ ] **Step 7: Commit**

```bash
cd ..
git add aamir
git commit -m "feat: product detail page with gallery and request-info flow"
```

---

### Task 14: Chi Siamo, Contatti, and not-found pages

**Files:**
- Create: `aamir/src/app/[locale]/chi-siamo/page.tsx`
- Create: `aamir/src/app/[locale]/contatti/page.tsx`
- Create: `aamir/src/app/[locale]/not-found.tsx`
- Modify: `aamir/src/app/layout.tsx` is not touched; ensure a global `not-found` exists too via `aamir/src/app/not-found.tsx`

**Interfaces:**
- Consumes: `getSiteSettings` (Task 6), `localize`, `instagramUrl`, translations.
- Produces: About page (uses `aboutText` with the approved fallback), Contact page (email + Instagram, generic Salerno reference, no phone, no exact address), and a branded 404.

- [ ] **Step 1: Chi Siamo page**

Create `aamir/src/app/[locale]/chi-siamo/page.tsx`:
```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/Reveal";
import { getSiteSettings } from "@/sanity/queries";
import { localize, type Locale } from "@/sanity/localize";

const ABOUT_FALLBACK = {
  it: "Aamir lavora l'oreficeria da oltre dieci anni, qui in Italia. Seleziona e lavora pietre preziose con la precisione di chi conosce il mestiere fino in fondo, trasformandole a mano in collane, anelli, bracciali e orecchini. Nessuna produzione in serie: solo la ricerca costante di equilibrio, forma e qualità, a pochi passi dal mare di Salerno.",
  en: "Aamir has worked in goldsmithing for over ten years, here in Italy. He selects and works precious stones with the precision of a true master of the craft, shaping them by hand into necklaces, rings, bracelets and earrings. No mass production: only a constant pursuit of balance, form and quality, steps away from the sea of Salerno.",
};

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations({ locale, namespace: "about" });
  const settings = await getSiteSettings();
  const about = localize(settings?.aboutText, l) || ABOUT_FALLBACK[l];

  return (
    <section className="mx-auto max-w-3xl px-6 pt-16">
      <Reveal>
        <h1 className="font-serif text-4xl md:text-5xl mb-10">{t("title")}</h1>
      </Reveal>
      <Reveal>
        <p className="text-lg md:text-xl leading-relaxed text-[color:var(--color-text)]/85">{about}</p>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 2: Contatti page**

Create `aamir/src/app/[locale]/contatti/page.tsx`:
```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/Reveal";
import { getSiteSettings } from "@/sanity/queries";
import { instagramUrl } from "@/lib/contact";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "contact" });
  const settings = await getSiteSettings();
  const email = settings?.email ?? "info@aamirjewelry.it";
  const ig = settings?.instagram ?? "aamirjewelry";

  return (
    <section className="mx-auto max-w-2xl px-6 pt-16 text-center">
      <Reveal>
        <h1 className="font-serif text-4xl md:text-5xl mb-6">{t("title")}</h1>
        <p className="text-[color:var(--color-text)]/70 mb-12">{t("intro")}</p>
      </Reveal>
      <Reveal>
        <div className="space-y-6">
          <div>
            <span className="block text-xs uppercase tracking-widest text-[color:var(--color-text)]/50 mb-1">{t("emailLabel")}</span>
            <a href={`mailto:${email}`} className="text-lg hover:text-[color:var(--color-primary)] transition-colors">{email}</a>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-widest text-[color:var(--color-text)]/50 mb-1">Instagram</span>
            <a href={instagramUrl(ig)} target="_blank" rel="noopener noreferrer" className="text-lg hover:text-[color:var(--color-primary)] transition-colors">@{ig}</a>
          </div>
          <p className="pt-6 text-[color:var(--color-text)]/60">Salerno, Italia</p>
        </div>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 3: Localized not-found**

Create `aamir/src/app/[locale]/not-found.tsx`:
```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  // This segment renders under the default locale when a localized route misses.
  const t = await getTranslations({ locale: "it", namespace: "notFound" });
  return (
    <section className="mx-auto max-w-xl px-6 py-32 text-center">
      <h1 className="font-serif text-5xl mb-6">404</h1>
      <p className="text-lg text-[color:var(--color-text)]/70 mb-8">{t("title")}</p>
      <Link href="/it" className="px-6 py-3 bg-[color:var(--color-primary)] text-white text-sm hover:bg-[color:var(--color-primary-hover)] transition-colors">
        {t("cta")}
      </Link>
    </section>
  );
}
```

Create a global fallback `aamir/src/app/not-found.tsx`:
```tsx
import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <html lang="it">
      <body style={{ fontFamily: "Georgia, serif", textAlign: "center", padding: "8rem 1.5rem", background: "#faf9f6", color: "#14212b" }}>
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>404</h1>
        <p style={{ marginBottom: "2rem" }}>Pagina non trovata / Page not found</p>
        <Link href="/it" style={{ color: "#1b4b66" }}>AAMIR</Link>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Run tests + build**

Run: `npm test && npm run build`
Expected: PASS + build succeeds.

- [ ] **Step 5: Commit**

```bash
cd ..
git add aamir
git commit -m "feat: about, contact, and 404 pages"
```

---

### Task 15: Seed data, QA pass, and owner README

**Files:**
- Create: `aamir/scripts/seed.ts`
- Create: `aamir/README.md`
- Create: `aamir/.env.example` already exists — verify
- Modify: none functional

**Interfaces:**
- Consumes: everything.
- Produces: a documented way to run the site locally, a seed script that creates the four categories + a few sample products + siteSettings (for local visual QA), and a QA checklist executed once.

- [ ] **Step 1: Seed script**

Create `aamir/scripts/seed.ts`:
```ts
import { createClient } from "@sanity/client";
import { config } from "dotenv";
config({ path: ".env.local" });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: "2024-10-01",
  token: process.env.SANITY_WRITE_TOKEN!, // create in sanity.io/manage → API → Tokens (Editor)
  useCdn: false,
});

const CATEGORIES = [
  { slug: "collane", it: "Collane", en: "Necklaces" },
  { slug: "bracciali", it: "Bracciali", en: "Bracelets" },
  { slug: "orecchini", it: "Orecchini", en: "Earrings" },
  { slug: "anelli", it: "Anelli", en: "Rings" },
];

async function run() {
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    await client.createOrReplace({
      _id: `category-${c.slug}`,
      _type: "category",
      title: { it: c.it, en: c.en },
      slug: { current: c.slug },
      order: i,
    });
  }

  await client.createOrReplace({
    _id: "siteSettings",
    _type: "siteSettings",
    heroTitle: { it: "Gioielli lavorati a mano a Salerno", en: "Handcrafted jewelry in Salerno" },
    heroSubtitle: { it: "Pietre preziose, forma e precisione.", en: "Precious stones, form and precision." },
    aboutText: {
      it: "Aamir lavora l'oreficeria da oltre dieci anni, qui in Italia. Seleziona e lavora pietre preziose con la precisione di chi conosce il mestiere fino in fondo, trasformandole a mano in collane, anelli, bracciali e orecchini. Nessuna produzione in serie: solo la ricerca costante di equilibrio, forma e qualità, a pochi passi dal mare di Salerno.",
      en: "Aamir has worked in goldsmithing for over ten years, here in Italy.",
    },
    email: "info@aamirjewelry.it",
    instagram: "aamirjewelry",
    metaDescription: { it: "Gioielleria artigianale a Salerno.", en: "Artisan jewelry in Salerno." },
  });

  // sample products (no images — SafeImage placeholder will render)
  const samples = [
    { slug: "collana-onda", cat: "collane", it: "Collana Onda", en: "Onda Necklace", featured: true },
    { slug: "anello-scoglio", cat: "anelli", it: "Anello Scoglio", en: "Scoglio Ring", featured: true },
    { slug: "orecchini-riva", cat: "orecchini", it: "Orecchini Riva", en: "Riva Earrings", featured: true },
  ];
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    await client.createOrReplace({
      _id: `product-${s.slug}`,
      _type: "product",
      title: { it: s.it, en: s.en },
      slug: { current: s.slug },
      category: { _type: "reference", _ref: `category-${s.cat}` },
      materials: { it: "Oro 18k, pietra naturale", en: "18k gold, natural stone" },
      description: { it: "Pezzo unico lavorato a mano.", en: "Unique handcrafted piece." },
      featured: s.featured,
      available: true,
      order: i,
    });
  }

  console.log("Seed complete.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Add seed deps and script**

```bash
cd aamir
npm install -D dotenv tsx
```
Add to `package.json` scripts:
```json
"seed": "tsx scripts/seed.ts"
```

- [ ] **Step 3: Owner README**

Create `aamir/README.md`:
```markdown
# AAMIR — Sito gioielleria

Sito vetrina (Next.js + Sanity CMS). Nessun pagamento online: i clienti richiedono
informazioni via email o Instagram.

## Requisiti
- Node.js 20+
- Un account Sanity gratuito (https://sanity.io)

## Configurazione iniziale (una volta sola)
1. `npm install`
2. Crea il progetto Sanity: `npx sanity login` poi `npx sanity init --env .env.local`
   (crea il file `.env.local` con projectId e dataset).
3. (Opzionale) Dati di esempio: crea un token "Editor" su sanity.io/manage,
   aggiungilo in `.env.local` come `SANITY_WRITE_TOKEN=...`, poi `npm run seed`.

## Sviluppo
- `npm run dev` → sito su http://localhost:3000 (redirect a /it)
- Pannello di gestione prodotti: http://localhost:3000/studio

## Come Aamir aggiunge un gioiello
1. Apri `/studio` e accedi.
2. "Gioiello" → crea nuovo → nome (IT/EN), categoria, immagini (con testo
   alternativo), materiali, descrizione. Spunta "In evidenza" per mostrarlo in home.
3. Salva/pubblica. Il sito si aggiorna entro un minuto.

## Deploy
- Frontend: Vercel (importa il repo, aggiungi le stesse variabili `.env.local`).
- CMS: già hosted su Sanity. Aggiungi l'URL di produzione ai CORS origins su
  sanity.io/manage → API → CORS.
```

- [ ] **Step 4: Full test suite**

Run: `npm test`
Expected: PASS (all unit tests).

- [ ] **Step 5: Production build + manual QA**

Run: `npm run build && npm run start`
Then manually verify (record results in the commit message):
- `/` redirects to `/it`; `/en` works; language switcher swaps locale and keeps the path.
- Home hero, featured grid, about text render (placeholders where no image).
- `/it/collezioni` shows all; category tabs filter; `/it/collezioni/orologi` → 404.
- A product page shows gallery + materials + "Richiedi info" (opens mail client with the piece name) + Instagram link. No price anywhere.
- Chi Siamo and Contatti render; no phone number present.
- Resize to 375 / 768 / 1024 / 1440px: no horizontal scroll.
- Keyboard: Tab reaches nav, filter, gallery thumbnails, request-info button; focus visible.
- DevTools → Rendering → emulate `prefers-reduced-motion: reduce`: content appears without motion.
- Lighthouse (mobile) on `/it`: Performance and Accessibility ≥ 90.

- [ ] **Step 6: Commit**

```bash
cd ..
git add aamir
git commit -m "feat: seed script, owner README, QA pass"
```

---

## Self-Review

**Spec coverage:**
- Sitemap (Home, Collezioni, Category, PDP, Chi Siamo, Contatti, /studio) → Tasks 4, 10–14. ✓
- Sanity schemas (product/category/siteSettings, localized, no price) → Task 3. ✓
- No checkout / no phone / no price → enforced in Tasks 3 (schema test asserts no `price`), 13, 14. ✓
- Placeholder content + fallbacks → SafeImage (Task 9), fallback copy in Tasks 11/14. ✓
- IT/EN i18n (default it, redirect, localized fields + UI strings) → Tasks 5, 8, 10. ✓
- Palette + typography → Task 2. ✓
- GSAP reveals + prefers-reduced-motion → Task 9, CSS baseline Task 2. ✓
- Contact via mailto + Instagram, no telephone → Task 7 + 13 + 14. ✓
- Performance/responsive (next/image, Sanity CDN, CLS, breakpoints) → Tasks 4/9/15. ✓
- Error handling (404, missing-image placeholder, ISR fallback) → Tasks 9 (SafeImage), 14 (404), 6 (`revalidate: 60`). ✓
- Deploy (Vercel + Sanity) → Task 15 README. ✓
- QA checklist → Task 15. ✓

**Placeholder scan:** No "TBD"/"TODO"/"handle edge cases" left; every code step has full code. Task 3 Step 9 (live Sanity init) is explicitly marked skippable for non-interactive runs and documented in the README — not a code placeholder.

**Type consistency:** `Product`/`Category`/`SiteSettings`/`LocaleField`/`SanityImage` defined once in Task 6 `types.ts` and imported everywhere. `Locale` defined in Task 5 `localize.ts` and reused. `localize()`, `buildRequestInfoMailto()`, `instagramUrl()`, `CATEGORY_SLUGS`, `isValidCategory()`, `prefersReducedMotion()` signatures are stable across all consumers. Category slugs (`collane/bracciali/orecchini/anelli`) consistent between `categories.ts`, message catalogs, and generateStaticParams.
