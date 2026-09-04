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
