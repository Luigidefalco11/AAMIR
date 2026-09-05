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
      // Never navigate to a missing url — that would land the customer on
      // "/null" instead of showing them the error.
      if (!data.url) throw new Error("checkout-failed");
      window.location.href = data.url;
    } catch {
      setError(labels.checkoutError);
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div>
        {removedWarning && (
          <p className="mb-4 text-sm text-[color:var(--color-primary)]">{removedWarning}</p>
        )}
        <p className="text-[color:var(--color-text)]/70">{labels.empty}</p>
      </div>
    );
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
