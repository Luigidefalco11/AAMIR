# 3D Scroll Motion + Craft Video Section — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the product photos already on the AAMIR site rotate in real 3D as the page scrolls, and add a homepage section showing Aamir at work via a looping video.

**Architecture:** A single new client component, `Tilt3D`, wraps an image (or video) in a CSS `perspective` stage and drives `rotateX`/`rotateY` on its inner element with GSAP ScrollTrigger (scrubbed to scroll position), plus a mouse-follow tilt. It replaces the existing `Float`/`Parallax` components (which only did vertical translation) everywhere they're used — the homepage hero and, newly, the product grid and a new "La Lavorazione" (craft) section. The craft section adds a muted, looping, portrait video of Aamir at work, using an already-provided source clip.

**Tech Stack:** Next.js 16 (App Router), React 19, GSAP 3 + ScrollTrigger (already a dependency), Tailwind CSS 4, next-intl, Vitest + Testing Library.

## Global Constraints

- No new dependencies — GSAP + ScrollTrigger are already installed and used elsewhere in the codebase
- All motion must respect `prefers-reduced-motion` via the existing `prefersReducedMotion()` helper in `src/lib/motion.ts` — when true, elements render fully static (no rotation, no autoplay)
- Animations use only `transform` (never `top`/`left`/layout properties), matching the existing `Reveal`/`Parallax` components
- This iteration only touches the homepage (`src/app/[locale]/page.tsx`) and its directly-used components — no changes to `/collezioni`, PDP, `/chi-siamo`, or `/contatti`
- Spec: `docs/superpowers/specs/2026-07-29-3d-scroll-motion-design.md`

---

## Already done (verified during design, committed)

Two pieces of prep work were completed, verified, and committed while writing this plan — they don't need their own task:

1. **`aamir/vitest.setup.ts`** now includes a `matchMedia` polyfill. Without it, any component that imports GSAP's `ScrollTrigger` throws `TypeError: _win.matchMedia is not a function` the instant it's rendered in a Vitest/jsdom test (confirmed by spiking it). The polyfill:

```ts
import "@testing-library/jest-dom/vitest";

// jsdom has no matchMedia; GSAP's ScrollTrigger calls it at plugin-registration
// time, so any component importing ScrollTrigger throws without this stub.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
```

2. **Video assets** are already in place at:
   - `aamir/public/videos/lavorazione.mp4` (copied from the source clip Aamir provided, ~2.5MB, 15s, portrait)
   - `aamir/public/videos/lavorazione-poster.jpg` (a frame extracted from the video, 472×850, used as the `<video poster>`)

---

### Task 1: Confirm test infra, then build `Tilt3D`

**Files:**
- Verify: `aamir/vitest.setup.ts` (see polyfill above — confirm it's there)
- Create: `aamir/src/components/Tilt3D.tsx`
- Test: `aamir/src/components/Tilt3D.test.tsx`

**Interfaces:**
- Produces: `Tilt3D({ children, className, amount }: { children: ReactNode; className?: string; amount?: number })` — a React component. `amount` is the peak rotation in degrees (default `12`); its **sign** sets the rotation direction, used later to alternate direction across grid siblings.

- [ ] **Step 1: Confirm the `matchMedia` polyfill is present**

Run: `Get-Content aamir/vitest.setup.ts` (or open the file)
Expected: contains the `if (typeof window.matchMedia !== "function")` block shown above. If it's missing, add it now before continuing — every step below depends on it.

- [ ] **Step 2: Write the failing test**

Create `aamir/src/components/Tilt3D.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { Tilt3D } from "./Tilt3D";

const mockPrefersReducedMotion = vi.fn(() => false);
vi.mock("@/lib/motion", () => ({
  prefersReducedMotion: () => mockPrefersReducedMotion(),
}));

describe("Tilt3D", () => {
  it("mounts and unmounts without throwing when motion is allowed", () => {
    mockPrefersReducedMotion.mockReturnValue(false);
    const { unmount, getByText } = render(
      <Tilt3D amount={10}>
        <span>necklace</span>
      </Tilt3D>,
    );
    expect(getByText("necklace")).toBeInTheDocument();
    unmount();
  });

  it("renders children statically when reduced motion is preferred", () => {
    mockPrefersReducedMotion.mockReturnValue(true);
    const { getByText } = render(
      <Tilt3D amount={10}>
        <span>necklace</span>
      </Tilt3D>,
    );
    expect(getByText("necklace")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd aamir && npx vitest run src/components/Tilt3D.test.tsx`
Expected: FAIL — `Tilt3D.tsx` does not exist yet (`Failed to resolve import "./Tilt3D"`).

- [ ] **Step 4: Write the implementation**

Create `aamir/src/components/Tilt3D.tsx`:

```tsx
"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

/**
 * Real 3D rotation tied to scroll position, plus a mouse-follow tilt.
 * `amount`'s sign sets the rotation direction — alternate it across siblings
 * (e.g. a product grid) so neighbouring elements don't move in lockstep.
 * Disabled under prefers-reduced-motion.
 */
export function Tilt3D({
  children,
  className,
  amount = 12,
}: {
  children: ReactNode;
  className?: string;
  /** Peak rotation in degrees; sign sets direction. */
  amount?: number;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const inner = innerRef.current;
    if (!stage || !inner || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        inner,
        { rotateY: -amount, rotateX: amount / 3 },
        {
          rotateY: amount,
          rotateX: -amount / 3,
          ease: "none",
          scrollTrigger: {
            trigger: stage,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        },
      );
    }, stage);

    const handleMove = (e: MouseEvent) => {
      const rect = stage.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(inner, {
        rotateY: px * amount,
        rotateX: -py * amount,
        duration: 0.5,
        ease: "power2.out",
        overwrite: "auto",
      });
    };
    stage.addEventListener("mousemove", handleMove);

    return () => {
      stage.removeEventListener("mousemove", handleMove);
      ctx.revert();
    };
  }, [amount]);

  return (
    <div ref={stageRef} className={className} style={{ perspective: 1000, position: "relative" }}>
      <div
        ref={innerRef}
        style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", willChange: "transform" }}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd aamir && npx vitest run src/components/Tilt3D.test.tsx`
Expected: PASS (2 tests). You'll see a harmless `Not implemented` jsdom notice only if a `<video>` is involved — not expected in this test.

- [ ] **Step 6: Commit**

```bash
git add aamir/vitest.setup.ts aamir/src/components/Tilt3D.tsx aamir/src/components/Tilt3D.test.tsx
git commit -m "feat: add Tilt3D scroll-driven 3D rotation component"
```

---

### Task 2: Replace `Float`/`Parallax` with `Tilt3D` in the hero, remove the old components

**Files:**
- Modify: `aamir/src/app/[locale]/page.tsx`
- Delete: `aamir/src/components/Float.tsx`
- Delete: `aamir/src/components/Parallax.tsx`

**Interfaces:**
- Consumes: `Tilt3D` from Task 1 (`import { Tilt3D } from "@/components/Tilt3D"`)

- [ ] **Step 1: Confirm `Float`/`Parallax` have no other consumers**

Run: `cd aamir && grep -rn "Float\|Parallax" src --include=*.tsx --include=*.ts`
Expected: only matches inside `src/app/[locale]/page.tsx`, `src/components/Float.tsx`, and `src/components/Parallax.tsx` themselves. If anything else matches, stop and re-scope this task — don't delete a component something else depends on.

- [ ] **Step 2: Replace the hero's `Parallax`/`Float` nesting with `Tilt3D`**

In `aamir/src/app/[locale]/page.tsx`, change the imports:

```tsx
import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Reveal } from "@/components/Reveal";
import { Tilt3D } from "@/components/Tilt3D";
import { ProductCard } from "@/components/ProductCard";
import { SafeImage } from "@/components/SafeImage";
import { getFeaturedProducts, getSiteSettings } from "@/sanity/queries";
import { localize, type Locale } from "@/sanity/localize";
```

(This drops the `Float` and `Parallax` imports and adds `Tilt3D`.)

Then replace the hero image block:

```tsx
        <Reveal delay={0.2} y={56}>
          <div className="relative aspect-[4/5] w-full overflow-hidden">
            <Parallax className="absolute inset-0" amount={6}>
              <Float className="absolute inset-0" amount={10} duration={5}>
                <div className="absolute inset-0 scale-[1.12]">
                  <SafeImage image={featured[0]?.images?.[0]} alt={heroTitle} sizes="(max-width: 768px) 100vw, 50vw" priority />
                </div>
              </Float>
            </Parallax>
          </div>
        </Reveal>
```

with:

```tsx
        <Reveal delay={0.2} y={56}>
          <div className="relative aspect-[4/5] w-full overflow-hidden">
            <Tilt3D className="absolute inset-0" amount={14}>
              <div className="absolute inset-0 scale-[1.12]">
                <SafeImage image={featured[0]?.images?.[0]} alt={heroTitle} sizes="(max-width: 768px) 100vw, 50vw" priority />
              </div>
            </Tilt3D>
          </div>
        </Reveal>
```

- [ ] **Step 3: Delete the superseded components**

```bash
rm aamir/src/components/Float.tsx aamir/src/components/Parallax.tsx
```

- [ ] **Step 4: Verify the app still builds and existing tests still pass**

Run: `cd aamir && npx vitest run && npx tsc --noEmit`
Expected: all existing tests still pass; no TypeScript errors (no remaining references to `Float`/`Parallax`).

- [ ] **Step 5: Commit**

```bash
git add aamir/src/app/[locale]/page.tsx
git rm aamir/src/components/Float.tsx aamir/src/components/Parallax.tsx
git commit -m "feat: rotate the hero image in 3D on scroll, retire Float/Parallax"
```

---

### Task 3: Alternating 3D rotation on the product grid

**Files:**
- Modify: `aamir/src/components/ProductCard.tsx`
- Modify: `aamir/src/components/ProductCard.test.tsx`
- Modify: `aamir/src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `Tilt3D` from Task 1
- Produces: `ProductCard` gains an optional `index?: number` prop (default `0`); other callers (`/collezioni`, `/collezioni/[categoria]`) are unaffected since it's optional and defaults to alternating from card 0

- [ ] **Step 1: Extend the existing test to cover the new prop**

In `aamir/src/components/ProductCard.test.tsx`, add a second case to the existing `describe` block (keep the existing test as-is):

```tsx
  it("still renders correctly when given a grid index", () => {
    render(<ProductCard product={product} locale="en" index={1} />);
    expect(screen.getByText("Onda Necklace")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd aamir && npx vitest run src/components/ProductCard.test.tsx`
Expected: FAIL — TypeScript error, `index` is not a valid prop on `ProductCard` yet.

- [ ] **Step 3: Update `ProductCard` to wrap its image in `Tilt3D`**

Replace the full contents of `aamir/src/components/ProductCard.tsx`:

```tsx
import Link from "next/link";
import { SafeImage } from "./SafeImage";
import { Tilt3D } from "./Tilt3D";
import { localize, type Locale } from "@/sanity/localize";
import type { Product } from "@/sanity/types";

export function ProductCard({
  product,
  locale,
  index = 0,
}: {
  product: Product;
  locale: Locale;
  /** Position in a grid — alternates rotation direction so cards don't move in lockstep. */
  index?: number;
}) {
  const title = localize(product.title, locale);
  const materials = localize(product.materials, locale);
  return (
    <Link
      href={`/${locale}/collezioni/${product.categorySlug}/${product.slug}`}
      className="group block"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--color-surface)]">
        <Tilt3D className="absolute inset-0" amount={index % 2 === 0 ? 10 : -10}>
          <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.03]">
            <SafeImage image={product.images?.[0]} alt={product.images?.[0]?.alt || title} sizes="(max-width: 768px) 100vw, 33vw" />
          </div>
        </Tilt3D>
      </div>
      <h3 className="mt-4 font-serif text-xl">{title}</h3>
      {materials && <p className="text-sm text-[color:var(--color-text)]/70">{materials}</p>}
    </Link>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd aamir && npx vitest run src/components/ProductCard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Pass the grid position from the homepage**

In `aamir/src/app/[locale]/page.tsx`, change:

```tsx
            {featured.slice(0, 6).map((p) => (
              <Reveal key={p._id}>
                <ProductCard product={p} locale={l} />
              </Reveal>
            ))}
```

to:

```tsx
            {featured.slice(0, 6).map((p, i) => (
              <Reveal key={p._id}>
                <ProductCard product={p} locale={l} index={i} />
              </Reveal>
            ))}
```

- [ ] **Step 6: Run the full suite**

Run: `cd aamir && npx vitest run`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add aamir/src/components/ProductCard.tsx aamir/src/components/ProductCard.test.tsx aamir/src/app/[locale]/page.tsx
git commit -m "feat: rotate product grid images in 3D, alternating direction per card"
```

---

### Task 4: `craft` i18n strings

**Files:**
- Modify: `aamir/src/i18n/messages/it.json`
- Modify: `aamir/src/i18n/messages/en.json`

**Interfaces:**
- Produces: a `craft.title` message key in both locale files, consumed by Task 5

- [ ] **Step 1: Add the `craft` namespace to `it.json`**

In `aamir/src/i18n/messages/it.json`, after the `"collections"` entry:

```json
  "collections": { "title": "Collezioni", "all": "Tutti" },
  "craft": { "title": "La Lavorazione" },
```

- [ ] **Step 2: Add the `craft` namespace to `en.json`**

In `aamir/src/i18n/messages/en.json`, after the `"collections"` entry:

```json
  "collections": { "title": "Collections", "all": "All" },
  "craft": { "title": "The Craft" },
```

- [ ] **Step 3: Verify the JSON is still valid and existing i18n tests pass**

Run: `cd aamir && node -e "JSON.parse(require('fs').readFileSync('src/i18n/messages/it.json','utf8')); JSON.parse(require('fs').readFileSync('src/i18n/messages/en.json','utf8')); console.log('ok')" && npx vitest run src/i18n`
Expected: prints `ok`, and the i18n routing test still passes.

- [ ] **Step 4: Commit**

```bash
git add aamir/src/i18n/messages/it.json aamir/src/i18n/messages/en.json
git commit -m "feat: add craft section title translations"
```

---

### Task 5: `CraftSection` component (video + text)

**Files:**
- Create: `aamir/src/components/CraftSection.tsx`
- Test: `aamir/src/components/CraftSection.test.tsx`

**Interfaces:**
- Consumes: `Tilt3D` (Task 1), `Reveal` (existing, `src/components/Reveal.tsx`), `prefersReducedMotion` (existing, `src/lib/motion.ts`), video assets at `/videos/lavorazione.mp4` and `/videos/lavorazione-poster.jpg` (already in `public/videos/`, see "Already done" above)
- Produces: `CraftSection({ title, text }: { title: string; text: string })` — a React component, consumed by Task 6

- [ ] **Step 1: Write the failing test**

Create `aamir/src/components/CraftSection.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { CraftSection } from "./CraftSection";

const mockPrefersReducedMotion = vi.fn(() => false);
vi.mock("@/lib/motion", () => ({
  prefersReducedMotion: () => mockPrefersReducedMotion(),
}));

describe("CraftSection", () => {
  it("renders the title, text and video source", () => {
    mockPrefersReducedMotion.mockReturnValue(false);
    const { getByText, container } = render(
      <CraftSection title="La Lavorazione" text="Ogni pezzo è fatto a mano." />,
    );
    expect(getByText("La Lavorazione")).toBeInTheDocument();
    expect(getByText("Ogni pezzo è fatto a mano.")).toBeInTheDocument();
    const source = container.querySelector("source");
    expect(source).toHaveAttribute("src", "/videos/lavorazione.mp4");
  });

  it("pauses and removes loop from the video when reduced motion is preferred", () => {
    mockPrefersReducedMotion.mockReturnValue(true);
    const { container } = render(
      <CraftSection title="La Lavorazione" text="Ogni pezzo è fatto a mano." />,
    );
    const video = container.querySelector("video");
    expect(video).not.toHaveAttribute("loop");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd aamir && npx vitest run src/components/CraftSection.test.tsx`
Expected: FAIL — `CraftSection.tsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `aamir/src/components/CraftSection.tsx`:

```tsx
"use client";

import { useRef, useEffect } from "react";
import { Tilt3D } from "./Tilt3D";
import { Reveal } from "./Reveal";
import { prefersReducedMotion } from "@/lib/motion";

export function CraftSection({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !prefersReducedMotion()) return;
    video.pause();
    video.removeAttribute("loop");
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 mt-28 grid md:grid-cols-2 gap-10 items-center">
      <Reveal>
        <Tilt3D
          className="relative aspect-[9/16] w-full max-w-sm mx-auto overflow-hidden"
          amount={8}
        >
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            poster="/videos/lavorazione-poster.jpg"
            className="absolute inset-0 h-full w-full object-cover"
            preload="metadata"
          >
            <source src="/videos/lavorazione.mp4" type="video/mp4" />
          </video>
        </Tilt3D>
      </Reveal>
      <Reveal delay={0.15}>
        <div>
          <h2 className="font-serif text-3xl mb-4">{title}</h2>
          <p className="text-lg text-[color:var(--color-text)]/80 max-w-md">{text}</p>
        </div>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd aamir && npx vitest run src/components/CraftSection.test.tsx`
Expected: PASS (2 tests). A `Not implemented: HTMLMediaElement's pause() method` line printed to the console is expected and harmless (jsdom doesn't implement media playback) — it does not fail the test.

- [ ] **Step 5: Commit**

```bash
git add aamir/src/components/CraftSection.tsx aamir/src/components/CraftSection.test.tsx
git commit -m "feat: add CraftSection component with looping craft video"
```

---

### Task 6: Wire `CraftSection` into the homepage

**Files:**
- Modify: `aamir/src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `CraftSection` from Task 5

- [ ] **Step 1: Add the craft copy fallback and translation lookup**

In `aamir/src/app/[locale]/page.tsx`, add a new fallback constant after `ABOUT_FALLBACK`:

```tsx
const CRAFT_FALLBACK = {
  it: "Ogni pezzo nasce da un gesto manuale: la lima, il filo, la pietra scelta a una a una. Nessuna macchina sostituisce dieci anni di pazienza e mestiere.",
  en: "Every piece begins with a hand gesture: the file, the wire, each stone chosen one by one. No machine replaces ten years of patience and craft.",
};
```

Add `CraftSection` to the imports:

```tsx
import { CraftSection } from "@/components/CraftSection";
```

Inside `HomePage`, alongside the existing `t`/`tc` translation lookups, add:

```tsx
  const tCraft = await getTranslations({ locale, namespace: "craft" });
```

and alongside the existing `heroTitle`/`heroSubtitle`/`about` computed values, add:

```tsx
  const craftTitle = tCraft("title");
  const craftText = CRAFT_FALLBACK[l];
```

- [ ] **Step 2: Render the section between the product grid and the About paragraph**

Insert `<CraftSection title={craftTitle} text={craftText} />` between the closing `</section>` of the featured-products grid and the opening `<section className="mx-auto max-w-3xl px-6 mt-28 text-center">` of the About paragraph, so the JSX reads:

```tsx
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 mt-24">
          {/* ...unchanged grid... */}
        </section>
      )}

      <CraftSection title={craftTitle} text={craftText} />

      <section className="mx-auto max-w-3xl px-6 mt-28 text-center">
        <Reveal>
          <p className="font-serif text-2xl md:text-3xl leading-relaxed text-[color:var(--color-text)]/85">{about}</p>
        </Reveal>
      </section>
```

- [ ] **Step 3: Run the full test suite and typecheck**

Run: `cd aamir && npx vitest run && npx tsc --noEmit`
Expected: all tests pass, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add aamir/src/app/[locale]/page.tsx
git commit -m "feat: show the craft video section on the homepage"
```

---

### Task 7: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `cd aamir && npx vitest run`
Expected: all test files pass (existing + the 3 new/updated ones from this plan).

- [ ] **Step 2: Typecheck**

Run: `cd aamir && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `cd aamir && npm run lint`
Expected: no errors.

- [ ] **Step 4: Production build**

Run: `cd aamir && npm run build`
Expected: build succeeds (confirms the new `<video>`/3D-transform JSX is valid and there are no dangling imports from the removed `Float`/`Parallax` components).

- [ ] **Step 5: Manual check in a browser**

Run: `cd aamir && npm run dev`, open the homepage, and confirm:
- Scrolling the hero and the product grid visibly rotates the images in 3D (not just fading/sliding)
- Product cards don't all rotate in perfect sync (alternating direction should be visible)
- The new "La Lavorazione"/"The Craft" section appears after the product grid, video autoplaying, looping, muted, no visible controls
- With OS-level "reduce motion" turned on, images stay static and the video shows only its poster frame, not playing

This step requires a real browser (jsdom above can't render GSAP visuals) — do not skip it before calling the feature done.
