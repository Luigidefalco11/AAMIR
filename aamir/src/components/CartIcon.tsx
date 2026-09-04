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
